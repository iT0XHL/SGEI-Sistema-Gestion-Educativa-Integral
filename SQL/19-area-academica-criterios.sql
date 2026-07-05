-- ============================================================
--  19-area-academica-criterios.sql
--  Nivel 1 (Área Académica, nueva) + Nivel 3 (peso por criterio de
--  evaluación / competencia). El Nivel 2 (curso) no cambia de rol:
--  asignacion_docente/horario siguen atados a curso_id sin tocar.
--
--  - area_academica: agrupador puramente visual para la libreta.
--  - curso.area_academica_id: FK nullable, ON DELETE SET NULL. Los
--    8 cursos genéricos viejos (protegidos por libreta_detalle FK
--    RESTRICT) y los cursos que el admin decida dejar sueltos
--    (Religión, Oratoria, Psicología, Plan Lector) quedan en NULL.
--  - competencia.peso: default 100 = cero cambio de comportamiento
--    para las competencias ya existentes (siguen promediando igual).
-- ============================================================

CREATE TABLE IF NOT EXISTS academic_schema.area_academica (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nivel_id    UUID NOT NULL REFERENCES academic_schema.nivel(id),
  nombre      VARCHAR(120) NOT NULL,
  orden       SMALLINT,
  activo      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_area_academica_nivel_nombre UNIQUE (nivel_id, nombre)
);

ALTER TABLE academic_schema.curso
  ADD COLUMN IF NOT EXISTS area_academica_id UUID NULL
  REFERENCES academic_schema.area_academica(id) ON DELETE SET NULL;

ALTER TABLE academic_schema.competencia
  ADD COLUMN IF NOT EXISTS peso NUMERIC(5,2) NOT NULL DEFAULT 100.00;

ALTER TABLE academic_schema.competencia
  DROP CONSTRAINT IF EXISTS competencia_peso_check;
ALTER TABLE academic_schema.competencia
  ADD CONSTRAINT competencia_peso_check CHECK (peso > 0 AND peso <= 100);

-- ── Seed de áreas por nivel ─────────────────────────────────────
DO $$
DECLARE
  v_sec UUID := '00000000-0000-0000-0004-000000000001';
  v_pri UUID := '00000000-0000-0000-0004-000000000010';
BEGIN
  INSERT INTO academic_schema.area_academica (nivel_id, nombre, orden) VALUES
    (v_sec, 'Comunicación',         1),
    (v_sec, 'Matemática',           2),
    (v_sec, 'Ciencia y Tecnología', 3),
    (v_sec, 'Ciencias Sociales',    4),
    (v_sec, 'DPCC',                 5),
    (v_sec, 'Arte y Cultura',       6),
    (v_sec, 'Inglés',               7),
    (v_sec, 'Educación Física',     8),
    (v_pri, 'Comunicación',         1),
    (v_pri, 'Matemática',           2),
    (v_pri, 'Ciencia y Tecnología', 3),
    (v_pri, 'Ciencias Sociales',    4),
    (v_pri, 'DPCC',                 5),
    (v_pri, 'Arte y Cultura',       6),
    (v_pri, 'Inglés',               7),
    (v_pri, 'Educación Física',     8)
  ON CONFLICT (nivel_id, nombre) DO NOTHING;

  -- Secundaria: mapear los cursos finos nuevos (los 8 genéricos viejos quedan NULL)
  UPDATE academic_schema.curso SET area_academica_id = (SELECT id FROM academic_schema.area_academica WHERE nombre='Comunicación'         AND nivel_id=v_sec) WHERE nivel_id=v_sec AND nombre IN ('Lenguaje','R.V.','Literatura');
  UPDATE academic_schema.curso SET area_academica_id = (SELECT id FROM academic_schema.area_academica WHERE nombre='Matemática'           AND nivel_id=v_sec) WHERE nivel_id=v_sec AND nombre IN ('R.M.','Aritmética','Álgebra','Trigonometría','Geometría');
  UPDATE academic_schema.curso SET area_academica_id = (SELECT id FROM academic_schema.area_academica WHERE nombre='Ciencia y Tecnología' AND nivel_id=v_sec) WHERE nivel_id=v_sec AND nombre IN ('Física','Química','Biología');
  UPDATE academic_schema.curso SET area_academica_id = (SELECT id FROM academic_schema.area_academica WHERE nombre='Ciencias Sociales'    AND nivel_id=v_sec) WHERE nivel_id=v_sec AND nombre IN ('Historia','Geografía');
  UPDATE academic_schema.curso SET area_academica_id = (SELECT id FROM academic_schema.area_academica WHERE nombre='DPCC'                 AND nivel_id=v_sec) WHERE nivel_id=v_sec AND nombre = 'Cívica';
  UPDATE academic_schema.curso SET area_academica_id = (SELECT id FROM academic_schema.area_academica WHERE nombre='Arte y Cultura'       AND nivel_id=v_sec) WHERE nivel_id=v_sec AND nombre = 'Música';
  UPDATE academic_schema.curso SET area_academica_id = (SELECT id FROM academic_schema.area_academica WHERE nombre='Inglés'              AND nivel_id=v_sec) WHERE nivel_id=v_sec AND nombre = 'Inglés';
  UPDATE academic_schema.curso SET area_academica_id = (SELECT id FROM academic_schema.area_academica WHERE nombre='Educación Física'     AND nivel_id=v_sec) WHERE nivel_id=v_sec AND nombre = 'Educación Física';
  -- Psicología: fina de Secundaria, sin área en la imagen de referencia -> queda NULL (independiente, reasignable).

  -- Primaria: mismo mapeo donde aplique
  UPDATE academic_schema.curso SET area_academica_id = (SELECT id FROM academic_schema.area_academica WHERE nombre='Comunicación'         AND nivel_id=v_pri) WHERE nivel_id=v_pri AND nombre IN ('Lenguaje','R.V.');
  UPDATE academic_schema.curso SET area_academica_id = (SELECT id FROM academic_schema.area_academica WHERE nombre='Matemática'           AND nivel_id=v_pri) WHERE nivel_id=v_pri AND nombre IN ('R.M.','Aritmética','Álgebra','Trigonometría','Geometría');
  UPDATE academic_schema.curso SET area_academica_id = (SELECT id FROM academic_schema.area_academica WHERE nombre='Ciencia y Tecnología' AND nivel_id=v_pri) WHERE nivel_id=v_pri AND nombre IN ('Biología','Química');
  UPDATE academic_schema.curso SET area_academica_id = (SELECT id FROM academic_schema.area_academica WHERE nombre='Ciencias Sociales'    AND nivel_id=v_pri) WHERE nivel_id=v_pri AND nombre IN ('Historia','Geografía');
  UPDATE academic_schema.curso SET area_academica_id = (SELECT id FROM academic_schema.area_academica WHERE nombre='DPCC'                 AND nivel_id=v_pri) WHERE nivel_id=v_pri AND nombre = 'Cívica';
  UPDATE academic_schema.curso SET area_academica_id = (SELECT id FROM academic_schema.area_academica WHERE nombre='Arte y Cultura'       AND nivel_id=v_pri) WHERE nivel_id=v_pri AND nombre = 'Música';
  UPDATE academic_schema.curso SET area_academica_id = (SELECT id FROM academic_schema.area_academica WHERE nombre='Inglés'              AND nivel_id=v_pri) WHERE nivel_id=v_pri AND nombre = 'Inglés';
  UPDATE academic_schema.curso SET area_academica_id = (SELECT id FROM academic_schema.area_academica WHERE nombre='Educación Física'     AND nivel_id=v_pri) WHERE nivel_id=v_pri AND nombre = 'Educación Física';
  -- Religión, Oratoria, Plan Lector (Primaria): sin área en la imagen -> quedan NULL (independientes, reasignables).
  -- Los cursos genéricos viejos (Matemática, Comunicación, Ciencias Sociales, Ciencia y Tecnología,
  -- Inglés, Ed. Física, Arte y Cultura, Ed. para el Trabajo): NUNCA tocar, quedan NULL.
END $$;
