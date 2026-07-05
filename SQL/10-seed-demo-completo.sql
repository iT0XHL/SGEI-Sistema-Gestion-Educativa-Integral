-- ============================================================
--  10-seed-demo-completo.sql
--  Seed masivo aditivo (100% ON CONFLICT DO NOTHING donde el
--  esquema lo permite) para dejar el sistema demostrable de punta
--  a punta: usuarios de todos los roles, estructura académica
--  poblada en los 11 grados existentes (Primaria 1°-6°, Secundaria
--  1°-5°), horarios generados y publicados, Recreo/Refrigerio de
--  Primaria, competencias realistas por curso (con un ejemplo de
--  override por grado), Libretas del Bimestre I, Pagos y
--  Asistencia.
--
--  Requiere que ya se hayan aplicado (en este orden):
--    02-seed.sql, 06-grados-niveles.sql, 07-horarios-publicacion.sql,
--    08-horarios-descanso.sql, 09-competencia-grado.sql
--
--  IDs constantes reutilizados de esos archivos:
--    periodo activo 2025      = 00000000-0000-0000-0004-000000000003
--    bimestre I                = 00000000-0000-0000-0007-000000000001
--    nivel Secundaria           = 00000000-0000-0000-0004-000000000001
--    nivel Primaria              = 00000000-0000-0000-0004-000000000010
--    grados Primaria 1°-6°        = 00000000-0000-0000-0004-000000001{1..6}
--    grados Secundaria 1°,2°,4°,5° = 00000000-0000-0000-0004-0000000000{17,18,19,20}
--    grado 3° Secundaria (base)     = 00000000-0000-0000-0004-000000000002
--    secciones Primaria 1°-6° "A"    = 00000000-0000-0000-000a-00000000000{1..6}
--    secciones Secundaria 1,2,4,5°"A" = 00000000-0000-0000-000a-0000000000{07,08,09,10}
--    sección 3° Secundaria "A" (base)  = 00000000-0000-0000-0004-000000000004
--    cursos 1-8 (Matemática..Ed.Trabajo) = 00000000-0000-0000-0005-00000000000{1..8}
--
--  IDs nuevos de este archivo: DNIs 690000xx (docentes),
--  71xxxxxx (alumnos) — rangos frescos que no colisionan con nada
--  existente (docentes 452316xx, alumnos 876543xx).
-- ============================================================

SET session_replication_role = replica;

-- Hash bcrypt calculado una sola vez y reutilizado (todos los
-- usuarios nuevos de este seed usan la contraseña demo1234).
CREATE TEMP TABLE tmp_hash AS SELECT crypt('demo1234', gen_salt('bf', 12)) AS h;

-- Posición 0-7 de cada curso — determinista (ORDER BY id sigue el
-- orden curso1..curso8), usada por el algoritmo anti-colisión de
-- horarios más abajo.
CREATE TEMP TABLE tmp_curso_idx AS
SELECT id AS curso_id, (ROW_NUMBER() OVER (ORDER BY id) - 1)::int AS idx
FROM academic_schema.curso;

-- 8 franjas semanales fijas (slot 0-7) → (día, hora_inicio, hora_fin).
CREATE TEMP TABLE tmp_slots AS
SELECT * FROM (VALUES
  (0, 1::smallint, '08:00'::time, '09:00'::time),
  (1, 2::smallint, '08:00'::time, '09:00'::time),
  (2, 3::smallint, '08:00'::time, '09:00'::time),
  (3, 4::smallint, '08:00'::time, '09:00'::time),
  (4, 5::smallint, '08:00'::time, '09:00'::time),
  (5, 1::smallint, '09:00'::time, '10:00'::time),
  (6, 2::smallint, '09:00'::time, '10:00'::time),
  (7, 3::smallint, '09:00'::time, '10:00'::time)
) AS s(slot, dia, hi, hf);

-- Las 4 secciones de Secundaria que hoy no tienen horario propio
-- (1°,2°,4°,5° — 3° ya tiene su plantel y horario original, no se
-- toca), con un offset 0-3 distinto por sección para el algoritmo
-- anti-colisión de los docentes especialistas.
CREATE TEMP TABLE tmp_sec_secundaria AS
SELECT * FROM (VALUES
  ('00000000-0000-0000-000a-000000000007'::uuid, 0), -- 1° Secundaria A
  ('00000000-0000-0000-000a-000000000008'::uuid, 1), -- 2° Secundaria A
  ('00000000-0000-0000-000a-000000000009'::uuid, 2), -- 4° Secundaria A
  ('00000000-0000-0000-000a-000000000010'::uuid, 3)  -- 5° Secundaria A
) AS s(seccion_id, offset_val);

-- Docentes recién creados en este archivo (id, tipo, curso_id si es
-- especialista, grado_id/seccion_id si es generalista) — usada por
-- las secciones de asignaciones/horario/publicación más abajo.
CREATE TEMP TABLE tmp_docentes (
  id uuid, tipo text, curso_id uuid, grado_id uuid, seccion_id uuid
);

-- ============================================================
-- 1) Secretaria nueva (+1 → total 2; Admin se mantiene en 1)
-- ============================================================
WITH ins_cred AS (
  INSERT INTO auth_schema.credencial (usuario_login, password_hash, nombres, apellido_paterno, apellido_materno)
  SELECT 'secretaria2@sgei.edu.pe', h, 'Rosario', 'Delgado', 'Núñez' FROM tmp_hash
  ON CONFLICT (usuario_login) DO NOTHING
  RETURNING id
)
INSERT INTO auth_schema.perfil_usuario (id, credencial_id, rol, entidad_tipo, entidad_id)
SELECT gen_random_uuid(), ic.id, 'Secretaria'::auth_schema.rol_usuario, 'secretaria', gen_random_uuid()
FROM ins_cred ic;

-- La fila de arriba generó entidad_id con un UUID *distinto* al id
-- del perfil (dos gen_random_uuid() separados) — se corrige aquí
-- para que sea autorreferencial, igual que Admin/Secretaria existentes.
UPDATE auth_schema.perfil_usuario p
SET entidad_id = p.id
WHERE p.rol = 'Secretaria'
  AND p.credencial_id = (SELECT id FROM auth_schema.credencial WHERE usuario_login = 'secretaria2@sgei.edu.pe');

-- ============================================================
-- 2) Competencias nuevas (cursos 2-8; curso1/Matemática ya tiene 4)
--    + 1 override de ejemplo (1° Secundaria personaliza Matemática)
-- ============================================================
INSERT INTO academic_schema.competencia (curso_id, grado_id, nombre, tipo, orden) VALUES
  ('00000000-0000-0000-0005-000000000002', NULL, 'Se comunica oralmente en su lengua materna', 'regular', 1),
  ('00000000-0000-0000-0005-000000000002', NULL, 'Lee diversos tipos de textos escritos', 'regular', 2),
  ('00000000-0000-0000-0005-000000000003', NULL, 'Construye interpretaciones históricas', 'regular', 1),
  ('00000000-0000-0000-0005-000000000003', NULL, 'Gestiona responsablemente el espacio y el ambiente', 'regular', 2),
  ('00000000-0000-0000-0005-000000000004', NULL, 'Indaga mediante métodos científicos', 'regular', 1),
  ('00000000-0000-0000-0005-000000000004', NULL, 'Explica el mundo físico basándose en conocimientos científicos', 'regular', 2),
  ('00000000-0000-0000-0005-000000000005', NULL, 'Se comunica oralmente en inglés como lengua extranjera', 'regular', 1),
  ('00000000-0000-0000-0005-000000000005', NULL, 'Lee diversos tipos de textos en inglés como lengua extranjera', 'regular', 2),
  ('00000000-0000-0000-0005-000000000006', NULL, 'Se desenvuelve de manera autónoma a través de su motricidad', 'regular', 1),
  ('00000000-0000-0000-0005-000000000007', NULL, 'Aprecia de manera crítica manifestaciones artístico-culturales', 'regular', 1),
  ('00000000-0000-0000-0005-000000000008', NULL, 'Gestiona proyectos de emprendimiento económico o social', 'regular', 1)
ON CONFLICT DO NOTHING;

INSERT INTO academic_schema.competencia (curso_id, grado_id, nombre, tipo, orden) VALUES
  ('00000000-0000-0000-0005-000000000001', '00000000-0000-0000-0004-000000000017', 'Resuelve problemas de cantidad', 'regular', 1),
  ('00000000-0000-0000-0005-000000000001', '00000000-0000-0000-0004-000000000017', 'Resuelve problemas de forma, movimiento y localización', 'regular', 2)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 3) Docentes nuevos (6 generalistas Primaria + 8 especialistas
--    Secundaria) — credencial + perfil_usuario + docente en una
--    sola cadena de CTEs encadenados por un id pre-generado.
-- ============================================================
-- Catálogo materializado (no una CTE efímera): se necesita también
-- DESPUÉS del INSERT para poblar tmp_docentes de forma idempotente,
-- tanto si los docentes se crearon recién ahora como si ya existían
-- de una corrida anterior (el INSERT de abajo puede no devolver
-- filas por el ON CONFLICT DO NOTHING).
CREATE TEMP TABLE tmp_catalogo_docentes AS
SELECT * FROM (VALUES
    ('rosa.injante@sgei.edu.pe',      'Rosa',      'Injante',    'Salas',    '69000001', 'Docente de Aula - Primaria', 'primaria',   NULL::uuid, '00000000-0000-0000-0004-000000000011'::uuid, '00000000-0000-0000-000a-000000000001'::uuid),
    ('teresa.campos@sgei.edu.pe',     'Teresa',    'Campos',     'Rivas',    '69000002', 'Docente de Aula - Primaria', 'primaria',   NULL::uuid, '00000000-0000-0000-0004-000000000012'::uuid, '00000000-0000-0000-000a-000000000002'::uuid),
    ('miguel.torres@sgei.edu.pe',     'Miguel',    'Torres',     'Paredes',  '69000003', 'Docente de Aula - Primaria', 'primaria',   NULL::uuid, '00000000-0000-0000-0004-000000000013'::uuid, '00000000-0000-0000-000a-000000000003'::uuid),
    ('lucia.fernandez@sgei.edu.pe',   'Lucía',     'Fernández',  'Rojas',    '69000004', 'Docente de Aula - Primaria', 'primaria',   NULL::uuid, '00000000-0000-0000-0004-000000000014'::uuid, '00000000-0000-0000-000a-000000000004'::uuid),
    ('jorge.salazar@sgei.edu.pe',     'Jorge',     'Salazar',    'Medina',   '69000005', 'Docente de Aula - Primaria', 'primaria',   NULL::uuid, '00000000-0000-0000-0004-000000000015'::uuid, '00000000-0000-0000-000a-000000000005'::uuid),
    ('patricia.vega@sgei.edu.pe',     'Patricia',  'Vega',       'Castillo', '69000006', 'Docente de Aula - Primaria', 'primaria',   NULL::uuid, '00000000-0000-0000-0004-000000000016'::uuid, '00000000-0000-0000-000a-000000000006'::uuid),
    ('ricardo.palomino@sgei.edu.pe',  'Ricardo',   'Palomino',   'Guzmán',   '69000007', 'Matemática',                 'secundaria', '00000000-0000-0000-0005-000000000001'::uuid, NULL::uuid, NULL::uuid),
    ('diana.chavez@sgei.edu.pe',      'Diana',     'Chávez',     'Soto',     '69000008', 'Comunicación',               'secundaria', '00000000-0000-0000-0005-000000000002'::uuid, NULL::uuid, NULL::uuid),
    ('fernando.aliaga@sgei.edu.pe',   'Fernando',  'Aliaga',     'Cruz',     '69000009', 'Ciencias Sociales',          'secundaria', '00000000-0000-0000-0005-000000000003'::uuid, NULL::uuid, NULL::uuid),
    ('karina.bustamante@sgei.edu.pe', 'Karina',    'Bustamante', 'Ríos',     '69000010', 'Ciencia y Tecnología',       'secundaria', '00000000-0000-0000-0005-000000000004'::uuid, NULL::uuid, NULL::uuid),
    ('manuel.torres@sgei.edu.pe',     'Manuel',    'Torres',     'Aquino',   '69000011', 'Inglés',                     'secundaria', '00000000-0000-0000-0005-000000000005'::uuid, NULL::uuid, NULL::uuid),
    ('julio.ramirez@sgei.edu.pe',     'Julio',     'Ramírez',    'Soto',     '69000012', 'Educación Física',           'secundaria', '00000000-0000-0000-0005-000000000006'::uuid, NULL::uuid, NULL::uuid),
    ('silvia.herrera@sgei.edu.pe',    'Silvia',    'Herrera',    'Luna',     '69000013', 'Arte y Cultura',             'secundaria', '00000000-0000-0000-0005-000000000007'::uuid, NULL::uuid, NULL::uuid),
    ('andres.choque@sgei.edu.pe',     'Andrés',    'Choque',     'Mamani',   '69000014', 'Educación para el Trabajo',  'secundaria', '00000000-0000-0000-0005-000000000008'::uuid, NULL::uuid, NULL::uuid)
) AS t(usuario_login, nombres, ap_pat, ap_mat, dni, especialidad, tipo, curso_id, grado_id, seccion_id);

WITH nuevos_id AS (
  SELECT n.*, gen_random_uuid() AS pre_docente_id FROM tmp_catalogo_docentes n
),
ins_cred AS (
  INSERT INTO auth_schema.credencial (usuario_login, password_hash, nombres, apellido_paterno, apellido_materno)
  SELECT n.usuario_login, h.h, n.nombres, n.ap_pat, n.ap_mat FROM nuevos_id n CROSS JOIN tmp_hash h
  ON CONFLICT (usuario_login) DO NOTHING
  RETURNING id AS credencial_id, usuario_login
),
ins_perfil AS (
  INSERT INTO auth_schema.perfil_usuario (credencial_id, rol, entidad_tipo, entidad_id)
  SELECT ic.credencial_id, 'Docente'::auth_schema.rol_usuario, 'docente', n.pre_docente_id
  FROM ins_cred ic JOIN nuevos_id n ON n.usuario_login = ic.usuario_login
  RETURNING id AS perfil_id, entidad_id AS pre_docente_id
),
ins_docente AS (
  INSERT INTO academic_schema.docente
    (id, perfil_usuario_id, dni, nombres, apellido_paterno, apellido_materno, especialidad, telefono, email_institucional, activo, fecha_ingreso)
  SELECT ip.pre_docente_id, ip.perfil_id, n.dni, n.nombres, n.ap_pat, n.ap_mat, n.especialidad, '987654321', n.usuario_login, TRUE, DATE '2025-03-01'
  FROM ins_perfil ip JOIN nuevos_id n ON n.pre_docente_id = ip.pre_docente_id
  RETURNING id
)
SELECT count(*) FROM ins_docente;

-- Se puebla tmp_docentes con una búsqueda plana (no con el RETURNING
-- de arriba): así funciona igual si los docentes se acaban de crear
-- o si ya existían de una corrida anterior del seed.
INSERT INTO tmp_docentes (id, tipo, curso_id, grado_id, seccion_id)
SELECT d.id, cat.tipo, cat.curso_id, cat.grado_id, cat.seccion_id
FROM academic_schema.docente d
JOIN tmp_catalogo_docentes cat ON cat.usuario_login = d.email_institucional;

-- ============================================================
-- 4) asignacion_docente + horario (algoritmo anti-colisión
--    determinista — ver documentación en el plan de este cambio)
-- ============================================================

-- 4a) Primaria: 1 docente generalista dicta los 8 cursos en su
--     única sección → slot = idx del curso (0-7), cero colisión
--     posible (mismo dominio docente=sección).
WITH primaria_asig AS (
  INSERT INTO academic_schema.asignacion_docente (docente_id, curso_id, seccion_id, periodo_id, activo)
  SELECT d.id, ci.curso_id, d.seccion_id, '00000000-0000-0000-0004-000000000003'::uuid, TRUE
  FROM tmp_docentes d
  CROSS JOIN tmp_curso_idx ci
  WHERE d.tipo = 'primaria'
  ON CONFLICT (docente_id, seccion_id, curso_id, periodo_id) DO NOTHING
  RETURNING id, docente_id, curso_id, seccion_id
)
-- docente_id/seccion_id se pasan explícitos: el trigger que normalmente
-- los autocompleta desde asignacion_docente no se dispara bajo
-- session_replication_role = replica (usado para evitar los triggers de
-- auditoría durante el seed).
INSERT INTO academic_schema.horario (asignacion_id, dia_semana, hora_inicio, hora_fin, aula, docente_id, seccion_id)
SELECT pa.id, ts.dia, ts.hi, ts.hf, 'Aula ' || g.nombre, pa.docente_id, pa.seccion_id
FROM primaria_asig pa
JOIN tmp_curso_idx ci ON ci.curso_id = pa.curso_id
JOIN tmp_slots ts ON ts.slot = ci.idx
JOIN academic_schema.seccion s ON s.id = pa.seccion_id
JOIN academic_schema.grado g ON g.id = s.grado_id;

-- 4b) Secundaria: 1 docente especialista dicta su curso en las 4
--     secciones sin horario propio → slot = (idx_curso + offset_sección)
--     mod 8: el mismo curso cae en horas distintas por sección (sin
--     colisión de docente) y cada sección sigue teniendo sus 8
--     cursos en slots distintos entre sí (rotación mod 8 = biyección,
--     sin colisión de sección).
WITH secundaria_asig AS (
  INSERT INTO academic_schema.asignacion_docente (docente_id, curso_id, seccion_id, periodo_id, activo)
  SELECT d.id, d.curso_id, ss.seccion_id, '00000000-0000-0000-0004-000000000003'::uuid, TRUE
  FROM tmp_docentes d
  CROSS JOIN tmp_sec_secundaria ss
  WHERE d.tipo = 'secundaria'
  ON CONFLICT (docente_id, seccion_id, curso_id, periodo_id) DO NOTHING
  RETURNING id, docente_id, curso_id, seccion_id
)
INSERT INTO academic_schema.horario (asignacion_id, dia_semana, hora_inicio, hora_fin, aula, docente_id, seccion_id)
SELECT sa.id, ts.dia, ts.hi, ts.hf, 'Aula ' || g.nombre, sa.docente_id, sa.seccion_id
FROM secundaria_asig sa
JOIN tmp_curso_idx ci ON ci.curso_id = sa.curso_id
JOIN tmp_sec_secundaria ss ON ss.seccion_id = sa.seccion_id
JOIN tmp_slots ts ON ts.slot = (ci.idx + ss.offset_val) % 8
JOIN academic_schema.seccion s ON s.id = sa.seccion_id
JOIN academic_schema.grado g ON g.id = s.grado_id;

-- ============================================================
-- 5) horario_publicacion + horario_publicacion_bloque —
--    publica automáticamente las 10 secciones y los 14 docentes
--    nuevos (desnormalización idéntica a
--    HorarioPublicacionRepository.publicar en TypeScript).
-- ============================================================

-- 5a) Por sección
WITH pub_secc AS (
  INSERT INTO academic_schema.horario_publicacion (tipo, seccion_id, periodo_id, publicado_por)
  SELECT 'SECCION', s.id, '00000000-0000-0000-0004-000000000003'::uuid,
         (SELECT id FROM auth_schema.perfil_usuario WHERE rol = 'Admin' LIMIT 1)
  FROM academic_schema.seccion s
  WHERE s.id = ANY(ARRAY[
    '00000000-0000-0000-000a-000000000001'::uuid, '00000000-0000-0000-000a-000000000002'::uuid,
    '00000000-0000-0000-000a-000000000003'::uuid, '00000000-0000-0000-000a-000000000004'::uuid,
    '00000000-0000-0000-000a-000000000005'::uuid, '00000000-0000-0000-000a-000000000006'::uuid,
    '00000000-0000-0000-000a-000000000007'::uuid, '00000000-0000-0000-000a-000000000008'::uuid,
    '00000000-0000-0000-000a-000000000009'::uuid, '00000000-0000-0000-000a-000000000010'::uuid
  ])
  ON CONFLICT DO NOTHING
  RETURNING id AS publicacion_id, seccion_id
)
INSERT INTO academic_schema.horario_publicacion_bloque
  (publicacion_id, horario_id_origen, dia_semana, hora_inicio, hora_fin, aula_snapshot,
   curso_nombre_snapshot, docente_nombre_snapshot, seccion_nombre_snapshot, grado_nombre_snapshot, nivel_nombre_snapshot)
SELECT ps.publicacion_id, h.id, h.dia_semana, h.hora_inicio, h.hora_fin, h.aula,
       cu.nombre, d.nombres || ' ' || d.apellido_paterno, se.nombre, g.nombre, n.nombre
FROM pub_secc ps
JOIN academic_schema.horario h ON h.seccion_id = ps.seccion_id
JOIN academic_schema.asignacion_docente ad ON ad.id = h.asignacion_id
JOIN academic_schema.curso cu ON cu.id = ad.curso_id
JOIN academic_schema.docente d ON d.id = h.docente_id
JOIN academic_schema.seccion se ON se.id = h.seccion_id
JOIN academic_schema.grado g ON g.id = se.grado_id
JOIN academic_schema.nivel n ON n.id = g.nivel_id;

-- 5b) Por docente
WITH pub_doc AS (
  INSERT INTO academic_schema.horario_publicacion (tipo, docente_id, periodo_id, publicado_por)
  SELECT 'DOCENTE', d.id, '00000000-0000-0000-0004-000000000003'::uuid,
         (SELECT id FROM auth_schema.perfil_usuario WHERE rol = 'Admin' LIMIT 1)
  FROM tmp_docentes d
  ON CONFLICT DO NOTHING
  RETURNING id AS publicacion_id, docente_id
)
INSERT INTO academic_schema.horario_publicacion_bloque
  (publicacion_id, horario_id_origen, dia_semana, hora_inicio, hora_fin, aula_snapshot,
   curso_nombre_snapshot, docente_nombre_snapshot, seccion_nombre_snapshot, grado_nombre_snapshot, nivel_nombre_snapshot)
SELECT pd.publicacion_id, h.id, h.dia_semana, h.hora_inicio, h.hora_fin, h.aula,
       cu.nombre, d.nombres || ' ' || d.apellido_paterno, se.nombre, g.nombre, n.nombre
FROM pub_doc pd
JOIN academic_schema.horario h ON h.docente_id = pd.docente_id
JOIN academic_schema.asignacion_docente ad ON ad.id = h.asignacion_id
JOIN academic_schema.curso cu ON cu.id = ad.curso_id
JOIN academic_schema.docente d ON d.id = h.docente_id
JOIN academic_schema.seccion se ON se.id = h.seccion_id
JOIN academic_schema.grado g ON g.id = se.grado_id
JOIN academic_schema.nivel n ON n.id = g.nivel_id;

-- ============================================================
-- 6) Recreo/Refrigerio de Primaria (Secundaria ya se configuró en
--    pruebas manuales previas) — horarios más tempranos, propios
--    de niños de Primaria.
-- ============================================================
INSERT INTO academic_schema.horario_descanso (nivel_id, periodo_id, tipo, hora_inicio, hora_fin)
VALUES
  ('00000000-0000-0000-0004-000000000010', '00000000-0000-0000-0004-000000000003', 'RECREO',     '10:15', '10:35'),
  ('00000000-0000-0000-0004-000000000010', '00000000-0000-0000-0004-000000000003', 'REFRIGERIO', '12:00', '12:45')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 7) Alumnos nuevos: 20 por cada una de las 10 secciones hoy vacías
--    (Primaria 1°-6°, Secundaria 1°,2°,4°,5°) + 8 más en 3°
--    Secundaria "A" (ya tiene 12) para llegar al mínimo de 20.
-- ============================================================
CREATE TEMP TABLE tmp_alumno_target AS
SELECT * FROM (VALUES
  ('00000000-0000-0000-000a-000000000001'::uuid, '00000000-0000-0000-0004-000000000011'::uuid, 20), -- 1° Primaria A
  ('00000000-0000-0000-000a-000000000002'::uuid, '00000000-0000-0000-0004-000000000012'::uuid, 20), -- 2° Primaria A
  ('00000000-0000-0000-000a-000000000003'::uuid, '00000000-0000-0000-0004-000000000013'::uuid, 20), -- 3° Primaria A
  ('00000000-0000-0000-000a-000000000004'::uuid, '00000000-0000-0000-0004-000000000014'::uuid, 20), -- 4° Primaria A
  ('00000000-0000-0000-000a-000000000005'::uuid, '00000000-0000-0000-0004-000000000015'::uuid, 20), -- 5° Primaria A
  ('00000000-0000-0000-000a-000000000006'::uuid, '00000000-0000-0000-0004-000000000016'::uuid, 20), -- 6° Primaria A
  ('00000000-0000-0000-000a-000000000007'::uuid, '00000000-0000-0000-0004-000000000017'::uuid, 20), -- 1° Secundaria A
  ('00000000-0000-0000-000a-000000000008'::uuid, '00000000-0000-0000-0004-000000000018'::uuid, 20), -- 2° Secundaria A
  ('00000000-0000-0000-000a-000000000009'::uuid, '00000000-0000-0000-0004-000000000019'::uuid, 20), -- 4° Secundaria A
  ('00000000-0000-0000-000a-000000000010'::uuid, '00000000-0000-0000-0004-000000000020'::uuid, 20), -- 5° Secundaria A
  ('00000000-0000-0000-0004-000000000004'::uuid, '00000000-0000-0000-0004-000000000002'::uuid, 8)   -- 3° Secundaria A (top-up, ya tiene 12)
) AS t(seccion_id, grado_id, n);

CREATE TEMP TABLE tmp_nombres AS SELECT * FROM (VALUES
  ('Valeria'),('Mateo'),('Camila'),('Sebastián'),('Antonella'),('Diego'),('Fabiana'),('Nicolás'),
  ('Renata'),('Adrián'),('Ximena'),('Joaquín'),('Milagros'),('Emilio'),('Daniela'),('Rodrigo'),
  ('Alessandra'),('Bruno'),('Zoe'),('Ian')
) AS n(nombre);

CREATE TEMP TABLE tmp_apellidos AS SELECT * FROM (VALUES
  ('Quispe'),('Mamani'),('Huamán'),('Rojas'),('Flores'),('Vargas'),('Castro'),('Salazar'),
  ('Chávez'),('Paredes'),('Aguilar'),('Espinoza'),('Cárdenas'),('Núñez'),('Bautista'),('Cabrera')
) AS a(apellido);

CREATE TEMP TABLE tmp_alumnos_expand AS
SELECT ROW_NUMBER() OVER (ORDER BY t.seccion_id, gs) AS rn, t.seccion_id, t.grado_id
FROM tmp_alumno_target t
CROSS JOIN LATERAL generate_series(1, t.n) AS gs;

WITH base AS (
  SELECT
    e.rn, e.seccion_id, e.grado_id,
    (SELECT nombre FROM tmp_nombres LIMIT 1 OFFSET ((e.rn - 1) % 20)) AS nombre,
    (SELECT apellido FROM tmp_apellidos LIMIT 1 OFFSET ((e.rn - 1) % 16)) AS ap_pat,
    (SELECT apellido FROM tmp_apellidos LIMIT 1 OFFSET ((e.rn + 5) % 16)) AS ap_mat,
    lpad((71000000 + e.rn)::text, 8, '0') AS dni,
    'SIAGIE-2025-' || lpad(e.rn::text, 4, '0') AS siagie,
    (CASE WHEN e.rn % 2 = 0 THEN 'M' ELSE 'F' END) AS sexo,
    gen_random_uuid() AS pre_alumno_id,
    g.orden AS grado_orden, n.nombre AS nivel_nombre
  FROM tmp_alumnos_expand e
  JOIN academic_schema.grado g ON g.id = e.grado_id
  JOIN academic_schema.nivel n ON n.id = g.nivel_id
),
base2 AS (
  SELECT b.*,
    -- translate() quita tildes/ñ: un email con acentos no pasa la
    -- validación z.string().email() del backend (solo ASCII).
    translate(lower(b.nombre), 'áéíóúñ', 'aeioun') || '.' || translate(lower(b.ap_pat), 'áéíóúñ', 'aeioun') || b.rn || '@sgei.edu.pe' AS usuario_login,
    (CASE WHEN b.nivel_nombre = 'Primaria' THEN make_date(2025 - (5 + b.grado_orden), 6, 15)
          ELSE make_date(2025 - (11 + b.grado_orden), 6, 15) END) AS fecha_nac
  FROM base b
),
ins_cred AS (
  INSERT INTO auth_schema.credencial (usuario_login, password_hash, nombres, apellido_paterno, apellido_materno)
  SELECT b.usuario_login, h.h, b.nombre, b.ap_pat, b.ap_mat FROM base2 b CROSS JOIN tmp_hash h
  ON CONFLICT (usuario_login) DO NOTHING
  RETURNING id AS credencial_id, usuario_login
),
ins_perfil AS (
  INSERT INTO auth_schema.perfil_usuario (credencial_id, rol, entidad_tipo, entidad_id)
  SELECT ic.credencial_id, 'Alumno'::auth_schema.rol_usuario, 'alumno', b.pre_alumno_id
  FROM ins_cred ic JOIN base2 b ON b.usuario_login = ic.usuario_login
  RETURNING id AS perfil_id, entidad_id AS pre_alumno_id
)
INSERT INTO academic_schema.alumno
  (id, perfil_usuario_id, seccion_id, periodo_id, dni, codigo_siagie, nombres, apellido_paterno, apellido_materno, fecha_nacimiento, sexo, activo)
SELECT ip.pre_alumno_id, ip.perfil_id, b.seccion_id, '00000000-0000-0000-0004-000000000003'::uuid,
       b.dni, b.siagie, b.nombre, b.ap_pat, b.ap_mat, b.fecha_nac, b.sexo, TRUE
FROM ins_perfil ip JOIN base2 b ON b.pre_alumno_id = ip.pre_alumno_id;

-- ============================================================
-- 8) Libretas — SOLO Bimestre I, para todos los alumnos del
--    período (nuevos + los 12 originales). Competencias resueltas
--    dinámicamente: override del grado si existe, si no el default
--    del nivel (misma regla que CompetenciaRepo.list en backend).
-- ============================================================
WITH ins_libreta AS (
  INSERT INTO academic_schema.libreta (alumno_id, periodo_id, bimestre_id, estado, version, generada_por, publicada_por, fecha_generacion, fecha_publicacion)
  SELECT a.id, '00000000-0000-0000-0004-000000000003'::uuid, '00000000-0000-0000-0007-000000000001'::uuid,
         'PUBLICADA'::academic_schema.estado_libreta, 1,
         (SELECT id FROM auth_schema.perfil_usuario WHERE rol = 'Admin' LIMIT 1),
         (SELECT id FROM auth_schema.perfil_usuario WHERE rol = 'Admin' LIMIT 1),
         now(), now()
  FROM academic_schema.alumno a
  WHERE a.periodo_id = '00000000-0000-0000-0004-000000000003'::uuid
  ON CONFLICT (alumno_id, periodo_id, bimestre_id) DO NOTHING
  RETURNING id AS libreta_id, alumno_id
)
-- La nota se calcula en la subconsulta "x" (no en un LATERAL aparte
-- sin correlación): Postgres puede evaluar un LATERAL uncorrelado una
-- sola vez en vez de una vez por fila, dejando la misma nota en todas
-- las competencias de una misma libreta. Como columna normal de una
-- subconsulta en FROM, random() sí se re-evalúa por cada fila.
INSERT INTO academic_schema.libreta_detalle
  (libreta_id, curso_id, curso_nombre_snapshot, competencia_id, competencia_nombre_snapshot, tipo_competencia, bimestre_numero, nota_vigesimal, nota_literal, orden_curso, orden_competencia)
SELECT
  x.libreta_id, x.curso_id, x.curso_nombre, x.competencia_id, x.competencia_nombre, x.tipo_competencia, 1,
  x.nv,
  (CASE WHEN x.nv >= 18 THEN 'AD' WHEN x.nv >= 14 THEN 'A' WHEN x.nv >= 11 THEN 'B' ELSE 'C' END)::academic_schema.nota_literal,
  0, x.orden_competencia
FROM (
  SELECT
    il.libreta_id, cur.id AS curso_id, cur.nombre AS curso_nombre,
    comp.id AS competencia_id, comp.nombre AS competencia_nombre, comp.tipo AS tipo_competencia,
    COALESCE(comp.orden, 1) AS orden_competencia,
    (11 + floor(random() * 10))::numeric(4,2) AS nv
  FROM ins_libreta il
  JOIN academic_schema.alumno al ON al.id = il.alumno_id
  JOIN academic_schema.seccion sec ON sec.id = al.seccion_id
  CROSS JOIN academic_schema.curso cur
  CROSS JOIN LATERAL (
    SELECT c2.id, c2.nombre, c2.tipo, c2.orden
    FROM academic_schema.competencia c2
    WHERE c2.curso_id = cur.id AND c2.grado_id = sec.grado_id
    UNION ALL
    SELECT c2.id, c2.nombre, c2.tipo, c2.orden
    FROM academic_schema.competencia c2
    WHERE c2.curso_id = cur.id AND c2.grado_id IS NULL
      AND NOT EXISTS (SELECT 1 FROM academic_schema.competencia c3 WHERE c3.curso_id = cur.id AND c3.grado_id = sec.grado_id)
  ) comp
) x;

-- ============================================================
-- 9) Pagos — solo los 228 alumnos nuevos (dni LIKE '71%'), evita
--    duplicar pagos de los 12 alumnos originales (pago no tiene
--    UNIQUE real que permita ON CONFLICT).
-- ============================================================
WITH nuevos_alumnos AS (
  SELECT id FROM academic_schema.alumno
  WHERE dni LIKE '71%' AND NOT EXISTS (SELECT 1 FROM financial_schema.pago p WHERE p.alumno_id = academic_schema.alumno.id)
)
INSERT INTO financial_schema.pago (alumno_id, concepto_id, periodo_id, mes, monto, estado, fecha_vencimiento, fecha_pago, generado_por)
SELECT na.id, (SELECT id FROM financial_schema.concepto_pago WHERE nombre = 'Pensión Mensual' LIMIT 1),
       '00000000-0000-0000-0004-000000000003'::uuid, m.mes, 350.00,
       m.estado::financial_schema.estado_pago, m.venc, m.pago_fecha,
       (SELECT id FROM auth_schema.perfil_usuario WHERE rol = 'Admin' LIMIT 1)
FROM nuevos_alumnos na
CROSS JOIN (VALUES
  (3::smallint, 'Pagado',    DATE '2025-03-31', DATE '2025-03-05'),
  (4::smallint, 'Pendiente', DATE '2025-04-30', NULL::date)
) AS m(mes, estado, venc, pago_fecha);

-- Muestra de boletas subidas (En_Revision) sobre 15 pagos Pendiente.
WITH pendientes AS (
  SELECT p.id AS pago_id, p.alumno_id, ROW_NUMBER() OVER (ORDER BY p.id) AS rn
  FROM financial_schema.pago p
  JOIN academic_schema.alumno a ON a.id = p.alumno_id
  WHERE a.dni LIKE '71%' AND p.estado = 'Pendiente'
)
INSERT INTO financial_schema.boleta_pago (pago_id, url_archivo, nombre_archivo, banco, numero_operacion, estado_revision)
SELECT pago_id,
       'https://sgei.edu.pe/uploads/vouchers/' || alumno_id::text || '_abril_2025.jpg',
       'comprobante_pago_abril_2025.jpg', 'Banco de la Nación', lpad(rn::text, 10, '0'),
       'En_Revision'::financial_schema.estado_revision_boleta
FROM pendientes
WHERE rn <= 15
ON CONFLICT (pago_id) DO NOTHING;

-- ============================================================
-- 10) Asistencia — todos los alumnos del período, semana
--     representativa dentro del Bimestre I (05-05 al 09-05-2025).
-- ============================================================
WITH dias AS (
  SELECT * FROM (VALUES (DATE '2025-05-05'), (DATE '2025-05-06'), (DATE '2025-05-07'), (DATE '2025-05-08'), (DATE '2025-05-09')) AS d(fecha)
),
alumno_docente AS (
  SELECT a.id AS alumno_id, a.seccion_id,
         (SELECT h.docente_id FROM academic_schema.horario h WHERE h.seccion_id = a.seccion_id LIMIT 1) AS docente_id
  FROM academic_schema.alumno a
  WHERE a.periodo_id = '00000000-0000-0000-0004-000000000003'::uuid
)
INSERT INTO academic_schema.asistencia (alumno_id, seccion_id, fecha, estado, registrado_por)
SELECT ad.alumno_id, ad.seccion_id, di.fecha,
  (CASE
     WHEN random() < 0.88 THEN 'P'
     WHEN random() < 0.94 THEN 'T'
     WHEN random() < 0.98 THEN 'J'
     ELSE 'F'
   END)::academic_schema.estado_asistencia,
  ad.docente_id
FROM alumno_docente ad
CROSS JOIN dias di
WHERE ad.docente_id IS NOT NULL
ON CONFLICT (alumno_id, seccion_id, fecha) DO NOTHING;

SET session_replication_role = default;
