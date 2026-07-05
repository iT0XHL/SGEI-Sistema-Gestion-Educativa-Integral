-- ============================================================
--  23-competencias-estandar-4-criterios.sql
--  Reemplaza TODAS las competencias/criterios de evaluación de
--  TODOS los cursos (catálogo viejo de 8 genéricos + catálogo fino
--  de 21) por un esquema único y estándar de 4 criterios:
--    "Prueba de entrada", "Prueba de Salida", "Examen", "Desarrollo"
--  cada uno con peso 25% (suman 100%).
--
--  Como esto invalida TODAS las competencias existentes (incluidas
--  las que ya tenían notas/libretas), hay que:
--   1) Borrar toda nota y todo snapshot de libreta (de TODOS los
--      bimestres, no solo Bimestre I — sus competencia_id ya no
--      existirían).
--   2) Borrar TODAS las competencias existentes (sin excepción).
--   3) Insertar las 4 competencias estándar en CADA curso.
--   4) Regenerar Bimestre I (notas aleatorias 11-20 + snapshot de
--      libreta), igual que SQL/20, pero ahora con las 4 competencias
--      nuevas. Solo se genera para cursos que tienen asignación
--      docente activa hoy (el catálogo viejo de 8 genéricos ya no
--      tiene docentes desde el borrado de SQL/17 — quedan con las
--      4 competencias creadas, pero sin notas, hasta que se les
--      asigne un docente real).
--   5) Refrescar mv_libreta_alumno y formato_siagie.
-- ============================================================

SET session_replication_role = replica;

-- ── 1) Borrar TODAS las notas y snapshots de libreta (todos los bimestres) ──
DELETE FROM academic_schema.libreta_detalle;
DELETE FROM academic_schema.libreta;
DELETE FROM academic_schema.nota;

-- ── 2) Borrar TODAS las competencias existentes ──────────────────
DELETE FROM academic_schema.competencia;

-- ── 3) Insertar las 4 competencias estándar en cada curso ────────
INSERT INTO academic_schema.competencia (curso_id, grado_id, nombre, descripcion, tipo, orden, peso)
SELECT cu.id, NULL, crit.nombre, NULL, 'regular', crit.orden, 25.00
FROM academic_schema.curso cu
CROSS JOIN (VALUES
  ('Prueba de entrada', 1),
  ('Prueba de Salida',  2),
  ('Examen',            3),
  ('Desarrollo',        4)
) AS crit(nombre, orden);

-- ── 4) Regenerar Bimestre I: notas aleatorias 11-20 para cada
--       (alumno, asignación docente-curso activa, criterio nuevo) ──
INSERT INTO academic_schema.nota (alumno_id, competencia_id, bimestre_id, docente_id, nota_vigesimal, nota_literal, tipo_evaluacion, cerrada)
SELECT x.alumno_id, x.competencia_id, '00000000-0000-0000-0007-000000000001'::uuid, x.docente_id,
  x.nv,
  (CASE WHEN x.nv >= 18 THEN 'AD' WHEN x.nv >= 14 THEN 'A' WHEN x.nv >= 11 THEN 'B' ELSE 'C' END)::academic_schema.nota_literal,
  'Final', true
FROM (
  SELECT al.id AS alumno_id, comp.id AS competencia_id, ad.docente_id,
    (11 + floor(random() * 10))::numeric(4,2) AS nv
  FROM academic_schema.alumno al
  JOIN academic_schema.asignacion_docente ad
    ON ad.seccion_id = al.seccion_id AND ad.periodo_id = al.periodo_id AND ad.activo
  JOIN academic_schema.competencia comp
    ON comp.curso_id = ad.curso_id AND comp.grado_id IS NULL
  WHERE al.activo AND al.periodo_id = '00000000-0000-0000-0004-000000000003'
) x
ON CONFLICT (alumno_id, competencia_id, bimestre_id) DO NOTHING;

-- ── 5) Snapshot: libreta (PUBLICADA) + libreta_detalle con
--       calificativo_area (promedio ponderado, aquí = simple porque
--       los 4 criterios pesan igual) ──
WITH ins_libreta AS (
  INSERT INTO academic_schema.libreta
    (alumno_id, periodo_id, bimestre_id, estado, version, generada_por, aprobada_por, publicada_por, fecha_generacion, fecha_aprobacion, fecha_publicacion)
  SELECT DISTINCT n.alumno_id, '00000000-0000-0000-0004-000000000003'::uuid, '00000000-0000-0000-0007-000000000001'::uuid,
    'PUBLICADA'::academic_schema.estado_libreta, 1,
    (SELECT id FROM auth_schema.perfil_usuario WHERE rol = 'Admin' LIMIT 1),
    (SELECT id FROM auth_schema.perfil_usuario WHERE rol = 'Admin' LIMIT 1),
    (SELECT id FROM auth_schema.perfil_usuario WHERE rol = 'Admin' LIMIT 1),
    now(), now(), now()
  FROM academic_schema.nota n
  WHERE n.bimestre_id = '00000000-0000-0000-0007-000000000001'
  RETURNING id AS libreta_id, alumno_id
),
notas_detalle AS (
  SELECT n.alumno_id, cu.id AS curso_id, cu.nombre AS curso_nombre,
         comp.id AS competencia_id, comp.nombre AS competencia_nombre,
         comp.tipo AS tipo_competencia, comp.peso, n.nota_vigesimal, n.nota_literal, comp.orden
  FROM academic_schema.nota n
  JOIN academic_schema.competencia comp ON comp.id = n.competencia_id
  JOIN academic_schema.curso cu         ON cu.id = comp.curso_id
  WHERE n.bimestre_id = '00000000-0000-0000-0007-000000000001'
),
pond AS (
  SELECT alumno_id, curso_id, (SUM(nota_vigesimal * peso) / SUM(peso))::numeric(4,2) AS calif
  FROM notas_detalle GROUP BY alumno_id, curso_id
),
orden_curso AS (
  SELECT alumno_id, curso_id, ROW_NUMBER() OVER (PARTITION BY alumno_id ORDER BY curso_id) AS oc
  FROM (SELECT DISTINCT alumno_id, curso_id FROM notas_detalle) x
)
INSERT INTO academic_schema.libreta_detalle
  (libreta_id, curso_id, curso_nombre_snapshot, competencia_id, competencia_nombre_snapshot,
   tipo_competencia, bimestre_numero, nota_vigesimal, nota_literal, calificativo_area, orden_curso, orden_competencia)
SELECT il.libreta_id, nd.curso_id, nd.curso_nombre, nd.competencia_id, nd.competencia_nombre,
       nd.tipo_competencia, 1, nd.nota_vigesimal, nd.nota_literal, p.calif, oc.oc, COALESCE(nd.orden, 1)
FROM notas_detalle nd
JOIN ins_libreta il ON il.alumno_id = nd.alumno_id
JOIN pond p         ON p.alumno_id = nd.alumno_id AND p.curso_id = nd.curso_id
JOIN orden_curso oc ON oc.alumno_id = nd.alumno_id AND oc.curso_id = nd.curso_id;

SET session_replication_role = default;

-- ── 6) Refrescar vistas materializadas dependientes de nota ──────
REFRESH MATERIALIZED VIEW academic_schema.mv_libreta_alumno;
REFRESH MATERIALIZED VIEW audit_schema.formato_siagie;

-- ── Verificación ──────────────────────────────────────────────
SELECT count(*) AS competencias_totales FROM academic_schema.competencia;
SELECT curso_id, count(*) FROM academic_schema.competencia GROUP BY curso_id HAVING count(*) <> 4;
SELECT count(*) AS notas_bimestre1 FROM academic_schema.nota;
SELECT count(*) AS libretas FROM academic_schema.libreta;
