-- ============================================================
--  11-nivel-horario-config.sql
--  Jornada escolar configurable por nivel: hora de inicio de la
--  jornada y duración (en minutos) de una "hora escolar". Los
--  bloques de horario se generan por suma sucesiva desde
--  hora_inicio_jornada; el Recreo/Refrigerio (horario_descanso)
--  actúan como anclas fijas que reinician la suma desde su fin.
--  Aditivo: no toca horario/horario_descanso existentes.
-- ============================================================

CREATE TABLE IF NOT EXISTS academic_schema.nivel_horario_config (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nivel_id            UUID NOT NULL REFERENCES academic_schema.nivel(id) ON DELETE CASCADE,
  periodo_id          UUID NOT NULL REFERENCES academic_schema.periodo_academico(id) ON DELETE CASCADE,
  hora_inicio_jornada TIME NOT NULL DEFAULT '07:30',
  duracion_hora_min   SMALLINT NOT NULL DEFAULT 50 CHECK (duracion_hora_min BETWEEN 20 AND 180),
  UNIQUE (nivel_id, periodo_id)
);

-- Defaults para que la función quede operativa de inmediato: 07:30,
-- 50 min, para cada nivel existente en el período activo.
INSERT INTO academic_schema.nivel_horario_config (nivel_id, periodo_id, hora_inicio_jornada, duracion_hora_min)
SELECT n.id, p.id, '07:30', 50
FROM academic_schema.nivel n
CROSS JOIN academic_schema.periodo_academico p
WHERE p.activo = TRUE
ON CONFLICT (nivel_id, periodo_id) DO NOTHING;
