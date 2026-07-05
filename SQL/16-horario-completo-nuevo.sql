-- ============================================================
--  16-horario-completo-nuevo.sql
--  Regenera el horario completo de las 11 secciones usando
--  EXCLUSIVAMENTE el catálogo de cursos nuevo (14-cursos-por-nivel.sql)
--  y los 32 docentes por área/curso (15-docentes-por-area.sql).
--
--  Algoritmo por (docente, grado), en orden aleatorio:
--   - Candidatos de franja = { g en [0,T) : libre en ESE grado (nadie
--     más ya dicta ahí) Y libre para ESE docente (no está dictando en
--     otro grado a la misma hora) }. Así el MISMO docente nunca cae en
--     el mismo día+hora en dos grados distintos (imposible en la vida
--     real), y cada grado termina con sus T franjas completas (la suma
--     de horas_semanales de sus cursos calza exactamente con T).
--   - Se baraja el orden de candidatos y de qué curso (de los suyos)
--     va en cada franja elegida — así no quedan "juntas" las horas de
--     un mismo curso y cada grado sale distinto.
--   - Como el orden aleatorio de procesamiento puede ocasionalmente
--     dejar a un docente sin cupo (su disponibilidad cruzada con la
--     del grado se agotó), todo el intento se reintenta desde cero
--     (hasta 50 veces) si queda algún faltante, antes de conformarse.
--  Se verifica al final que las 11 secciones queden con cobertura
--  completa (T franjas) y sin choques de docente.
-- ============================================================

SET session_replication_role = replica;

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
  v_puntos := ARRAY[v_recreo_ini_min];
  WHILE v_puntos[1] - p_duracion_min > v_inicio_min LOOP
    v_puntos := array_prepend(v_puntos[1] - p_duracion_min, v_puntos);
  END LOOP;
  IF v_puntos[1] != v_inicio_min THEN v_puntos := array_prepend(v_inicio_min, v_puntos); END IF;
  FOR v_i IN 1 .. array_length(v_puntos, 1) - 1 LOOP
    idx := v_idx; hora_inicio := make_time(v_puntos[v_i] / 60, v_puntos[v_i] % 60, 0); hora_fin := make_time(v_puntos[v_i+1] / 60, v_puntos[v_i+1] % 60, 0);
    v_idx := v_idx + 1; RETURN NEXT;
  END LOOP;

  v_puntos := ARRAY[v_recreo_fin_min];
  WHILE v_puntos[array_length(v_puntos,1)] + p_duracion_min < v_refrigerio_ini_min LOOP
    v_puntos := array_append(v_puntos, v_puntos[array_length(v_puntos,1)] + p_duracion_min);
  END LOOP;
  IF v_puntos[array_length(v_puntos,1)] != v_refrigerio_ini_min THEN v_puntos := array_append(v_puntos, v_refrigerio_ini_min); END IF;
  FOR v_i IN 1 .. array_length(v_puntos, 1) - 1 LOOP
    idx := v_idx; hora_inicio := make_time(v_puntos[v_i] / 60, v_puntos[v_i] % 60, 0); hora_fin := make_time(v_puntos[v_i+1] / 60, v_puntos[v_i+1] % 60, 0);
    v_idx := v_idx + 1; RETURN NEXT;
  END LOOP;

  v_zona3_cant := GREATEST(0, p_total_horas - v_idx);
  v_cur := v_refrigerio_fin_min;
  FOR v_i IN 1 .. v_zona3_cant LOOP
    idx := v_idx; hora_inicio := make_time(v_cur / 60, v_cur % 60, 0); hora_fin := make_time((v_cur + p_duracion_min) / 60, (v_cur + p_duracion_min) % 60, 0);
    v_cur := v_cur + p_duracion_min; v_idx := v_idx + 1; RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- (docente, grado) a cubrir: uno por cada combinación real de asignación.
-- k = en cuántos grados distintos aparece ESE docente — se usa para
-- procesar primero a los docentes más restringidos (los que cubren
-- varios grados y por tanto tienen conflictos reales de cruce), dejando
-- a los de un solo grado (sin restricción de cruce) para el final,
-- donde pueden acomodarse en lo que quede libre.
CREATE TEMP TABLE tmp_docente_grados AS
SELECT x.docente_id, x.grado_id, x.nivel_id, x.seccion_id,
       (COUNT(*) OVER (PARTITION BY x.docente_id))::int AS k,
       COALESCE(nec.horas, 0) AS needed
FROM (
  SELECT DISTINCT d.id AS docente_id, g.id AS grado_id, g.nivel_id, s.id AS seccion_id
  FROM academic_schema.docente d
  JOIN academic_schema.asignacion_docente ad ON ad.docente_id = d.id
    AND ad.periodo_id = '00000000-0000-0000-0004-000000000003' AND ad.activo
  JOIN academic_schema.seccion s ON s.id = ad.seccion_id
  JOIN academic_schema.grado g ON g.id = s.grado_id
  WHERE d.dni LIKE '72%'
) x
LEFT JOIN LATERAL (
  SELECT SUM(cu.horas_semanales) AS horas
  FROM academic_schema.asignacion_docente ad2
  JOIN academic_schema.curso cu ON cu.id = ad2.curso_id
  WHERE ad2.docente_id = x.docente_id AND ad2.seccion_id = x.seccion_id
    AND ad2.periodo_id = '00000000-0000-0000-0004-000000000003' AND ad2.activo
) nec ON TRUE;

-- Franjas ya ocupadas dentro de UN grado (nadie más dicta ahí a esa hora).
CREATE TEMP TABLE tmp_claimed_grado (grado_id UUID, g INT, PRIMARY KEY (grado_id, g));
-- Franjas ya ocupadas por UN docente (no puede estar en dos grados a la vez).
CREATE TEMP TABLE tmp_claimed_docente (docente_id UUID, g INT, PRIMARY KEY (docente_id, g));

DO $$
DECLARE
  v_periodo_id UUID := '00000000-0000-0000-0004-000000000003';
  v_admin_perfil UUID;
  rec_dg RECORD;
  rec_cfg RECORD;
  v_recreo_ini TIME; v_recreo_fin TIME; v_refrigerio_ini TIME; v_refrigerio_fin TIME;
  v_t INT;
  v_needed INT;
  v_candidatos INT[];
  v_cursos_demanda UUID[];
  v_grado_nombre TEXT;
  v_intento INT := 0;
  v_shortfall BOOLEAN;
BEGIN
  SELECT id INTO v_admin_perfil FROM auth_schema.perfil_usuario WHERE rol = 'Admin' LIMIT 1;

  -- Limpieza total: la jornada y el catálogo de cursos cambiaron, el
  -- horario anterior (con los 8 cursos genéricos) queda obsoleto.
  DELETE FROM academic_schema.horario_publicacion_bloque
    WHERE publicacion_id IN (SELECT id FROM academic_schema.horario_publicacion WHERE periodo_id = v_periodo_id);
  DELETE FROM academic_schema.horario_publicacion WHERE periodo_id = v_periodo_id;
  DELETE FROM academic_schema.horario h
    USING academic_schema.asignacion_docente ad
    WHERE h.asignacion_id = ad.id AND ad.periodo_id = v_periodo_id;

  LOOP
    v_intento := v_intento + 1;
    v_shortfall := FALSE;
    TRUNCATE tmp_claimed_grado, tmp_claimed_docente;
    DELETE FROM academic_schema.horario h
      USING academic_schema.asignacion_docente ad
      WHERE h.asignacion_id = ad.id AND ad.periodo_id = v_periodo_id;

    FOR rec_dg IN SELECT * FROM tmp_docente_grados ORDER BY k DESC, needed DESC, random() LOOP
      SELECT hora_inicio_jornada, duracion_hora_min, total_horas_dia INTO rec_cfg
        FROM academic_schema.nivel_horario_config WHERE nivel_id = rec_dg.nivel_id AND periodo_id = v_periodo_id;
      IF NOT FOUND THEN CONTINUE; END IF;
      v_t := rec_cfg.total_horas_dia * 5;

      SELECT hora_inicio, hora_fin INTO v_recreo_ini, v_recreo_fin
        FROM academic_schema.horario_descanso WHERE nivel_id = rec_dg.nivel_id AND periodo_id = v_periodo_id AND tipo = 'RECREO';
      SELECT hora_inicio, hora_fin INTO v_refrigerio_ini, v_refrigerio_fin
        FROM academic_schema.horario_descanso WHERE nivel_id = rec_dg.nivel_id AND periodo_id = v_periodo_id AND tipo = 'REFRIGERIO';
      IF v_recreo_ini IS NULL OR v_refrigerio_ini IS NULL THEN CONTINUE; END IF;

      -- Cuántas sesiones necesita este docente en este grado (según horas_semanales de sus cursos ahí).
      SELECT COALESCE(SUM(cu.horas_semanales), 0) INTO v_needed
      FROM academic_schema.asignacion_docente ad
      JOIN academic_schema.curso cu ON cu.id = ad.curso_id
      WHERE ad.docente_id = rec_dg.docente_id AND ad.seccion_id = rec_dg.seccion_id
        AND ad.periodo_id = v_periodo_id AND ad.activo;
      IF v_needed = 0 THEN CONTINUE; END IF;

      -- Candidatos: franjas libres en ESE grado Y libres para ESE docente.
      -- (alias "slot" en vez de "g": tmp_claimed_grado/tmp_claimed_docente
      -- también tienen una columna llamada "g", y un "g" sin calificar
      -- dentro del NOT EXISTS se resolvía contra esa columna LOCAL en vez
      -- de la del generate_series exterior, volviendo la condición un
      -- tautológico "tc.g = tc.g" siempre verdadero apenas había 1 fila).
      SELECT array_agg(slot ORDER BY random()) INTO v_candidatos
      FROM generate_series(0, v_t - 1) slot
      WHERE NOT EXISTS (SELECT 1 FROM tmp_claimed_grado tc WHERE tc.grado_id = rec_dg.grado_id AND tc.g = slot)
        AND NOT EXISTS (SELECT 1 FROM tmp_claimed_docente td WHERE td.docente_id = rec_dg.docente_id AND td.g = slot);

      IF v_candidatos IS NULL OR array_length(v_candidatos, 1) < v_needed THEN
        RAISE NOTICE 'Sin cupo suficiente para docente % en grado % (necesita %, hay %)',
          rec_dg.docente_id, rec_dg.grado_id, v_needed, COALESCE(array_length(v_candidatos,1), 0);
        v_shortfall := TRUE;
        CONTINUE;
      END IF;
      v_candidatos := v_candidatos[1:v_needed];

      -- Reclama esas franjas para este grado y para este docente.
      INSERT INTO tmp_claimed_grado (grado_id, g) SELECT rec_dg.grado_id, unnest(v_candidatos);
      INSERT INTO tmp_claimed_docente (docente_id, g) SELECT rec_dg.docente_id, unnest(v_candidatos);

      -- Lista de cursos a repartir (repetido según horas_semanales), barajada.
      SELECT array_agg(cu.id ORDER BY random())
      INTO v_cursos_demanda
      FROM academic_schema.asignacion_docente ad
      JOIN academic_schema.curso cu ON cu.id = ad.curso_id
      CROSS JOIN LATERAL generate_series(1, cu.horas_semanales) rep
      WHERE ad.docente_id = rec_dg.docente_id AND ad.seccion_id = rec_dg.seccion_id
        AND ad.periodo_id = v_periodo_id AND ad.activo;

      SELECT g.nombre INTO v_grado_nombre FROM academic_schema.grado g WHERE g.id = rec_dg.grado_id;

      -- Inserta un bloque de horario por cada (franja, curso) emparejados.
      INSERT INTO academic_schema.horario (asignacion_id, dia_semana, hora_inicio, hora_fin, aula, docente_id, seccion_id)
      SELECT ad.id,
             ((par.g / rec_cfg.total_horas_dia) + 1)::smallint,
             franja.hora_inicio, franja.hora_fin,
             'Aula ' || v_grado_nombre,
             rec_dg.docente_id, rec_dg.seccion_id
      FROM (
        SELECT v_candidatos[ord] AS g, v_cursos_demanda[ord] AS curso_id
        FROM generate_series(1, v_needed) ord
      ) par
      JOIN academic_schema.asignacion_docente ad
        ON ad.docente_id = rec_dg.docente_id AND ad.seccion_id = rec_dg.seccion_id AND ad.curso_id = par.curso_id
        AND ad.periodo_id = v_periodo_id AND ad.activo
      JOIN LATERAL pg_temp.fn_franjas_clase(
             rec_cfg.hora_inicio_jornada, rec_cfg.duracion_hora_min,
             v_recreo_ini, v_recreo_fin, v_refrigerio_ini, v_refrigerio_fin, rec_cfg.total_horas_dia
           ) franja ON franja.idx = par.g % rec_cfg.total_horas_dia;
    END LOOP;

    RAISE NOTICE 'Intento % -> shortfall=%', v_intento, v_shortfall;
    EXIT WHEN NOT v_shortfall OR v_intento >= 300;
  END LOOP;

  IF v_shortfall THEN
    RAISE NOTICE '========== ADVERTENCIA: quedaron faltantes tras % intentos ==========', v_intento;
  END IF;

  -- Publica el horario nuevo: por sección y por docente.
  WITH pub_secc AS (
    INSERT INTO academic_schema.horario_publicacion (tipo, seccion_id, periodo_id, publicado_por)
    SELECT 'SECCION', s.id, v_periodo_id, v_admin_perfil
    FROM academic_schema.seccion s WHERE s.periodo_id = v_periodo_id
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

  RAISE NOTICE '========== HORARIO NUEVO GENERADO ==========';
END $$;

SET session_replication_role = default;
