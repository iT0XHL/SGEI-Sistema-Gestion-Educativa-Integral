-- ============================================================
--  06-grados-niveles.sql — Seed: Primaria + todos los grados
--  · Crea nivel Primaria y sus 6 grados (1°–6°)
--  · Crea grados faltantes de Secundaria (1°,2°,4°,5°)
--  · Crea sección "A" para cada grado
--  · Asigna todos los cursos a cada grado vía grado_curso
--  · Crea bimestres III y IV si no existen
--  Idempotente: usa ON CONFLICT DO NOTHING.
-- ============================================================
SET session_replication_role = replica;

DO $$
DECLARE
  -- Referencias a IDs existentes del seed 02
  v_periodo_id   UUID := '00000000-0000-0000-0004-000000000003';

  -- Cursos existentes
  v_curso1_id    UUID := '00000000-0000-0000-0005-000000000001';
  v_curso2_id    UUID := '00000000-0000-0000-0005-000000000002';
  v_curso3_id    UUID := '00000000-0000-0000-0005-000000000003';
  v_curso4_id    UUID := '00000000-0000-0000-0005-000000000004';
  v_curso5_id    UUID := '00000000-0000-0000-0005-000000000005';
  v_curso6_id    UUID := '00000000-0000-0000-0005-000000000006';
  v_curso7_id    UUID := '00000000-0000-0000-0005-000000000007';
  v_curso8_id    UUID := '00000000-0000-0000-0005-000000000008';

  -- Bimestres existentes
  v_bim1_id      UUID := '00000000-0000-0000-0007-000000000001';
  v_bim2_id      UUID := '00000000-0000-0000-0007-000000000002';
  v_bim3_id      UUID := '00000000-0000-0000-0007-000000000003';
  v_bim4_id      UUID := '00000000-0000-0000-0007-000000000004';

  -- Primaria nivel + grados
  v_primaria_id  UUID := '00000000-0000-0000-0004-000000000010';
  v_grado_p1     UUID := '00000000-0000-0000-0004-000000000011';
  v_grado_p2     UUID := '00000000-0000-0000-0004-000000000012';
  v_grado_p3     UUID := '00000000-0000-0000-0004-000000000013';
  v_grado_p4     UUID := '00000000-0000-0000-0004-000000000014';
  v_grado_p5     UUID := '00000000-0000-0000-0004-000000000015';
  v_grado_p6     UUID := '00000000-0000-0000-0004-000000000016';

  -- Secundaria grados faltantes
  v_grado_s1     UUID := '00000000-0000-0000-0004-000000000017';
  v_grado_s2     UUID := '00000000-0000-0000-0004-000000000018';
  v_grado_s4     UUID := '00000000-0000-0000-0004-000000000019';
  v_grado_s5     UUID := '00000000-0000-0000-0004-000000000020';

  -- Secciones (todas "A")
  v_seccion_p1   UUID := '00000000-0000-0000-000A-000000000001';
  v_seccion_p2   UUID := '00000000-0000-0000-000A-000000000002';
  v_seccion_p3   UUID := '00000000-0000-0000-000A-000000000003';
  v_seccion_p4   UUID := '00000000-0000-0000-000A-000000000004';
  v_seccion_p5   UUID := '00000000-0000-0000-000A-000000000005';
  v_seccion_p6   UUID := '00000000-0000-0000-000A-000000000006';
  v_seccion_s1   UUID := '00000000-0000-0000-000A-000000000007';
  v_seccion_s2   UUID := '00000000-0000-0000-000A-000000000008';
  v_seccion_s4   UUID := '00000000-0000-0000-000A-000000000009';
  v_seccion_s5   UUID := '00000000-0000-0000-000A-000000000010';

  v_cursos       UUID[];

BEGIN
  v_cursos := ARRAY[v_curso1_id, v_curso2_id, v_curso3_id, v_curso4_id,
                   v_curso5_id, v_curso6_id, v_curso7_id, v_curso8_id];

  -- ══════════════════════════════════════════════════════════════
  -- NIVEL PRIMARIA
  -- ══════════════════════════════════════════════════════════════
  INSERT INTO academic_schema.nivel (id, nombre, descripcion)
  VALUES (v_primaria_id, 'Primaria', 'Educación Primaria — 1° a 6° grado')
  ON CONFLICT DO NOTHING;

  -- ══════════════════════════════════════════════════════════════
  -- GRADOS DE PRIMARIA (1°–6°)
  -- ══════════════════════════════════════════════════════════════
  INSERT INTO academic_schema.grado (id, nivel_id, nombre, orden)
  VALUES
    (v_grado_p1, v_primaria_id, '1° Primaria', 1),
    (v_grado_p2, v_primaria_id, '2° Primaria', 2),
    (v_grado_p3, v_primaria_id, '3° Primaria', 3),
    (v_grado_p4, v_primaria_id, '4° Primaria', 4),
    (v_grado_p5, v_primaria_id, '5° Primaria', 5),
    (v_grado_p6, v_primaria_id, '6° Primaria', 6)
  ON CONFLICT DO NOTHING;

  -- ══════════════════════════════════════════════════════════════
  -- GRADOS DE SECUNDARIA FALTANTES (1°, 2°, 4°, 5°)
  -- ══════════════════════════════════════════════════════════════
  -- Nota: 3° Secundaria ya existe (id 00000000-0000-0000-0004-000000000002)
  -- bajo el nivel Secundaria (id 00000000-0000-0000-0004-000000000001).
  INSERT INTO academic_schema.grado (id, nivel_id, nombre, orden)
  VALUES
    (v_grado_s1, '00000000-0000-0000-0004-000000000001', '1° Secundaria', 1),
    (v_grado_s2, '00000000-0000-0000-0004-000000000001', '2° Secundaria', 2),
    (v_grado_s4, '00000000-0000-0000-0004-000000000001', '4° Secundaria', 4),
    (v_grado_s5, '00000000-0000-0000-0004-000000000001', '5° Secundaria', 5)
  ON CONFLICT DO NOTHING;

  -- ══════════════════════════════════════════════════════════════
  -- SECCIONES "A" PARA CADA GRADO
  -- ══════════════════════════════════════════════════════════════
  INSERT INTO academic_schema.seccion (id, grado_id, periodo_id, nombre, cupo_maximo)
  VALUES
    (v_seccion_p1, v_grado_p1, v_periodo_id, 'A', 30),
    (v_seccion_p2, v_grado_p2, v_periodo_id, 'A', 30),
    (v_seccion_p3, v_grado_p3, v_periodo_id, 'A', 30),
    (v_seccion_p4, v_grado_p4, v_periodo_id, 'A', 30),
    (v_seccion_p5, v_grado_p5, v_periodo_id, 'A', 30),
    (v_seccion_p6, v_grado_p6, v_periodo_id, 'A', 30),
    (v_seccion_s1, v_grado_s1, v_periodo_id, 'A', 30),
    (v_seccion_s2, v_grado_s2, v_periodo_id, 'A', 30),
    (v_seccion_s4, v_grado_s4, v_periodo_id, 'A', 30),
    (v_seccion_s5, v_grado_s5, v_periodo_id, 'A', 30)
  ON CONFLICT DO NOTHING;

  -- ══════════════════════════════════════════════════════════════
  -- GRADO_CURSO: todos los cursos para cada grado
  -- ══════════════════════════════════════════════════════════════
  -- Primaria
  INSERT INTO academic_schema.grado_curso (grado_id, curso_id)
  SELECT g, c FROM unnest(ARRAY[
    v_grado_p1, v_grado_p2, v_grado_p3, v_grado_p4, v_grado_p5, v_grado_p6,
    v_grado_s1, v_grado_s2,
    '00000000-0000-0000-0004-000000000002'::UUID, -- 3° Secundaria (existente)
    v_grado_s4, v_grado_s5
  ]) g, unnest(v_cursos) c
  ON CONFLICT DO NOTHING;

  -- ══════════════════════════════════════════════════════════════
  -- BIMESTRES III Y IV (si no existen)
  -- ══════════════════════════════════════════════════════════════
  INSERT INTO academic_schema.bimestre (id, periodo_id, numero, nombre, fecha_inicio, fecha_fin, cerrado)
  VALUES
    (v_bim3_id, v_periodo_id, 3, 'III Bimestre', '2025-09-01', '2025-10-31', FALSE),
    (v_bim4_id, v_periodo_id, 4, 'IV Bimestre',  '2025-11-01', '2025-12-15', FALSE)
  ON CONFLICT DO NOTHING;

  -- ══════════════════════════════════════════════════════════════
  -- ASIGNACIONES DOCENTE EN TODOS LOS GRADOS
  -- Para el simulacro (que es por curso+grado que enseña el docente), cada
  -- docente del 3° Secundaria dicta su mismo curso en TODOS los grados, de modo
  -- que pueda aportar 5 preguntas por curso para cualquier grado. Demo: en
  -- producción el administrador asigna a los docentes reales por grado.
  -- ══════════════════════════════════════════════════════════════
  INSERT INTO academic_schema.asignacion_docente (docente_id, curso_id, seccion_id, periodo_id, activo)
  SELECT base.docente_id, base.curso_id, s.id, v_periodo_id, TRUE
  FROM (
    SELECT DISTINCT a.docente_id, a.curso_id
    FROM academic_schema.asignacion_docente a
    JOIN academic_schema.seccion s3 ON s3.id = a.seccion_id
    WHERE s3.grado_id = '00000000-0000-0000-0004-000000000002'  -- 3° Secundaria (seed base)
  ) base
  CROSS JOIN academic_schema.seccion s
  WHERE s.periodo_id = v_periodo_id
  ON CONFLICT (docente_id, seccion_id, curso_id, periodo_id) DO NOTHING;

  RAISE NOTICE '========== GRADOS-NIVELES SEED COMPLETADO ==========';
  RAISE NOTICE 'Nivel Primaria + 6 grados, 4 grados Secundaria, 10 secciones, 11 grado_curso, 2 bimestres, asignaciones en todos los grados';
END $$;

SET session_replication_role = default;
