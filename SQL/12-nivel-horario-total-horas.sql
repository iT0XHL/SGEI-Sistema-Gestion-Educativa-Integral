-- ============================================================
--  12-nivel-horario-total-horas.sql
--  Agrega total_horas_dia a nivel_horario_config: cuántos bloques
--  de clase tiene el día completo (usado por el motor de 3 zonas
--  de backend/lib/horario-slots.ts para saber cuántos bloques van
--  después del Refrigerio). Aditivo — no toca filas existentes
--  más allá de asignarles el default.
-- ============================================================

ALTER TABLE academic_schema.nivel_horario_config
  ADD COLUMN IF NOT EXISTS total_horas_dia SMALLINT NOT NULL DEFAULT 8 CHECK (total_horas_dia BETWEEN 1 AND 20);
