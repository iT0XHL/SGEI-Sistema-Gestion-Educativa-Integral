-- ============================================================
--  21-limpieza-post-borrado-docentes.sql
--  Limpieza de residuos dejados por SQL/17 (borrado de los 21
--  docentes viejos sin horario) que session_replication_role=replica
--  impidió limpiar automáticamente vía los triggers de FK:
--
--  1) seccion.docente_tutor_id colgante (el trigger ON DELETE SET
--     NULL no corrió en modo replica) → se limpia a mano.
--  2) simulacro_examen huérfano (quedó con 0 preguntas porque TODAS
--     las simulacro_pregunta pertenecían a los docentes borrados) →
--     se elimina; el banco de preguntas queda vacío a propósito,
--     para que Admin/Docentes lo carguen con contenido real.
--
--  No se toca formato_siagie aquí — ese refresh se hace vía el
--  endpoint/función ya existente (SiagieRepository.refresh /
--  POST /api/siagie/refresh), no con SQL directo.
-- ============================================================

-- 1) FK colgante: docente_tutor_id apuntando a un docente que ya no existe.
UPDATE academic_schema.seccion
SET docente_tutor_id = NULL
WHERE docente_tutor_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM academic_schema.docente d WHERE d.id = seccion.docente_tutor_id);

-- 2) Examen de simulacro armado que quedó sin ninguna pregunta.
DELETE FROM academic_schema.simulacro_examen se
WHERE NOT EXISTS (
  SELECT 1 FROM academic_schema.simulacro_examen_pregunta sep WHERE sep.examen_id = se.id
);

-- Verificación
SELECT count(*) AS seccion_tutor_colgante FROM academic_schema.seccion s
WHERE s.docente_tutor_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM academic_schema.docente d WHERE d.id = s.docente_tutor_id);

SELECT count(*) AS examenes_huerfanos FROM academic_schema.simulacro_examen se
WHERE NOT EXISTS (SELECT 1 FROM academic_schema.simulacro_examen_pregunta sep WHERE sep.examen_id = se.id);
