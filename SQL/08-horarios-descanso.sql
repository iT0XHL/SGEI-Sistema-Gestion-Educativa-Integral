-- ============================================================
--  08-horarios-descanso.sql — Recreo y Refrigerio/Almuerzo
--  Configuración de descansos por Nivel, igual para Docentes y
--  Alumnos, mismo horario Lunes-Viernes. Sin relación con
--  docente_id/seccion_id a propósito: no es un bloque de clase,
--  por lo tanto NO participa de las EXCLUDE constraints ni del
--  trigger de cruces de academic_schema.horario.
--  Sin flujo de publicación (a diferencia de horario_publicacion):
--  se sirve siempre en vivo, upsert por (nivel_id, periodo_id, tipo).
-- ============================================================

CREATE TABLE IF NOT EXISTS academic_schema.horario_descanso (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    nivel_id    UUID        NOT NULL REFERENCES academic_schema.nivel(id) ON DELETE CASCADE,
    periodo_id  UUID        NOT NULL REFERENCES academic_schema.periodo_academico(id) ON DELETE CASCADE,
    tipo        VARCHAR(12) NOT NULL CHECK (tipo IN ('RECREO', 'REFRIGERIO')),
    hora_inicio TIME        NOT NULL,
    hora_fin    TIME        NOT NULL CHECK (hora_fin > hora_inicio),
    UNIQUE (nivel_id, periodo_id, tipo)
);

COMMENT ON TABLE academic_schema.horario_descanso IS 'Recreo y Refrigerio/Almuerzo por Nivel y período, mismo horario Lun-Vie para Docentes y Alumnos. Sin historial: upsert por (nivel_id, periodo_id, tipo).';

CREATE INDEX IF NOT EXISTS idx_horario_descanso_nivel_periodo
  ON academic_schema.horario_descanso(nivel_id, periodo_id);
