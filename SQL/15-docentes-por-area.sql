-- ============================================================
--  15-docentes-por-area.sql
--  32 docentes nuevos organizados por área (un docente de área
--  puede dictar cualquier curso de esa área) + docentes de cursos
--  individuales (Inglés, Ed. Física, Religión, Oratoria, Música).
--  Cada docente de área cubre un grupo de como máximo 2 grados
--  (evita que un solo docente necesite más horas de las que caben
--  en la semana), y cada docente de curso individual cubre TODOS
--  los grados de su nivel (baja carga horaria, cabe sin problema).
--
--  DNI 72000001-72000032 (rango nuevo, no choca con 452316xx
--  originales, 690000xx del seed grande, ni 71xxxxxx de alumnos).
-- ============================================================

SET session_replication_role = replica;

CREATE TEMP TABLE tmp_hash2 AS SELECT crypt('demo1234', gen_salt('bf', 12)) AS h;

-- Catálogo: nombre, apellidos, dni, especialidad, nivel, cursos que puede
-- dictar (nombres, se resuelven contra el nivel), grados que cubre (nombres).
CREATE TEMP TABLE tmp_catalogo_area_docentes AS
SELECT * FROM (VALUES
  -- ═══ PRIMARIA — Matemática (3 docentes, pares de grados) ═══
  ('rocio.salvatierra@sgei.edu.pe',  'Rocío',    'Salvatierra', 'Neyra',    '72000001', 'Matemática (Primaria)', 'Primaria',
    ARRAY['Aritmética','R.M.','Álgebra','Trigonometría','Geometría'], ARRAY['1° Primaria','2° Primaria']),
  ('victor.ochoa@sgei.edu.pe',       'Víctor',   'Ochoa',       'Farfán',   '72000002', 'Matemática (Primaria)', 'Primaria',
    ARRAY['Aritmética','R.M.','Álgebra','Trigonometría','Geometría'], ARRAY['3° Primaria','4° Primaria']),
  ('gladys.tello@sgei.edu.pe',       'Gladys',   'Tello',       'Ancco',    '72000003', 'Matemática (Primaria)', 'Primaria',
    ARRAY['Aritmética','R.M.','Álgebra','Trigonometría','Geometría'], ARRAY['5° Primaria','6° Primaria']),

  -- ═══ PRIMARIA — Letras (3 docentes) ═══
  ('milagros.escobar@sgei.edu.pe',   'Milagros', 'Escobar',     'Quiñones', '72000004', 'Letras (Primaria)', 'Primaria',
    ARRAY['Lenguaje','R.V.','Plan Lector'], ARRAY['1° Primaria','2° Primaria']),
  ('walter.cordova@sgei.edu.pe',     'Walter',   'Córdova',     'Bejar',    '72000005', 'Letras (Primaria)', 'Primaria',
    ARRAY['Lenguaje','R.V.','Plan Lector'], ARRAY['3° Primaria','4° Primaria']),
  ('nora.villanueva@sgei.edu.pe',    'Nora',     'Villanueva',  'Osco',     '72000006', 'Letras (Primaria)', 'Primaria',
    ARRAY['Lenguaje','R.V.','Plan Lector'], ARRAY['5° Primaria','6° Primaria']),

  -- ═══ PRIMARIA — Sociales (3 docentes) ═══
  ('ruben.maldonado@sgei.edu.pe',    'Rubén',    'Maldonado',   'Sifuentes','72000007', 'Sociales (Primaria)', 'Primaria',
    ARRAY['Cívica','Geografía','Historia'], ARRAY['1° Primaria','2° Primaria']),
  ('elizabeth.nina@sgei.edu.pe',     'Elizabeth','Nina',        'Ttito',    '72000008', 'Sociales (Primaria)', 'Primaria',
    ARRAY['Cívica','Geografía','Historia'], ARRAY['3° Primaria','4° Primaria']),
  ('percy.calle@sgei.edu.pe',        'Percy',    'Calle',       'Ramos',    '72000009', 'Sociales (Primaria)', 'Primaria',
    ARRAY['Cívica','Geografía','Historia'], ARRAY['5° Primaria','6° Primaria']),

  -- ═══ PRIMARIA — Ciencias (3 docentes) ═══
  ('cinthia.arangoitia@sgei.edu.pe', 'Cinthia',  'Arangoitia',  'Del Pozo', '72000010', 'Ciencias (Primaria)', 'Primaria',
    ARRAY['Biología','Química'], ARRAY['1° Primaria','2° Primaria']),
  ('freddy.zambrano@sgei.edu.pe',    'Freddy',   'Zambrano',    'Osorio',   '72000011', 'Ciencias (Primaria)', 'Primaria',
    ARRAY['Biología','Química'], ARRAY['3° Primaria','4° Primaria']),
  ('yesenia.puma@sgei.edu.pe',       'Yesenia',  'Puma',        'Achata',   '72000012', 'Ciencias (Primaria)', 'Primaria',
    ARRAY['Biología','Química'], ARRAY['5° Primaria','6° Primaria']),

  -- ═══ PRIMARIA — cursos individuales (1 docente, todos los grados) ═══
  ('nadia.bautista@sgei.edu.pe',     'Nadia',    'Bautista',    'Cano',     '72000013', 'Inglés (Primaria)', 'Primaria',
    ARRAY['Inglés'], ARRAY['1° Primaria','2° Primaria','3° Primaria','4° Primaria','5° Primaria','6° Primaria']),
  ('hector.villalba@sgei.edu.pe',    'Héctor',   'Villalba',    'Soncco',   '72000014', 'Ed. Física (Primaria)', 'Primaria',
    ARRAY['Educación Física'], ARRAY['1° Primaria','2° Primaria','3° Primaria','4° Primaria','5° Primaria','6° Primaria']),
  ('esther.quiroz@sgei.edu.pe',      'Esther',   'Quiroz',      'Alarcón',  '72000015', 'Religión (Primaria)', 'Primaria',
    ARRAY['Religión'], ARRAY['1° Primaria','2° Primaria','3° Primaria','4° Primaria','5° Primaria','6° Primaria']),
  ('bautista.nicol@sgei.edu.pe',     'Nicol',    'Bautista',    'Reyes',    '72000016', 'Oratoria (Primaria)', 'Primaria',
    ARRAY['Oratoria'], ARRAY['1° Primaria','2° Primaria','3° Primaria','4° Primaria','5° Primaria','6° Primaria']),
  ('claudio.bermudez@sgei.edu.pe',   'Claudio',  'Bermúdez',    'Way',      '72000017', 'Música (Primaria)', 'Primaria',
    ARRAY['Música'], ARRAY['1° Primaria','2° Primaria','3° Primaria','4° Primaria','5° Primaria','6° Primaria']),

  -- ═══ SECUNDARIA — Matemática (3 docentes: [1°,2°],[3°,4°],[5°]) ═══
  ('victor.nicol@sgei.edu.pe',       'Víctor',   'Solórzano',   'Nicol',    '72000018', 'Matemática (Secundaria)', 'Secundaria',
    ARRAY['Aritmética','R.M.','Álgebra','Trigonometría','Geometría'], ARRAY['1° Secundaria','2° Secundaria']),
  ('sonia.villegas@sgei.edu.pe',     'Sonia',    'Villegas',    'Chumpitaz','72000019', 'Matemática (Secundaria)', 'Secundaria',
    ARRAY['Aritmética','R.M.','Álgebra','Trigonometría','Geometría'], ARRAY['3° Secundaria','4° Secundaria']),
  ('raul.espejo@sgei.edu.pe',        'Raúl',     'Espejo',      'Tirado',   '72000020', 'Matemática (Secundaria)', 'Secundaria',
    ARRAY['Aritmética','R.M.','Álgebra','Trigonometría','Geometría'], ARRAY['5° Secundaria']),

  -- ═══ SECUNDARIA — Letras (3 docentes) ═══
  ('lourdes.rivadeneira@sgei.edu.pe','Lourdes',  'Rivadeneira', 'Guzman',   '72000021', 'Letras (Secundaria)', 'Secundaria',
    ARRAY['Lenguaje','R.V.','Literatura','Plan Lector'], ARRAY['1° Secundaria','2° Secundaria']),
  ('jorge.villarreal@sgei.edu.pe',   'Jorge',    'Villarreal',  'Chacón',   '72000022', 'Letras (Secundaria)', 'Secundaria',
    ARRAY['Lenguaje','R.V.','Literatura','Plan Lector'], ARRAY['3° Secundaria','4° Secundaria']),
  ('betty.oscanoa@sgei.edu.pe',      'Betty',    'Oscanoa',     'Millones', '72000023', 'Letras (Secundaria)', 'Secundaria',
    ARRAY['Lenguaje','R.V.','Literatura','Plan Lector'], ARRAY['5° Secundaria']),

  -- ═══ SECUNDARIA — Sociales (3 docentes) ═══
  ('miguel.villarreal@sgei.edu.pe',  'Miguel',   'Villarreal',  'Choque',   '72000024', 'Sociales (Secundaria)', 'Secundaria',
    ARRAY['Cívica','Geografía','Historia','Psicología'], ARRAY['1° Secundaria','2° Secundaria']),
  ('rosa.huaynamarca@sgei.edu.pe',   'Rosa',     'Huaynamarca', 'Ccama',    '72000025', 'Sociales (Secundaria)', 'Secundaria',
    ARRAY['Cívica','Geografía','Historia','Psicología'], ARRAY['3° Secundaria','4° Secundaria']),
  ('teodoro.villarreal@sgei.edu.pe', 'Teodoro',  'Villarreal',  'Peña',     '72000026', 'Sociales (Secundaria)', 'Secundaria',
    ARRAY['Cívica','Geografía','Historia','Psicología'], ARRAY['5° Secundaria']),

  -- ═══ SECUNDARIA — Ciencias (3 docentes) ═══
  ('erika.huaynamarca@sgei.edu.pe',  'Érika',    'Huaynamarca', 'Solís',    '72000027', 'Ciencias (Secundaria)', 'Secundaria',
    ARRAY['Física','Biología','Química'], ARRAY['1° Secundaria','2° Secundaria']),
  ('carlos.nicol@sgei.edu.pe',       'Carlos',   'Nicol',       'Ferrand',  '72000028', 'Ciencias (Secundaria)', 'Secundaria',
    ARRAY['Física','Biología','Química'], ARRAY['3° Secundaria','4° Secundaria']),
  ('daysi.huaynamarca@sgei.edu.pe',  'Daysi',    'Huaynamarca', 'Rojas',    '72000029', 'Ciencias (Secundaria)', 'Secundaria',
    ARRAY['Física','Biología','Química'], ARRAY['5° Secundaria']),

  -- ═══ SECUNDARIA — cursos individuales (1 docente, todos los grados) ═══
  ('erick.bautista@sgei.edu.pe',     'Erick',    'Bautista',    'Wong',     '72000030', 'Inglés (Secundaria)', 'Secundaria',
    ARRAY['Inglés'], ARRAY['1° Secundaria','2° Secundaria','3° Secundaria','4° Secundaria','5° Secundaria']),
  ('marco.benavides@sgei.edu.pe',    'Marco',    'Benavides',   'Ilizarbe', '72000031', 'Ed. Física (Secundaria)', 'Secundaria',
    ARRAY['Educación Física'], ARRAY['1° Secundaria','2° Secundaria','3° Secundaria','4° Secundaria','5° Secundaria']),
  ('brenda.way@sgei.edu.pe',         'Brenda',   'Way',         'Chavarria','72000032', 'Música (Secundaria)', 'Secundaria',
    ARRAY['Música'], ARRAY['1° Secundaria','2° Secundaria','3° Secundaria','4° Secundaria','5° Secundaria'])
) AS t(usuario_login, nombres, ap_pat, ap_mat, dni, especialidad, nivel_nombre, cursos, grados_nombres);

WITH nuevos_id AS (
  SELECT n.*, gen_random_uuid() AS pre_docente_id FROM tmp_catalogo_area_docentes n
),
ins_cred AS (
  INSERT INTO auth_schema.credencial (usuario_login, password_hash, nombres, apellido_paterno, apellido_materno)
  SELECT n.usuario_login, h.h, n.nombres, n.ap_pat, n.ap_mat FROM nuevos_id n CROSS JOIN tmp_hash2 h
  ON CONFLICT (usuario_login) DO NOTHING
  RETURNING id AS credencial_id, usuario_login
),
ins_perfil AS (
  INSERT INTO auth_schema.perfil_usuario (credencial_id, rol, entidad_tipo, entidad_id)
  SELECT ic.credencial_id, 'Docente'::auth_schema.rol_usuario, 'docente', n.pre_docente_id
  FROM ins_cred ic JOIN nuevos_id n ON n.usuario_login = ic.usuario_login
  RETURNING id AS perfil_id, entidad_id AS pre_docente_id
)
INSERT INTO academic_schema.docente
  (id, perfil_usuario_id, dni, nombres, apellido_paterno, apellido_materno, especialidad, telefono, email_institucional, activo, fecha_ingreso)
SELECT ip.pre_docente_id, ip.perfil_id, n.dni, n.nombres, n.ap_pat, n.ap_mat, n.especialidad, '987654321', n.usuario_login, TRUE, DATE '2026-03-01'
FROM ins_perfil ip JOIN nuevos_id n ON n.pre_docente_id = ip.pre_docente_id;

-- ── Asignaciones: para cada docente del catálogo, para cada grado que
--    cubre, para cada curso que puede dictar (ya existente en ese
--    nivel) — crea la asignación si no existe. ──
INSERT INTO academic_schema.asignacion_docente (docente_id, curso_id, seccion_id, periodo_id, activo)
SELECT d.id, cu.id, s.id, '00000000-0000-0000-0004-000000000003', TRUE
FROM tmp_catalogo_area_docentes cat
JOIN academic_schema.docente d ON d.email_institucional = cat.usuario_login
JOIN academic_schema.nivel n ON n.nombre = cat.nivel_nombre
JOIN academic_schema.grado g ON g.nivel_id = n.id AND g.nombre = ANY(cat.grados_nombres)
JOIN academic_schema.seccion s ON s.grado_id = g.id AND s.periodo_id = '00000000-0000-0000-0004-000000000003'
JOIN academic_schema.curso cu ON cu.nivel_id = n.id AND cu.nombre = ANY(cat.cursos)
ON CONFLICT (docente_id, seccion_id, curso_id, periodo_id) DO NOTHING;

SET session_replication_role = default;
