-- ============================================================
--  09-competencia-grado.sql
--  Permite que las competencias de un curso varíen por grado,
--  no solo por nivel. Por defecto (grado_id NULL) una competencia
--  aplica a todos los grados del nivel del curso; si existen filas
--  con grado_id específico para ese curso, esas reemplazan por
--  completo a las del nivel para ese grado (no se mezclan).
--  Aditivo: no borra ni modifica ninguna fila existente (todas
--  las competencias actuales quedan con grado_id NULL = default
--  del nivel, comportamiento idéntico al actual).
-- ============================================================

ALTER TABLE academic_schema.competencia
  ADD COLUMN IF NOT EXISTS grado_id UUID REFERENCES academic_schema.grado(id) ON DELETE CASCADE;

-- Un mismo nombre de competencia no puede repetirse dos veces como
-- default de nivel para el mismo curso...
CREATE UNIQUE INDEX IF NOT EXISTS competencia_curso_nombre_default_key
  ON academic_schema.competencia (curso_id, nombre) WHERE grado_id IS NULL;

-- ...ni dos veces como override del mismo curso+grado.
CREATE UNIQUE INDEX IF NOT EXISTS competencia_curso_grado_nombre_key
  ON academic_schema.competencia (curso_id, grado_id, nombre) WHERE grado_id IS NOT NULL;
