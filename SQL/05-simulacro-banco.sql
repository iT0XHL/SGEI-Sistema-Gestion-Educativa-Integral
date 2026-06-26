-- ============================================================
--  05-simulacro-banco.sql — Banco de preguntas persistente
--  · simulacro_pregunta deja de depender de un simulacro: pasa a ser un
--    BANCO (los docentes cargan en cualquier momento; simulacro_id IS NULL).
--  · simulacro_examen_pregunta guarda un SNAPSHOT del contenido, de modo que
--    el examen armado es un documento inmutable que no se rompe si luego el
--    docente edita o borra la pregunta del banco.
--  Idempotente (re-ejecutable): usa DROP NOT NULL, IF EXISTS / IF NOT EXISTS
--  y el patrón drop-then-add para las FK.
-- ============================================================

-- 1) Banco persistente: simulacro_id NULLABLE + FK ON DELETE SET NULL.
ALTER TABLE academic_schema.simulacro_pregunta
  ALTER COLUMN simulacro_id DROP NOT NULL;

ALTER TABLE academic_schema.simulacro_pregunta
  DROP CONSTRAINT IF EXISTS simulacro_pregunta_simulacro_id_fkey;
ALTER TABLE academic_schema.simulacro_pregunta
  ADD CONSTRAINT simulacro_pregunta_simulacro_id_fkey
  FOREIGN KEY (simulacro_id) REFERENCES academic_schema.simulacro(id) ON DELETE SET NULL;

-- 2) Preguntas existentes pasan al banco (se desligan de su simulacro).
UPDATE academic_schema.simulacro_pregunta
  SET simulacro_id = NULL
  WHERE simulacro_id IS NOT NULL;

-- 3) Índice del banco por (grado, curso) para la curaduría del Admin.
CREATE INDEX IF NOT EXISTS idx_sim_pregunta_banco
  ON academic_schema.simulacro_pregunta (grado_id, curso_id);

-- 4) Examen = documento congelado: snapshot del contenido de cada pregunta.
ALTER TABLE academic_schema.simulacro_examen_pregunta
  ADD COLUMN IF NOT EXISTS enunciado          TEXT,
  ADD COLUMN IF NOT EXISTS imagen_url         TEXT,
  ADD COLUMN IF NOT EXISTS alt_a              TEXT,
  ADD COLUMN IF NOT EXISTS alt_b              TEXT,
  ADD COLUMN IF NOT EXISTS alt_c              TEXT,
  ADD COLUMN IF NOT EXISTS alt_d              TEXT,
  ADD COLUMN IF NOT EXISTS alt_e              TEXT,
  ADD COLUMN IF NOT EXISTS respuesta_correcta CHAR(1);

-- pregunta_id pasa a referencia blanda (NULLABLE + SET NULL): si la pregunta
-- del banco se borra, el snapshot del examen permanece intacto.
ALTER TABLE academic_schema.simulacro_examen_pregunta
  ALTER COLUMN pregunta_id DROP NOT NULL;

ALTER TABLE academic_schema.simulacro_examen_pregunta
  DROP CONSTRAINT IF EXISTS simulacro_examen_pregunta_pregunta_id_fkey;
ALTER TABLE academic_schema.simulacro_examen_pregunta
  ADD CONSTRAINT simulacro_examen_pregunta_pregunta_id_fkey
  FOREIGN KEY (pregunta_id) REFERENCES academic_schema.simulacro_pregunta(id) ON DELETE SET NULL;
