-- ══════════════════════════════════════════════════════════════
-- Migration 27: Índices compuestos faltantes
-- ══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_asignacion_docente_activo
  ON academic_schema.asignacion_docente(docente_id, seccion_id)
  WHERE activo = TRUE;

CREATE INDEX IF NOT EXISTS idx_competencia_curso_grado
  ON academic_schema.competencia(curso_id, grado_id);

CREATE INDEX IF NOT EXISTS idx_horario_docente_dia
  ON academic_schema.horario(docente_id, dia_semana);
