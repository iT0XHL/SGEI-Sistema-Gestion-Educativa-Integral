-- ============================================================
-- 02-seed.sql — Datos de prueba para SGEI
-- Usuarios, estructura académica, cursos, alumnos, pagos
-- Contraseña de TODOS los usuarios: demo1234
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Disable all triggers during seed (audit trigger has type casting bug)
SET session_replication_role = replica;

DO $$
DECLARE
  -- ── IDs fijos para reproducibilidad ──────────────────────────

  -- Credenciales (Admin, Secretaria, Docentes, Alumnos)
  v_cred_admin   UUID := '00000000-0000-0000-0001-000000000001';
  v_cred_sec     UUID := '00000000-0000-0000-0001-000000000002';
  v_cred_doc1    UUID := '00000000-0000-0000-0001-000000000003';
  v_cred_alu1    UUID := '00000000-0000-0000-0001-000000000004';
  v_cred_doc2    UUID := '00000000-0000-0000-0001-000000000005';
  v_cred_doc3    UUID := '00000000-0000-0000-0001-000000000006';
  v_cred_doc4    UUID := '00000000-0000-0000-0001-000000000007';
  v_cred_doc5    UUID := '00000000-0000-0000-0001-000000000008';
  v_cred_doc6    UUID := '00000000-0000-0000-0001-000000000009';
  v_cred_doc7    UUID := '00000000-0000-0000-0001-000000000010';

  -- Perfiles
  v_perf_admin   UUID := '00000000-0000-0000-0002-000000000001';
  v_perf_sec     UUID := '00000000-0000-0000-0002-000000000002';
  v_perf_doc1    UUID := '00000000-0000-0000-0002-000000000003';
  v_perf_alu1    UUID := '00000000-0000-0000-0002-000000000004';
  v_perf_doc2    UUID := '00000000-0000-0000-0002-000000000005';
  v_perf_doc3    UUID := '00000000-0000-0000-0002-000000000006';
  v_perf_doc4    UUID := '00000000-0000-0000-0002-000000000007';
  v_perf_doc5    UUID := '00000000-0000-0000-0002-000000000008';
  v_perf_doc6    UUID := '00000000-0000-0000-0002-000000000009';
  v_perf_doc7    UUID := '00000000-0000-0000-0002-000000000010';

  -- Docentes
  v_doc1_id      UUID := '00000000-0000-0000-0003-000000000001';
  v_doc2_id      UUID := '00000000-0000-0000-0003-000000000002';
  v_doc3_id      UUID := '00000000-0000-0000-0003-000000000003';
  v_doc4_id      UUID := '00000000-0000-0000-0003-000000000004';
  v_doc5_id      UUID := '00000000-0000-0000-0003-000000000005';
  v_doc6_id      UUID := '00000000-0000-0000-0003-000000000006';
  v_doc7_id      UUID := '00000000-0000-0000-0003-000000000007';

  -- Alumnos (12 estudiantes)
  v_alu1_id      UUID := '00000000-0000-0000-0003-100000000001';
  v_alu2_id      UUID := '00000000-0000-0000-0003-100000000002';
  v_alu3_id      UUID := '00000000-0000-0000-0003-100000000003';
  v_alu4_id      UUID := '00000000-0000-0000-0003-100000000004';
  v_alu5_id      UUID := '00000000-0000-0000-0003-100000000005';
  v_alu6_id      UUID := '00000000-0000-0000-0003-100000000006';
  v_alu7_id      UUID := '00000000-0000-0000-0003-100000000007';
  v_alu8_id      UUID := '00000000-0000-0000-0003-100000000008';
  v_alu9_id      UUID := '00000000-0000-0000-0003-100000000009';
  v_alu10_id     UUID := '00000000-0000-0000-0003-100000000010';
  v_alu11_id     UUID := '00000000-0000-0000-0003-100000000011';
  v_alu12_id     UUID := '00000000-0000-0000-0003-100000000012';

  -- Credenciales para alumnos
  v_cred_alu2    UUID := '00000000-0000-0000-0001-000000000011';
  v_cred_alu3    UUID := '00000000-0000-0000-0001-000000000012';
  v_cred_alu4    UUID := '00000000-0000-0000-0001-000000000013';
  v_cred_alu5    UUID := '00000000-0000-0000-0001-000000000014';
  v_cred_alu6    UUID := '00000000-0000-0000-0001-000000000015';
  v_cred_alu7    UUID := '00000000-0000-0000-0001-000000000016';
  v_cred_alu8    UUID := '00000000-0000-0000-0001-000000000017';
  v_cred_alu9    UUID := '00000000-0000-0000-0001-000000000018';
  v_cred_alu10   UUID := '00000000-0000-0000-0001-000000000019';
  v_cred_alu11   UUID := '00000000-0000-0000-0001-000000000020';
  v_cred_alu12   UUID := '00000000-0000-0000-0001-000000000021';

  -- Perfiles para alumnos
  v_perf_alu2    UUID := '00000000-0000-0000-0002-000000000011';
  v_perf_alu3    UUID := '00000000-0000-0000-0002-000000000012';
  v_perf_alu4    UUID := '00000000-0000-0000-0002-000000000013';
  v_perf_alu5    UUID := '00000000-0000-0000-0002-000000000014';
  v_perf_alu6    UUID := '00000000-0000-0000-0002-000000000015';
  v_perf_alu7    UUID := '00000000-0000-0000-0002-000000000016';
  v_perf_alu8    UUID := '00000000-0000-0000-0002-000000000017';
  v_perf_alu9    UUID := '00000000-0000-0000-0002-000000000018';
  v_perf_alu10   UUID := '00000000-0000-0000-0002-000000000019';
  v_perf_alu11   UUID := '00000000-0000-0000-0002-000000000020';
  v_perf_alu12   UUID := '00000000-0000-0000-0002-000000000021';

  -- Estructura académica
  v_nivel_id     UUID := '00000000-0000-0000-0004-000000000001';
  v_grado_id     UUID := '00000000-0000-0000-0004-000000000002';
  v_periodo_id   UUID := '00000000-0000-0000-0004-000000000003';
  v_seccion_id   UUID := '00000000-0000-0000-0004-000000000004';

  -- Cursos
  v_curso1_id    UUID := '00000000-0000-0000-0005-000000000001';
  v_curso2_id    UUID := '00000000-0000-0000-0005-000000000002';
  v_curso3_id    UUID := '00000000-0000-0000-0005-000000000003';
  v_curso4_id    UUID := '00000000-0000-0000-0005-000000000004';
  v_curso5_id    UUID := '00000000-0000-0000-0005-000000000005';
  v_curso6_id    UUID := '00000000-0000-0000-0005-000000000006';
  v_curso7_id    UUID := '00000000-0000-0000-0005-000000000007';
  v_curso8_id    UUID := '00000000-0000-0000-0005-000000000008';

  -- Competencias
  v_comp1_id     UUID := '00000000-0000-0000-0006-000000000001';
  v_comp2_id     UUID := '00000000-0000-0000-0006-000000000002';
  v_comp3_id     UUID := '00000000-0000-0000-0006-000000000003';
  v_comp4_id     UUID := '00000000-0000-0000-0006-000000000004';

  -- Bimestres
  v_bim1_id      UUID := '00000000-0000-0000-0007-000000000001';
  v_bim2_id      UUID := '00000000-0000-0000-0007-000000000002';

  -- Concepto de pago
  v_concepto_id  UUID := '00000000-0000-0000-0008-000000000001';

  -- Asignaciones docentes
  v_asign1_id    UUID := '00000000-0000-0000-0009-000000000001';
  v_asign2_id    UUID := '00000000-0000-0000-0009-000000000002';
  v_asign3_id    UUID := '00000000-0000-0000-0009-000000000003';
  v_asign4_id    UUID := '00000000-0000-0000-0009-000000000004';
  v_asign5_id    UUID := '00000000-0000-0000-0009-000000000005';
  v_asign6_id    UUID := '00000000-0000-0000-0009-000000000006';
  v_asign7_id    UUID := '00000000-0000-0000-0009-000000000007';
  v_asign8_id    UUID := '00000000-0000-0000-0009-000000000008';

  -- Hash generado una sola vez para todos los usuarios
  v_hash         TEXT;

BEGIN
  v_hash := crypt('demo1234', gen_salt('bf', 12));

  -- ══════════════════════════════════════════════════════════════
  -- IDENTIDAD Y ACCESO
  -- ══════════════════════════════════════════════════════════════

  INSERT INTO auth_schema.credencial (id, usuario_login, password_hash)
  VALUES
    (v_cred_admin, 'director@sgei.edu.pe',       v_hash),
    (v_cred_sec,   'secretaria@sgei.edu.pe',     v_hash),
    (v_cred_doc1,  'ana.garcia@sgei.edu.pe',     v_hash),
    (v_cred_alu1,  'carlos.mendoza@sgei.edu.pe', v_hash),
    (v_cred_doc2,  'jose.ramos@sgei.edu.pe',     v_hash),
    (v_cred_doc3,  'maria.lupaca@sgei.edu.pe',   v_hash),
    (v_cred_doc4,  'luis.quispe@sgei.edu.pe',    v_hash),
    (v_cred_doc5,  'sandra.flores@sgei.edu.pe',  v_hash),
    (v_cred_doc6,  'marco.benitez@sgei.edu.pe',  v_hash),
    (v_cred_doc7,  'carmen.huanca@sgei.edu.pe',  v_hash),
    (v_cred_alu2,  'adriana.castillo@sgei.edu.pe',    v_hash),
    (v_cred_alu3,  'benjamin.cruz@sgei.edu.pe',       v_hash),
    (v_cred_alu4,  'diana.flores@sgei.edu.pe',        v_hash),
    (v_cred_alu5,  'eduardo.quispe@sgei.edu.pe',      v_hash),
    (v_cred_alu6,  'fernanda.mamani@sgei.edu.pe',     v_hash),
    (v_cred_alu7,  'gabriel.herrera@sgei.edu.pe',     v_hash),
    (v_cred_alu8,  'hilda.lazo@sgei.edu.pe',          v_hash),
    (v_cred_alu9,  'ivan.paredes@sgei.edu.pe',        v_hash),
    (v_cred_alu10, 'juliana.ramos@sgei.edu.pe',       v_hash),
    (v_cred_alu11, 'kevin.salinas@sgei.edu.pe',       v_hash),
    (v_cred_alu12, 'luciana.vargas@sgei.edu.pe',      v_hash)
  ON CONFLICT DO NOTHING;

  INSERT INTO auth_schema.perfil_usuario (id, credencial_id, rol, entidad_tipo, entidad_id)
  VALUES
    (v_perf_admin, v_cred_admin, 'Admin',      'admin',      v_perf_admin),
    (v_perf_sec,   v_cred_sec,   'Secretaria', 'secretaria', v_perf_sec),
    (v_perf_doc1,  v_cred_doc1,  'Docente',    'docente',    v_doc1_id),
    (v_perf_alu1,  v_cred_alu1,  'Alumno',     'alumno',     v_alu1_id),
    (v_perf_doc2,  v_cred_doc2,  'Docente',    'docente',    v_doc2_id),
    (v_perf_doc3,  v_cred_doc3,  'Docente',    'docente',    v_doc3_id),
    (v_perf_doc4,  v_cred_doc4,  'Docente',    'docente',    v_doc4_id),
    (v_perf_doc5,  v_cred_doc5,  'Docente',    'docente',    v_doc5_id),
    (v_perf_doc6,  v_cred_doc6,  'Docente',    'docente',    v_doc6_id),
    (v_perf_doc7,  v_cred_doc7,  'Docente',    'docente',    v_doc7_id),
    (v_perf_alu2,  v_cred_alu2,  'Alumno',     'alumno',     v_alu2_id),
    (v_perf_alu3,  v_cred_alu3,  'Alumno',     'alumno',     v_alu3_id),
    (v_perf_alu4,  v_cred_alu4,  'Alumno',     'alumno',     v_alu4_id),
    (v_perf_alu5,  v_cred_alu5,  'Alumno',     'alumno',     v_alu5_id),
    (v_perf_alu6,  v_cred_alu6,  'Alumno',     'alumno',     v_alu6_id),
    (v_perf_alu7,  v_cred_alu7,  'Alumno',     'alumno',     v_alu7_id),
    (v_perf_alu8,  v_cred_alu8,  'Alumno',     'alumno',     v_alu8_id),
    (v_perf_alu9,  v_cred_alu9,  'Alumno',     'alumno',     v_alu9_id),
    (v_perf_alu10, v_cred_alu10, 'Alumno',     'alumno',     v_alu10_id),
    (v_perf_alu11, v_cred_alu11, 'Alumno',     'alumno',     v_alu11_id),
    (v_perf_alu12, v_cred_alu12, 'Alumno',     'alumno',     v_alu12_id)
  ON CONFLICT DO NOTHING;

  -- ══════════════════════════════════════════════════════════════
  -- ESTRUCTURA ACADÉMICA
  -- ══════════════════════════════════════════════════════════════

  INSERT INTO academic_schema.nivel (id, nombre)
  VALUES (v_nivel_id, 'Secundaria')
  ON CONFLICT DO NOTHING;

  INSERT INTO academic_schema.grado (id, nivel_id, nombre, orden)
  VALUES (v_grado_id, v_nivel_id, '3° Secundaria', 3)
  ON CONFLICT DO NOTHING;

  INSERT INTO academic_schema.periodo_academico (id, año, nombre, fecha_inicio, fecha_fin, activo)
  VALUES (v_periodo_id, 2026, 'Año Lectivo 2026', '2026-03-01', '2026-12-15', TRUE)
  ON CONFLICT DO NOTHING;

  -- ══════════════════════════════════════════════════════════════
  -- PERSONAL DOCENTE (ANTES DE SECCIÓN para evitar FK violation)
  -- ══════════════════════════════════════════════════════════════

  INSERT INTO academic_schema.docente (
    id, perfil_usuario_id, dni, nombres,
    apellido_paterno, apellido_materno, especialidad, telefono
  ) VALUES
    (v_doc1_id, v_perf_doc1, '45231678', 'Ana',      'García',  'Vega',    'Matemática',        '999000001'),
    (v_doc2_id, v_perf_doc2, '45231679', 'José',     'Ramos',   'Ccopa',   'Comunicación',      '999000002'),
    (v_doc3_id, v_perf_doc3, '45231680', 'María',    'Lupaca',  'Ferro',   'Ciencias Sociales', '999000003'),
    (v_doc4_id, v_perf_doc4, '45231681', 'Luis',     'Quispe',  'Apaza',   'C. y Tecnología',   '999000004'),
    (v_doc5_id, v_perf_doc5, '45231682', 'Sandra',   'Flores',  'Lima',    'Inglés',            '999000005'),
    (v_doc6_id, v_perf_doc6, '45231684', 'Marco',    'Benítez', 'Soto',    'Ed. Física',        '999000006'),
    (v_doc7_id, v_perf_doc7, '45231685', 'Carmen',   'Huanca',  'Rios',    'Arte y Cultura',    '999000007')
  ON CONFLICT DO NOTHING;

  -- AHORA sí, insertar sección con docente_tutor existente
  INSERT INTO academic_schema.seccion (id, grado_id, periodo_id, nombre, cupo_maximo, docente_tutor_id)
  VALUES (v_seccion_id, v_grado_id, v_periodo_id, 'A', 30, v_doc1_id)
  ON CONFLICT DO NOTHING;

  -- ══════════════════════════════════════════════════════════════
  -- CURSOS Y COMPETENCIAS
  -- ══════════════════════════════════════════════════════════════

  INSERT INTO academic_schema.curso (id, nivel_id, nombre, codigo_cneb, horas_semanales)
  VALUES
    (v_curso1_id, v_nivel_id, 'Matemática',           'C01', 5),
    (v_curso2_id, v_nivel_id, 'Comunicación',         'C02', 5),
    (v_curso3_id, v_nivel_id, 'Ciencias Sociales',    'C03', 4),
    (v_curso4_id, v_nivel_id, 'Ciencia y Tecnología', 'C04', 5),
    (v_curso5_id, v_nivel_id, 'Inglés',               'C05', 3),
    (v_curso6_id, v_nivel_id, 'Ed. Física',           'C06', 2),
    (v_curso7_id, v_nivel_id, 'Arte y Cultura',       'C07', 2),
    (v_curso8_id, v_nivel_id, 'Ed. para el Trabajo',  'C08', 3)
  ON CONFLICT DO NOTHING;

  INSERT INTO academic_schema.competencia (id, curso_id, nombre, tipo, orden)
  VALUES
    (v_comp1_id, v_curso1_id, 'Resuelve problemas de cantidad',                                  'regular', 1),
    (v_comp2_id, v_curso1_id, 'Resuelve problemas de regularidad, equivalencia y cambio',         'regular', 2),
    (v_comp3_id, v_curso1_id, 'Resuelve problemas de gestión de datos',                          'regular', 3),
    (v_comp4_id, v_curso1_id, 'Resuelve problemas de forma, movimiento y localización',          'regular', 4)
  ON CONFLICT DO NOTHING;

  -- ══════════════════════════════════════════════════════════════
  -- BIMESTRES
  -- ══════════════════════════════════════════════════════════════

  INSERT INTO academic_schema.bimestre (id, periodo_id, numero, nombre, fecha_inicio, fecha_fin, cerrado)
  VALUES
    (v_bim1_id, v_periodo_id, 1, 'I Bimestre', '2026-03-01', '2026-05-31', FALSE),
    (v_bim2_id, v_periodo_id, 2, 'II Bimestre', '2026-06-01', '2026-08-31', FALSE)
  ON CONFLICT DO NOTHING;

  -- ══════════════════════════════════════════════════════════════
  -- ESCALA LITERAL (ANTES DE NOTAS - trigger necesita buscarla)
  -- ══════════════════════════════════════════════════════════════

  INSERT INTO academic_schema.config_escala_literal (periodo_id, escala, rango_inferior, rango_superior)
  VALUES
    (v_periodo_id, 'AD', 18.00, 20.00),
    (v_periodo_id, 'A',  14.00, 17.99),
    (v_periodo_id, 'B',  11.00, 13.99),
    (v_periodo_id, 'C',  0.00,  10.99)
  ON CONFLICT DO NOTHING;

  -- ══════════════════════════════════════════════════════════════
  -- ALUMNOS
  -- ══════════════════════════════════════════════════════════════

  INSERT INTO academic_schema.alumno (
    id, perfil_usuario_id, seccion_id, periodo_id,
    dni, nombres, apellido_paterno, apellido_materno,
    fecha_nacimiento, sexo
  ) VALUES
    (v_alu1_id,  v_perf_alu1,  v_seccion_id, v_periodo_id, '87654321', 'Carlos',    'Mendoza',   'Ramos',     '2009-05-15', 'M'),
    (v_alu2_id,  v_perf_alu2,  v_seccion_id, v_periodo_id, '87654322', 'Adriana',   'Castillo',  'Puma',      '2009-03-20', 'F'),
    (v_alu3_id,  v_perf_alu3,  v_seccion_id, v_periodo_id, '87654323', 'Benjamín',  'Cruz',      'Torres',    '2009-07-10', 'M'),
    (v_alu4_id,  v_perf_alu4,  v_seccion_id, v_periodo_id, '87654324', 'Diana',     'Flores',    'Ccari',     '2009-11-05', 'F'),
    (v_alu5_id,  v_perf_alu5,  v_seccion_id, v_periodo_id, '87654325', 'Eduardo',   'Quispe',    'Lima',      '2009-02-14', 'M'),
    (v_alu6_id,  v_perf_alu6,  v_seccion_id, v_periodo_id, '87654326', 'Fernanda',  'Mamani',    'Condori',   '2009-08-22', 'F'),
    (v_alu7_id,  v_perf_alu7,  v_seccion_id, v_periodo_id, '87654327', 'Gabriel',   'Herrera',   'Apaza',     '2009-04-18', 'M'),
    (v_alu8_id,  v_perf_alu8,  v_seccion_id, v_periodo_id, '87654328', 'Hilda',     'Lazo',      'Vilca',     '2009-09-25', 'F'),
    (v_alu9_id,  v_perf_alu9,  v_seccion_id, v_periodo_id, '87654329', 'Iván',      'Paredes',   'Salas',     '2009-06-30', 'M'),
    (v_alu10_id, v_perf_alu10, v_seccion_id, v_periodo_id, '87654330', 'Juliana',   'Ramos',     'Pacori',    '2009-12-08', 'F'),
    (v_alu11_id, v_perf_alu11, v_seccion_id, v_periodo_id, '87654331', 'Kevin',     'Salinas',   'Huanca',    '2009-01-12', 'M'),
    (v_alu12_id, v_perf_alu12, v_seccion_id, v_periodo_id, '87654332', 'Luciana',   'Vargas',    'Cano',      '2009-10-19', 'F')
  ON CONFLICT DO NOTHING;

  -- ══════════════════════════════════════════════════════════════
  -- ASIGNACIONES DOCENTE-CURSO
  -- ══════════════════════════════════════════════════════════════

  INSERT INTO academic_schema.asignacion_docente (
    id, docente_id, curso_id, seccion_id, periodo_id
  ) VALUES
    (v_asign1_id, v_doc1_id, v_curso1_id, v_seccion_id, v_periodo_id),
    (v_asign2_id, v_doc2_id, v_curso2_id, v_seccion_id, v_periodo_id),
    (v_asign3_id, v_doc3_id, v_curso3_id, v_seccion_id, v_periodo_id),
    (v_asign4_id, v_doc4_id, v_curso4_id, v_seccion_id, v_periodo_id),
    (v_asign5_id, v_doc5_id, v_curso5_id, v_seccion_id, v_periodo_id),
    (v_asign6_id, v_doc6_id, v_curso6_id, v_seccion_id, v_periodo_id),
    (v_asign7_id, v_doc7_id, v_curso7_id, v_seccion_id, v_periodo_id),
    (v_asign8_id, v_doc1_id, v_curso8_id, v_seccion_id, v_periodo_id)
  ON CONFLICT DO NOTHING;

  -- ══════════════════════════════════════════════════════════════
  -- NOTAS (STUDENT_GRADES)
  -- ══════════════════════════════════════════════════════════════

  INSERT INTO academic_schema.nota (
    alumno_id, competencia_id, bimestre_id, docente_id,
    nota_vigesimal, nota_literal, tipo_evaluacion
  ) VALUES
    (v_alu1_id,  v_comp1_id, v_bim1_id, v_doc1_id, 16, 'A', 'Final'),
    (v_alu1_id,  v_comp2_id, v_bim1_id, v_doc1_id, 15, 'A', 'Final'),
    (v_alu2_id,  v_comp1_id, v_bim1_id, v_doc1_id, 18, 'A', 'Final'),
    (v_alu2_id,  v_comp2_id, v_bim1_id, v_doc1_id, 17, 'A', 'Final'),
    (v_alu3_id,  v_comp1_id, v_bim1_id, v_doc1_id, 14, 'A', 'Final'),
    (v_alu3_id,  v_comp2_id, v_bim1_id, v_doc1_id, 13, 'B', 'Final'),
    (v_alu4_id,  v_comp1_id, v_bim1_id, v_doc1_id, 12, 'B', 'Final'),
    (v_alu4_id,  v_comp2_id, v_bim1_id, v_doc1_id, 11, 'B', 'Final'),
    (v_alu5_id,  v_comp1_id, v_bim1_id, v_doc1_id, 20, 'AD', 'Final'),
    (v_alu5_id,  v_comp2_id, v_bim1_id, v_doc1_id, 19, 'A', 'Final'),
    (v_alu6_id,  v_comp1_id, v_bim1_id, v_doc1_id, 13, 'B', 'Final'),
    (v_alu6_id,  v_comp2_id, v_bim1_id, v_doc1_id, 14, 'A', 'Final'),
    (v_alu7_id,  v_comp1_id, v_bim1_id, v_doc1_id, 10, 'B', 'Final'),
    (v_alu7_id,  v_comp2_id, v_bim1_id, v_doc1_id, 11, 'B', 'Final'),
    (v_alu8_id,  v_comp1_id, v_bim1_id, v_doc1_id, 17, 'A', 'Final'),
    (v_alu8_id,  v_comp2_id, v_bim1_id, v_doc1_id, 16, 'A', 'Final'),
    (v_alu9_id,  v_comp1_id, v_bim1_id, v_doc1_id, 15, 'A', 'Final'),
    (v_alu9_id,  v_comp2_id, v_bim1_id, v_doc1_id, 14, 'A', 'Final'),
    (v_alu10_id, v_comp1_id, v_bim1_id, v_doc1_id, 15, 'A', 'Final'),
    (v_alu10_id, v_comp2_id, v_bim1_id, v_doc1_id, 14, 'A', 'Final'),
    (v_alu11_id, v_comp1_id, v_bim1_id, v_doc1_id, 11, 'B', 'Final'),
    (v_alu11_id, v_comp2_id, v_bim1_id, v_doc1_id, 10, 'B', 'Final'),
    (v_alu12_id, v_comp1_id, v_bim1_id, v_doc1_id, 19, 'A', 'Final'),
    (v_alu12_id, v_comp2_id, v_bim1_id, v_doc1_id, 18, 'A', 'Final')
  ON CONFLICT DO NOTHING;

  -- ══════════════════════════════════════════════════════════════
  -- CONCEPTO DE PAGO Y PAGOS MENSUALES
  -- ══════════════════════════════════════════════════════════════

  INSERT INTO financial_schema.concepto_pago (id, nombre, monto_base)
  VALUES (v_concepto_id, 'Pensión Mensual', 350.00)
  ON CONFLICT DO NOTHING;

  -- Insertar pagos mensuales para el alumno principal (Carlos Mendoza)
  INSERT INTO financial_schema.pago (
    alumno_id, concepto_id, periodo_id, mes, monto,
    estado, fecha_vencimiento, fecha_pago, generado_por
  ) VALUES
    (v_alu1_id, v_concepto_id, v_periodo_id, 1, 350.00, 'Pagado', '2026-01-31', '2026-01-05', v_perf_admin),
    (v_alu1_id, v_concepto_id, v_periodo_id, 2, 350.00, 'Pagado', '2026-02-28', '2026-02-03', v_perf_admin),
    (v_alu1_id, v_concepto_id, v_periodo_id, 3, 350.00, 'Pagado', '2026-03-31', '2026-03-07', v_perf_admin),
    (v_alu1_id, v_concepto_id, v_periodo_id, 4, 350.00, 'Pagado', '2026-04-30', '2026-04-04', v_perf_admin),
    (v_alu1_id, v_concepto_id, v_periodo_id, 5, 350.00, 'Pendiente', '2026-05-31', NULL, v_perf_admin),
    (v_alu1_id, v_concepto_id, v_periodo_id, 6, 350.00, 'Pendiente', '2026-06-30', NULL, v_perf_admin),
    (v_alu1_id, v_concepto_id, v_periodo_id, 7, 350.00, 'Pendiente', '2026-07-31', NULL, v_perf_admin),
    (v_alu1_id, v_concepto_id, v_periodo_id, 8, 350.00, 'Pendiente', '2026-08-31', NULL, v_perf_admin),
    (v_alu1_id, v_concepto_id, v_periodo_id, 9, 350.00, 'Pendiente', '2026-09-30', NULL, v_perf_admin),
    (v_alu1_id, v_concepto_id, v_periodo_id, 10, 350.00, 'Pendiente', '2026-10-31', NULL, v_perf_admin),
    (v_alu1_id, v_concepto_id, v_periodo_id, 11, 350.00, 'Pendiente', '2026-11-30', NULL, v_perf_admin),
    (v_alu1_id, v_concepto_id, v_periodo_id, 12, 350.00, 'Pendiente', '2026-12-31', NULL, v_perf_admin)
  ON CONFLICT DO NOTHING;

  -- Insertar pagos para otros alumnos (muestra variada de estados)
  INSERT INTO financial_schema.pago (
    alumno_id, concepto_id, periodo_id, mes, monto,
    estado, fecha_vencimiento, fecha_pago, generado_por
  ) VALUES
    (v_alu2_id, v_concepto_id, v_periodo_id, 1, 350.00, 'Pagado', '2026-01-31', '2026-01-08', v_perf_admin),
    (v_alu2_id, v_concepto_id, v_periodo_id, 2, 350.00, 'Pagado', '2026-02-28', '2026-02-05', v_perf_admin),
    (v_alu2_id, v_concepto_id, v_periodo_id, 3, 350.00, 'Pagado', '2026-03-31', '2026-03-10', v_perf_admin),
    (v_alu2_id, v_concepto_id, v_periodo_id, 4, 350.00, 'Pendiente', '2026-04-30', NULL, v_perf_admin),
    (v_alu5_id, v_concepto_id, v_periodo_id, 1, 350.00, 'Pagado', '2026-01-31', '2026-01-02', v_perf_admin),
    (v_alu5_id, v_concepto_id, v_periodo_id, 2, 350.00, 'Pagado', '2026-02-28', '2026-02-01', v_perf_admin),
    (v_alu5_id, v_concepto_id, v_periodo_id, 3, 350.00, 'Pagado', '2026-03-31', '2026-03-05', v_perf_admin),
    (v_alu5_id, v_concepto_id, v_periodo_id, 4, 350.00, 'Pagado', '2026-04-30', '2026-04-10', v_perf_admin),
    (v_alu6_id, v_concepto_id, v_periodo_id, 1, 350.00, 'Pendiente', '2026-01-31', NULL, v_perf_admin),
    (v_alu6_id, v_concepto_id, v_periodo_id, 2, 350.00, 'Pendiente', '2026-02-28', NULL, v_perf_admin)
  ON CONFLICT DO NOTHING;

  -- ══════════════════════════════════════════════════════════════
  -- BOLETAS DE PAGO (PENDING_VOUCHERS - para flujo de revisión)
  -- ══════════════════════════════════════════════════════════════

  WITH pago_ids AS (
    SELECT id, alumno_id FROM financial_schema.pago
    WHERE mes = 5 AND estado = 'Pendiente'
    LIMIT 5
  )
  INSERT INTO financial_schema.boleta_pago (pago_id, url_archivo, nombre_archivo, banco, numero_operacion, estado_revision)
  SELECT
    pago_ids.id,
    'https://sgei.edu.pe/uploads/vouchers/' || pago_ids.alumno_id::TEXT || '_mayo_2026.jpg',
    'comprobante_pago_mayo_2026.jpg',
    'Banco del Perú',
    LPAD((ROW_NUMBER() OVER (ORDER BY pago_ids.id))::TEXT, 10, '0'),
    'En_Revision'::financial_schema.estado_revision_boleta
  FROM pago_ids
  ON CONFLICT DO NOTHING;

  -- ══════════════════════════════════════════════════════════════
  -- HORARIOS (SCHEDULE)
  -- ══════════════════════════════════════════════════════════════

  INSERT INTO academic_schema.horario (asignacion_id, dia_semana, hora_inicio, hora_fin, aula)
  VALUES
    (v_asign1_id, 1, '08:00'::TIME, '09:00'::TIME, 'Aula 301'),
    (v_asign1_id, 3, '08:00'::TIME, '09:00'::TIME, 'Aula 301'),
    (v_asign1_id, 5, '08:00'::TIME, '09:00'::TIME, 'Aula 301'),
    (v_asign2_id, 2, '08:00'::TIME, '09:45'::TIME, 'Aula 301'),
    (v_asign2_id, 4, '08:00'::TIME, '09:45'::TIME, 'Aula 301'),
    (v_asign3_id, 1, '10:00'::TIME, '11:00'::TIME, 'Aula 301'),
    (v_asign3_id, 4, '10:00'::TIME, '11:00'::TIME, 'Aula 301'),
    (v_asign4_id, 2, '11:00'::TIME, '12:00'::TIME, 'Lab. Cien.'),
    (v_asign4_id, 5, '11:00'::TIME, '12:00'::TIME, 'Lab. Cien.'),
    (v_asign5_id, 1, '13:00'::TIME, '14:00'::TIME, 'Aula 101'),
    (v_asign5_id, 3, '13:00'::TIME, '14:00'::TIME, 'Aula 101'),
    (v_asign6_id, 3, '14:00'::TIME, '15:00'::TIME, 'Polideportivo'),
    (v_asign6_id, 5, '14:00'::TIME, '15:00'::TIME, 'Polideportivo'),
    (v_asign7_id, 4, '15:00'::TIME, '16:00'::TIME, 'Aula 205'),
    (v_asign8_id, 2, '15:00'::TIME, '16:00'::TIME, 'Aula 301')
  ON CONFLICT DO NOTHING;

  -- ══════════════════════════════════════════════════════════════
  -- MATERIALES (MATERIALS)
  -- ══════════════════════════════════════════════════════════════

  INSERT INTO academic_schema.material (docente_id, curso_id, seccion_id, titulo, tipo, url)
  VALUES
    (v_doc1_id, v_curso1_id, v_seccion_id, 'Guía de Álgebra — Capítulo 3',               'PDF',    'https://sgei.edu.pe/materials/algebra-cap3.pdf'),
    (v_doc1_id, v_curso1_id, v_seccion_id, 'Ejercicios de Factorización',                'PDF',    'https://sgei.edu.pe/materials/factorizacion.pdf'),
    (v_doc1_id, v_curso1_id, v_seccion_id, 'Video: Ecuaciones cuadráticas (Khan Academy)', 'enlace', 'https://www.khanacademy.org/math/algebra2/quadratics'),
    (v_doc1_id, v_curso1_id, v_seccion_id, 'Formulario de Geometría analítica',          'PDF',    'https://sgei.edu.pe/materials/formulario-geo.pdf'),
    (v_doc2_id, v_curso2_id, v_seccion_id, 'Análisis de textos argumentativos',          'PDF',    'https://sgei.edu.pe/materials/argumentacion.pdf'),
    (v_doc3_id, v_curso3_id, v_seccion_id, 'La Colonia en el Perú — Presentación',       'enlace', 'https://sgei.edu.pe/slides/colonia-peru'),
    (v_doc4_id, v_curso4_id, v_seccion_id, 'Leyes de Newton — Experimentos',             'video',  'https://sgei.edu.pe/videos/newton-leyes')
  ON CONFLICT DO NOTHING;

  -- ══════════════════════════════════════════════════════════════
  -- ACTIVIDADES (ACTIVITIES)
  -- ══════════════════════════════════════════════════════════════

  INSERT INTO academic_schema.actividad (
    docente_id, curso_id, seccion_id, titulo, tipo,
    fecha_asignacion, fecha_limite, puntaje_maximo
  ) VALUES
    (v_doc1_id, v_curso1_id, v_seccion_id, 'Práctica: Sistemas de ecuaciones 2×2', 'practica',   '2026-04-20'::TIMESTAMP, '2026-05-12'::TIMESTAMP, 20),
    (v_doc1_id, v_curso1_id, v_seccion_id, 'Tarea: Problemas de aplicación',       'tarea',      '2026-04-15'::TIMESTAMP, '2026-05-05'::TIMESTAMP, 20),
    (v_doc1_id, v_curso1_id, v_seccion_id, 'Práctica calificada N° 2',             'evaluacion', '2026-04-10'::TIMESTAMP, '2026-04-28'::TIMESTAMP, 20),
    (v_doc1_id, v_curso1_id, v_seccion_id, 'Proyecto: Maqueta geométrica',         'proyecto',   '2026-04-25'::TIMESTAMP, '2026-05-20'::TIMESTAMP, 20),
    (v_doc2_id, v_curso2_id, v_seccion_id, 'Ensayo argumentativo',                 'tarea',      '2026-04-22'::TIMESTAMP, '2026-05-15'::TIMESTAMP, 20),
    (v_doc3_id, v_curso3_id, v_seccion_id, 'Mapa conceptual: Historia colonial',   'tarea',      '2026-04-18'::TIMESTAMP, '2026-05-10'::TIMESTAMP, 20)
  ON CONFLICT DO NOTHING;

  -- ══════════════════════════════════════════════════════════════
  -- ASISTENCIA DOCENTE (TEACHER_ATTENDANCE)
  -- ══════════════════════════════════════════════════════════════

  INSERT INTO academic_schema.asistencia_docente (docente_id, registrado_por, fecha, estado)
  VALUES
    (v_doc1_id, v_perf_admin, '2026-05-16'::DATE, 'P'),
    (v_doc2_id, v_perf_admin, '2026-05-16'::DATE, 'P'),
    (v_doc3_id, v_perf_admin, '2026-05-16'::DATE, 'T'),
    (v_doc4_id, v_perf_admin, '2026-05-16'::DATE, 'F'),
    (v_doc5_id, v_perf_admin, '2026-05-16'::DATE, 'P'),
    (v_doc6_id, v_perf_admin, '2026-05-16'::DATE, 'P'),
    (v_doc7_id, v_perf_admin, '2026-05-16'::DATE, 'P')
  ON CONFLICT DO NOTHING;

  -- ══════════════════════════════════════════════════════════════
  -- INSTITUCIÓN EDUCATIVA (Metadatos)
  -- ══════════════════════════════════════════════════════════════

  INSERT INTO academic_schema.institucion_educativa (
    nombre, codigo_modular, codigo_ugel, nombre_ugel,
    departamento, provincia, distrito, direccion,
    telefono, email_institucional, gestion
  ) VALUES (
    'IEP Virgen del Carmen - Las Viñas', '000001', 'UGEL-4', 'UGEL Lima Este',
    'Lima', 'Lima', 'San Luis', 'Av. Principal 123, San Luis, Lima',
    '+51-1-5551234', 'contacto@virgendelcarmen.edu.pe', 'Privada'
  )
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '========== SEED COMPLETADO ==========';
  RAISE NOTICE 'Identidad: 1 Admin + 1 Secretaria + 7 Docentes + 1 Alumno (acceso)';
  RAISE NOTICE 'Academia: 12 Alumnos | 3° Secundaria | Sección A | Período 2026';
  RAISE NOTICE 'Currículum: 8 Cursos | 4 Competencias | 2 Bimestres | Escala AD/A/B/C';
  RAISE NOTICE 'Evaluación: 24 Notas (I Bimestre)';
  RAISE NOTICE 'Horarios: 15 bloques (Lun–Sáb, 08:00–16:00)';
  RAISE NOTICE 'Docencia: 7 Materiales + 6 Actividades + Asistencia (5 mayo)';
  RAISE NOTICE 'Finanzas: Pensión 350.00 | 22 Pagos (variedad de estados)';
  RAISE NOTICE '';
  RAISE NOTICE 'Credencial test (Alumno): carlos.mendoza@sgei.edu.pe / demo1234';
  RAISE NOTICE 'Credencial test (Docente): ana.garcia@sgei.edu.pe / demo1234';
  RAISE NOTICE 'Credencial test (Admin): director@sgei.edu.pe / demo1234';
END $$;

-- Re-enable all triggers after seed
SET session_replication_role = default;
