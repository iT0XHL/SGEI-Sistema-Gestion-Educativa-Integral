-- ============================================================
-- 25-limpieza-cursos-genericos.sql
--
-- Elimina los cursos "genéricos" MUERTOS que inflaban el catálogo:
-- filas de curso SIN área académica que duplican el nombre de un
-- área (Comunicación, Matemática, Ciencia y Tecnología, Ciencias
-- Sociales, Arte y Cultura, Ed. Física) y "Ed. para el Trabajo"
-- (no se dicta en la institución).
--
-- Criterio de "muerto": sin área + 0 notas + 0 asignaciones docente.
-- Los cursos reales sin área (Plan Lector, Oratoria, Religión,
-- Psicología) SÍ tienen notas/docentes y se conservan; además se
-- protegen por nombre por si alguna vez quedaran sin notas.
--
-- Tras esto el catálogo = solo los cursos que existen de verdad, y
-- la boleta / acta SIAGIE reflejan la cantidad real de cursos del
-- sistema. Idempotente: si no hay muertos, no hace nada.
-- ============================================================
DO $$
DECLARE
  v_ids uuid[];
BEGIN
  SELECT array_agg(c.id) INTO v_ids
  FROM academic_schema.curso c
  WHERE c.area_academica_id IS NULL
    AND c.nombre NOT IN ('Plan Lector', 'Oratoria', 'Religión', 'Psicología')
    AND NOT EXISTS (
      SELECT 1 FROM academic_schema.nota n
      JOIN academic_schema.competencia cp ON cp.id = n.competencia_id
      WHERE cp.curso_id = c.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM academic_schema.asignacion_docente ad WHERE ad.curso_id = c.id
    );

  IF v_ids IS NULL THEN
    RAISE NOTICE '25-limpieza: no hay cursos genéricos muertos para eliminar.';
    RETURN;
  END IF;

  DELETE FROM academic_schema.competencia WHERE curso_id = ANY(v_ids);
  DELETE FROM academic_schema.grado_curso  WHERE curso_id = ANY(v_ids);
  DELETE FROM academic_schema.curso        WHERE id = ANY(v_ids);

  RAISE NOTICE '25-limpieza: cursos genéricos eliminados = %', array_length(v_ids, 1);
END $$;
