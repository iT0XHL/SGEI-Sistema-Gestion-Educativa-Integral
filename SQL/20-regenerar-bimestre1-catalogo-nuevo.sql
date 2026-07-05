-- ============================================================
--  20-regenerar-bimestre1-catalogo-nuevo.sql
--  Reemplaza el Bimestre I (histórico, catálogo viejo de 8 cursos
--  genéricos) por notas nuevas sobre el catálogo fino de 21 cursos,
--  para que la libreta muestre la jerarquía área → curso completa
--  (varios cursos por área) también en Bimestre I, no solo en
--  bimestres futuros. No se toca el catálogo viejo (cursos/competencias
--  quedan intactos, solo se reemplazan las FILAS de nota/libreta).
--
--  OJO: el random() debe ir como columna normal del SELECT principal,
--  NO en un CROSS JOIN LATERAL aparte sin correlación — Postgres puede
--  evaluar un LATERAL uncorrelado una sola vez para toda la consulta
--  en vez de una vez por fila, dejando la MISMA nota repetida en todas
--  las filas (bug ya visto antes en esta sesión).
-- ============================================================

SET session_replication_role = replica;

-- ── Limpieza: notas y libretas viejas de Bimestre I ────────────
DELETE FROM academic_schema.libreta_detalle
  WHERE libreta_id IN (SELECT id FROM academic_schema.libreta WHERE bimestre_id = '00000000-0000-0000-0007-000000000001');
DELETE FROM academic_schema.libreta WHERE bimestre_id = '00000000-0000-0000-0007-000000000001';
DELETE FROM academic_schema.nota WHERE bimestre_id = '00000000-0000-0000-0007-000000000001';

-- ── Notas nuevas: catálogo fino, aleatorio 11-20, por cada
--    (alumno, asignación docente-curso de su sección, criterio default) ──
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

-- ── Snapshot: crea libreta (PUBLICADA) + libreta_detalle con el
--    promedio ponderado por peso ya calculado en calificativo_area ──
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
