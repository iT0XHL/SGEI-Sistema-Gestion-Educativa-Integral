-- ============================================================
--  17-eliminar-docentes-sin-horario.sql
--  Borra por completo los docentes que quedaron sin NINGÚN bloque
--  de horario asignado tras el reemplazo del catálogo de cursos
--  (16-horario-completo-nuevo.sql) — los 7 docentes originales
--  (452316xx) y los 14 del primer seed (690000xx), obsoletos porque
--  el horario ahora usa exclusivamente el catálogo nuevo (32
--  docentes 72000001-72000032).
--
--  Cascada completa (confirmada explícitamente por el usuario):
--  se borra también todo lo que dependía de ellos — asignaciones,
--  notas, materiales, actividades, asistencia que registraron,
--  preguntas de simulacro, sesiones de auditoría — antes de borrar
--  el docente, su perfil_usuario y su credencial.
-- ============================================================

SET session_replication_role = replica;

DO $$
DECLARE
  v_count INT;
BEGIN
  CREATE TEMP TABLE tmp_docentes_a_borrar AS
  SELECT d.id AS docente_id, d.perfil_usuario_id
  FROM academic_schema.docente d
  WHERE NOT EXISTS (SELECT 1 FROM academic_schema.horario h WHERE h.docente_id = d.id);

  SELECT count(*) INTO v_count FROM tmp_docentes_a_borrar;
  RAISE NOTICE 'Docentes a eliminar: %', v_count;

  DELETE FROM audit_schema.sesion_auditoria WHERE usuario_id IN (SELECT perfil_usuario_id FROM tmp_docentes_a_borrar);
  DELETE FROM academic_schema.simulacro_examen_pregunta WHERE pregunta_id IN (
    SELECT id FROM academic_schema.simulacro_pregunta WHERE docente_id IN (SELECT docente_id FROM tmp_docentes_a_borrar)
  );
  DELETE FROM academic_schema.simulacro_pregunta WHERE docente_id IN (SELECT docente_id FROM tmp_docentes_a_borrar);
  DELETE FROM academic_schema.asistencia_docente WHERE docente_id IN (SELECT docente_id FROM tmp_docentes_a_borrar);
  DELETE FROM academic_schema.asistencia WHERE registrado_por IN (SELECT docente_id FROM tmp_docentes_a_borrar);
  DELETE FROM academic_schema.nota WHERE docente_id IN (SELECT docente_id FROM tmp_docentes_a_borrar);
  DELETE FROM academic_schema.material WHERE docente_id IN (SELECT docente_id FROM tmp_docentes_a_borrar);
  DELETE FROM academic_schema.actividad WHERE docente_id IN (SELECT docente_id FROM tmp_docentes_a_borrar);
  DELETE FROM academic_schema.asignacion_docente WHERE docente_id IN (SELECT docente_id FROM tmp_docentes_a_borrar);
  -- horario_publicacion (y sus bloques) del docente cascadean solas al borrar el docente.
  -- seccion.docente_tutor_id se pone en NULL solo al borrar el docente.

  DELETE FROM academic_schema.docente WHERE id IN (SELECT docente_id FROM tmp_docentes_a_borrar);
  DELETE FROM auth_schema.credencial WHERE id IN (
    SELECT credencial_id FROM auth_schema.perfil_usuario WHERE id IN (SELECT perfil_usuario_id FROM tmp_docentes_a_borrar)
  );

  RAISE NOTICE '========== DOCENTES SIN HORARIO ELIMINADOS ==========';
END $$;

SET session_replication_role = default;
