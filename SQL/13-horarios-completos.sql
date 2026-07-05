-- ============================================================
--  13-horarios-completos.sql
--  Regenera el horario COMPLETO (todos los días, todas las franjas
--  de clase) de las 11 secciones, usando la jornada/Recreo/Refrigerio
--  REALMENTE configurados en nivel_horario_config/horario_descanso
--  (no valores fijos) y el motor de 3 zonas (ver
--  backend/lib/horario-slots.ts) para calcular las franjas de clase.
--
--  Reemplaza los horario/horario_publicacion existentes del período
--  (los borra y los vuelve a generar) — es intencional: la jornada
--  cambió, así que el horario "1 sesión por curso" anterior queda
--  obsoleto. No toca asignacion_docente ni las asignaciones ya
--  existentes, solo agrupa 8 de ellas por sección (1 por curso) y
--  las reparte por toda la semana.
--
--  Anti-colisión entre secciones que comparten un mismo docente
--  especialista (1°,2°,4°,5° Secundaria): se usa un "corrimiento" k
--  distinto por sección (0,1,2,3) sobre el índice global de franja,
--  matemáticamente garantizado sin solape (ver conversación).
--  Primaria y 3° Secundaria no comparten docentes entre secciones,
--  así que no necesitan corrimiento.
-- ============================================================

SET session_replication_role = replica;

-- Función auxiliar: franjas de CLASE (excluye Recreo/Refrigerio) de un
-- nivel, con el mismo algoritmo de 3 zonas que horario-slots.ts.
CREATE OR REPLACE FUNCTION pg_temp.fn_franjas_clase(
  p_hora_inicio TIME, p_duracion_min INT,
  p_recreo_inicio TIME, p_recreo_fin TIME,
  p_refrigerio_inicio TIME, p_refrigerio_fin TIME,
  p_total_horas INT
) RETURNS TABLE(idx INT, hora_inicio TIME, hora_fin TIME) AS $$
DECLARE
  v_recreo_ini_min INT := EXTRACT(HOUR FROM p_recreo_inicio)::INT*60 + EXTRACT(MINUTE FROM p_recreo_inicio)::INT;
  v_recreo_fin_min INT := EXTRACT(HOUR FROM p_recreo_fin)::INT*60 + EXTRACT(MINUTE FROM p_recreo_fin)::INT;
  v_refrigerio_ini_min INT := EXTRACT(HOUR FROM p_refrigerio_inicio)::INT*60 + EXTRACT(MINUTE FROM p_refrigerio_inicio)::INT;
  v_refrigerio_fin_min INT := EXTRACT(HOUR FROM p_refrigerio_fin)::INT*60 + EXTRACT(MINUTE FROM p_refrigerio_fin)::INT;
  v_inicio_min INT := EXTRACT(HOUR FROM p_hora_inicio)::INT*60 + EXTRACT(MINUTE FROM p_hora_inicio)::INT;
  v_puntos INT[];
  v_i INT;
  v_idx INT := 0;
  v_cur INT;
  v_zona3_cant INT;
BEGIN
  -- Zona 1: hacia atrás desde el inicio del Recreo hasta el inicio de jornada.
  v_puntos := ARRAY[v_recreo_ini_min];
  WHILE v_puntos[1] - p_duracion_min > v_inicio_min LOOP
    v_puntos := array_prepend(v_puntos[1] - p_duracion_min, v_puntos);
  END LOOP;
  IF v_puntos[1] != v_inicio_min THEN
    v_puntos := array_prepend(v_inicio_min, v_puntos);
  END IF;
  FOR v_i IN 1 .. array_length(v_puntos, 1) - 1 LOOP
    idx := v_idx; hora_inicio := make_time(v_puntos[v_i] / 60, v_puntos[v_i] % 60, 0); hora_fin := make_time(v_puntos[v_i+1] / 60, v_puntos[v_i+1] % 60, 0);
    v_idx := v_idx + 1;
    RETURN NEXT;
  END LOOP;

  -- Zona 2: hacia adelante desde el fin del Recreo hasta el inicio del Refrigerio.
  v_puntos := ARRAY[v_recreo_fin_min];
  WHILE v_puntos[array_length(v_puntos,1)] + p_duracion_min < v_refrigerio_ini_min LOOP
    v_puntos := array_append(v_puntos, v_puntos[array_length(v_puntos,1)] + p_duracion_min);
  END LOOP;
  IF v_puntos[array_length(v_puntos,1)] != v_refrigerio_ini_min THEN
    v_puntos := array_append(v_puntos, v_refrigerio_ini_min);
  END IF;
  FOR v_i IN 1 .. array_length(v_puntos, 1) - 1 LOOP
    idx := v_idx; hora_inicio := make_time(v_puntos[v_i] / 60, v_puntos[v_i] % 60, 0); hora_fin := make_time(v_puntos[v_i+1] / 60, v_puntos[v_i+1] % 60, 0);
    v_idx := v_idx + 1;
    RETURN NEXT;
  END LOOP;

  -- Zona 3: bloques restantes hasta completar total_horas_dia, desde el fin del Refrigerio.
  v_zona3_cant := GREATEST(0, p_total_horas - v_idx);
  v_cur := v_refrigerio_fin_min;
  FOR v_i IN 1 .. v_zona3_cant LOOP
    idx := v_idx; hora_inicio := make_time(v_cur / 60, v_cur % 60, 0); hora_fin := make_time((v_cur + p_duracion_min) / 60, (v_cur + p_duracion_min) % 60, 0);
    v_cur := v_cur + p_duracion_min;
    v_idx := v_idx + 1;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  v_periodo_id UUID := '00000000-0000-0000-0004-000000000003';
  v_seccion_3sec UUID := '00000000-0000-0000-0004-000000000004';
  v_secciones_especialistas UUID[] := ARRAY[
    '00000000-0000-0000-000a-000000000007'::uuid, -- 1° Secundaria
    '00000000-0000-0000-000a-000000000008'::uuid, -- 2° Secundaria
    '00000000-0000-0000-000a-000000000009'::uuid, -- 4° Secundaria
    '00000000-0000-0000-000a-000000000010'::uuid  -- 5° Secundaria
  ];
  v_admin_perfil UUID;
  rec_seccion RECORD;
  rec_cfg RECORD;
  rec_franja RECORD;
  rec_triple RECORD;
  v_k INT;
  v_dia INT;
  v_g INT;
  v_curso_idx INT;
  v_asignacion_id UUID;
  v_pares_por_curso UUID[8];
  v_pares_curso_id UUID[8];
  v_n INT;
  v_i INT;
BEGIN
  SELECT id INTO v_admin_perfil FROM auth_schema.perfil_usuario WHERE rol = 'Admin' LIMIT 1;

  -- Limpieza: se borra el horario/publicación existente del período —
  -- la jornada cambió, el horario "1 sesión/semana" anterior ya no aplica.
  DELETE FROM academic_schema.horario_publicacion_bloque
    WHERE publicacion_id IN (SELECT id FROM academic_schema.horario_publicacion WHERE periodo_id = v_periodo_id);
  DELETE FROM academic_schema.horario_publicacion WHERE periodo_id = v_periodo_id;
  DELETE FROM academic_schema.horario h
    USING academic_schema.asignacion_docente ad
    WHERE h.asignacion_id = ad.id AND ad.periodo_id = v_periodo_id;

  -- Por cada una de las 11 secciones, arma su horario completo.
  FOR rec_seccion IN
    SELECT s.id AS seccion_id, s.grado_id, g.nivel_id
    FROM academic_schema.seccion s
    JOIN academic_schema.grado g ON g.id = s.grado_id
    WHERE s.periodo_id = v_periodo_id
  LOOP
    -- Config de jornada + descansos del nivel de esta sección.
    SELECT hora_inicio_jornada, duracion_hora_min, total_horas_dia
      INTO rec_cfg
      FROM academic_schema.nivel_horario_config
      WHERE nivel_id = rec_seccion.nivel_id AND periodo_id = v_periodo_id;
    IF NOT FOUND THEN CONTINUE; END IF;

    DECLARE
      v_recreo_ini TIME; v_recreo_fin TIME; v_refrigerio_ini TIME; v_refrigerio_fin TIME;
    BEGIN
      SELECT hora_inicio, hora_fin INTO v_recreo_ini, v_recreo_fin
        FROM academic_schema.horario_descanso WHERE nivel_id = rec_seccion.nivel_id AND periodo_id = v_periodo_id AND tipo = 'RECREO';
      SELECT hora_inicio, hora_fin INTO v_refrigerio_ini, v_refrigerio_fin
        FROM academic_schema.horario_descanso WHERE nivel_id = rec_seccion.nivel_id AND periodo_id = v_periodo_id AND tipo = 'REFRIGERIO';
      IF v_recreo_ini IS NULL OR v_refrigerio_ini IS NULL THEN CONTINUE; END IF;

      -- 8 pares (curso, docente, asignación) de ESTA sección — el DNI
      -- 690% identifica a los docentes nuevos (generalistas/especialistas
      -- del seed grande); 3° Secundaria usa su plantel original (no tiene
      -- docentes 690%).
      v_i := 0;
      FOR rec_triple IN
        SELECT DISTINCT ON (ad.curso_id) ad.id AS asignacion_id, ad.curso_id, ad.docente_id
        FROM academic_schema.asignacion_docente ad
        JOIN academic_schema.docente d ON d.id = ad.docente_id
        WHERE ad.seccion_id = rec_seccion.seccion_id AND ad.periodo_id = v_periodo_id AND ad.activo
          AND (CASE
                 WHEN rec_seccion.seccion_id = v_seccion_3sec THEN d.dni NOT LIKE '690%'
                 WHEN rec_seccion.seccion_id = ANY(v_secciones_especialistas) THEN d.dni LIKE '690%' AND d.especialidad != 'Docente de Aula - Primaria'
                 ELSE d.dni LIKE '690%' AND d.especialidad = 'Docente de Aula - Primaria'
               END)
        ORDER BY ad.curso_id, ad.id
      LOOP
        v_i := v_i + 1;
        v_pares_por_curso[v_i] := rec_triple.asignacion_id;
        EXIT WHEN v_i >= 8;
      END LOOP;
      IF v_i < 8 THEN CONTINUE; END IF; -- sección sin las 8 asignaciones esperadas, se omite

      -- Corrimiento k: 0 para secciones de un solo docente por curso
      -- (Primaria, 3° Secundaria); 0-3 para las 4 secciones que
      -- comparten especialistas (1°,2°,4°,5° Secundaria) — garantiza
      -- que un mismo especialista nunca coincide en día+hora entre ellas.
      v_k := COALESCE(array_position(v_secciones_especialistas, rec_seccion.seccion_id) - 1, 0);

      v_n := rec_cfg.total_horas_dia;

      FOR v_dia IN 1..5 LOOP
        FOR rec_franja IN
          SELECT * FROM pg_temp.fn_franjas_clase(
            rec_cfg.hora_inicio_jornada, rec_cfg.duracion_hora_min,
            v_recreo_ini, v_recreo_fin, v_refrigerio_ini, v_refrigerio_fin, v_n
          )
        LOOP
          v_g := (v_dia - 1) * v_n + rec_franja.idx;
          v_curso_idx := ((v_g + v_k) % 8) + 1;
          v_asignacion_id := v_pares_por_curso[v_curso_idx];

          INSERT INTO academic_schema.horario (asignacion_id, dia_semana, hora_inicio, hora_fin, aula, docente_id, seccion_id)
          SELECT v_asignacion_id, v_dia, rec_franja.hora_inicio, rec_franja.hora_fin,
                 'Aula ' || g.nombre, ad.docente_id, ad.seccion_id
          FROM academic_schema.asignacion_docente ad
          JOIN academic_schema.seccion s ON s.id = ad.seccion_id
          JOIN academic_schema.grado g ON g.id = s.grado_id
          WHERE ad.id = v_asignacion_id;
        END LOOP;
      END LOOP;
    END;
  END LOOP;

  -- Publica automáticamente el horario nuevo de las 11 secciones y de
  -- todos los docentes involucrados.
  WITH pub_secc AS (
    INSERT INTO academic_schema.horario_publicacion (tipo, seccion_id, periodo_id, publicado_por)
    SELECT 'SECCION', s.id, v_periodo_id, v_admin_perfil
    FROM academic_schema.seccion s
    WHERE s.periodo_id = v_periodo_id
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

  WITH pub_doc AS (
    INSERT INTO academic_schema.horario_publicacion (tipo, docente_id, periodo_id, publicado_por)
    SELECT DISTINCT 'DOCENTE', h.docente_id, v_periodo_id, v_admin_perfil
    FROM academic_schema.horario h
    JOIN academic_schema.asignacion_docente ad ON ad.id = h.asignacion_id
    WHERE ad.periodo_id = v_periodo_id
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

  RAISE NOTICE '========== HORARIOS COMPLETOS REGENERADOS ==========';
END $$;

SET session_replication_role = default;
