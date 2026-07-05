-- ============================================================
--  18-competencias-cursos-nuevos.sql
--  Los 21 cursos finos nuevos (14-cursos-por-nivel.sql) no tenían
--  NINGUNA competencia asociada — por eso los docentes no podían
--  escribir notas (la grilla de DocenteNotas dibuja una columna por
--  competencia del curso). Se crea 1 competencia genérica por curso
--  (grado_id NULL, aplica a todos los grados de ese nivel), suficiente
--  para habilitar el registro de notas.
-- ============================================================

INSERT INTO academic_schema.competencia (curso_id, nombre, descripcion, tipo, orden)
SELECT cu.id, 'Desempeño en ' || cu.nombre, NULL, 'regular', 1
FROM academic_schema.curso cu
WHERE cu.nivel_id IN ('00000000-0000-0000-0004-000000000010', '00000000-0000-0000-0004-000000000001')
  AND NOT EXISTS (SELECT 1 FROM academic_schema.competencia c WHERE c.curso_id = cu.id)
ON CONFLICT DO NOTHING;
