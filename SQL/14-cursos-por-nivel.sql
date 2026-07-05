-- ============================================================
--  14-cursos-por-nivel.sql
--  Nuevo catálogo de cursos, fino (por materia específica en vez
--  de "áreas" genéricas), uno por nivel. Aditivo: los 8 cursos
--  genéricos anteriores (Matemática, Comunicación, etc.) NO se
--  borran — quedan como historial de las libretas/notas del
--  Bimestre I ya generadas (tienen FK ON DELETE RESTRICT desde
--  libreta_detalle). El horario y las asignaciones nuevas usan
--  exclusivamente este catálogo nuevo.
--
--  Secundaria: se ajusta total_horas_dia de 8 a 7 para que calce
--  exactamente con la suma de horas semanales de sus 19 cursos
--  (35 = 7 × 5 días). Primaria ya calzaba (30 = 6 × 5).
-- ============================================================

UPDATE academic_schema.nivel_horario_config
SET total_horas_dia = 7
WHERE nivel_id = '00000000-0000-0000-0004-000000000001'; -- Secundaria

-- ── Primaria (18 cursos, suma 30 horas/semana) ─────────────────
INSERT INTO academic_schema.curso (nivel_id, nombre, horas_semanales) VALUES
  ('00000000-0000-0000-0004-000000000010', 'Aritmética',        2),
  ('00000000-0000-0000-0004-000000000010', 'R.M.',              2),
  ('00000000-0000-0000-0004-000000000010', 'Álgebra',           2),
  ('00000000-0000-0000-0004-000000000010', 'Trigonometría',     2),
  ('00000000-0000-0000-0004-000000000010', 'Geometría',         2),
  ('00000000-0000-0000-0004-000000000010', 'Lenguaje',          2),
  ('00000000-0000-0000-0004-000000000010', 'R.V.',              2),
  ('00000000-0000-0000-0004-000000000010', 'Plan Lector',       1),
  ('00000000-0000-0000-0004-000000000010', 'Cívica',            1),
  ('00000000-0000-0000-0004-000000000010', 'Geografía',         2),
  ('00000000-0000-0000-0004-000000000010', 'Historia',          2),
  ('00000000-0000-0000-0004-000000000010', 'Biología',          2),
  ('00000000-0000-0000-0004-000000000010', 'Química',           2),
  ('00000000-0000-0000-0004-000000000010', 'Inglés',            2),
  ('00000000-0000-0000-0004-000000000010', 'Educación Física',  1),
  ('00000000-0000-0000-0004-000000000010', 'Religión',          1),
  ('00000000-0000-0000-0004-000000000010', 'Oratoria',          1),
  ('00000000-0000-0000-0004-000000000010', 'Música',            1)
ON CONFLICT DO NOTHING;

-- ── Secundaria (19 cursos, suma 35 horas/semana) ───────────────
INSERT INTO academic_schema.curso (nivel_id, nombre, horas_semanales) VALUES
  ('00000000-0000-0000-0004-000000000001', 'Aritmética',        3),
  ('00000000-0000-0000-0004-000000000001', 'R.M.',              3),
  ('00000000-0000-0000-0004-000000000001', 'Álgebra',           3),
  ('00000000-0000-0000-0004-000000000001', 'Trigonometría',     2),
  ('00000000-0000-0000-0004-000000000001', 'Geometría',         2),
  ('00000000-0000-0000-0004-000000000001', 'Lenguaje',          2),
  ('00000000-0000-0000-0004-000000000001', 'R.V.',              3),
  ('00000000-0000-0000-0004-000000000001', 'Literatura',        1),
  ('00000000-0000-0000-0004-000000000001', 'Plan Lector',       1),
  ('00000000-0000-0000-0004-000000000001', 'Cívica',            1),
  ('00000000-0000-0000-0004-000000000001', 'Geografía',         1),
  ('00000000-0000-0000-0004-000000000001', 'Historia',          2),
  ('00000000-0000-0000-0004-000000000001', 'Psicología',        1),
  ('00000000-0000-0000-0004-000000000001', 'Física',            2),
  ('00000000-0000-0000-0004-000000000001', 'Biología',          2),
  ('00000000-0000-0000-0004-000000000001', 'Química',           2),
  ('00000000-0000-0000-0004-000000000001', 'Inglés',            2),
  ('00000000-0000-0000-0004-000000000001', 'Educación Física',  1),
  ('00000000-0000-0000-0004-000000000001', 'Música',            1)
ON CONFLICT DO NOTHING;

-- ── grado_curso: vincula cada curso nuevo a TODOS los grados de su nivel ──
INSERT INTO academic_schema.grado_curso (grado_id, curso_id)
SELECT g.id, c.id
FROM academic_schema.grado g
JOIN academic_schema.curso c ON c.nivel_id = g.nivel_id
WHERE c.nombre IN (
  'Aritmética','R.M.','Álgebra','Trigonometría','Geometría','Lenguaje','R.V.','Plan Lector',
  'Cívica','Geografía','Historia','Biología','Química','Inglés','Educación Física',
  'Religión','Oratoria','Música','Literatura','Psicología','Física'
)
ON CONFLICT DO NOTHING;
