-- ============================================================
--  22-formato-siagie-area-academica.sql
--  Extiende la vista materializada audit_schema.formato_siagie con
--  curso_id / area_academica_id / area_nombre, para que la
--  exportación SIAGIE (backend/excel/siagie.builder.ts) pueda
--  clasificar los 21 cursos finos por su área real en vez de
--  intentar emparejar por substring del nombre (que solo conocía
--  los 8 cursos genéricos viejos y desbordaba el catálogo nuevo).
-- ============================================================

DROP MATERIALIZED VIEW IF EXISTS audit_schema.formato_siagie;

CREATE MATERIALIZED VIEW audit_schema.formato_siagie AS
SELECT
    ie.codigo_ugel                                    AS codigo_ugel,
    ie.nombre_ugel                                     AS nombre_ugel,
    ie.nombre                                          AS nombre_ie,
    ie.codigo_modular                                  AS codigo_modular,
    ie.resolucion_creacion                             AS resolucion_creacion,
    ie.modalidad                                       AS modalidad,
    ie.gestion                                         AS gestion,
    ie.departamento                                    AS departamento,
    ie.provincia                                       AS provincia,
    ie.distrito                                        AS distrito,
    ie.centro_poblado                                  AS centro_poblado,
    pa.fecha_inicio                                    AS fecha_inicio_periodo,
    pa.fecha_fin                                       AS fecha_fin_periodo,
    pa."año"                                           AS anio_escolar,
    g.nombre                                           AS grado,
    s.nombre                                           AS seccion,
    s.turno                                            AS turno,
    ROW_NUMBER() OVER (
        PARTITION BY s.id, pa.id
        ORDER BY a.apellido_paterno, a.apellido_materno, a.nombres
    )                                                  AS numero_orden,
    a.codigo_siagie                                    AS codigo_estudiante,
    a.dni                                              AS numero_documento,
    a.apellido_paterno                                 AS apellido_paterno,
    a.apellido_materno                                 AS apellido_materno,
    a.nombres                                          AS nombres,
    a.sexo                                              AS sexo,
    niv.nombre                                         AS nivel_educativo,
    c.id                                                AS curso_id,
    c.nombre                                           AS curso,
    c.codigo_cneb                                      AS codigo_cneb,
    c.area_academica_id                                AS area_academica_id,
    area.nombre                                        AS area_nombre,
    comp.nombre                                        AS competencia,
    b.numero                                           AS numero_bimestre,
    b.nombre                                           AS bimestre,
    n.nota_vigesimal,
    n.nota_literal,
    n.tipo_evaluacion                                  AS tipo_evaluacion,
    sfa.comportamiento                                 AS comportamiento,
    sfa.numero_areas_desaprobadas                      AS numero_areas_desaprobadas,
    sfa.situacion_final                                AS situacion_final,
    sfa.motivo_retiro                                  AS motivo_retiro,
    sfa.observaciones                                  AS observaciones,
    n.fecha_registro                                   AS fecha_registro_nota,
    pa.id                                               AS periodo_id,
    a.id                                                AS alumno_id,
    s.id                                                AS seccion_id
FROM   academic_schema.nota                   n
JOIN   academic_schema.alumno                 a    ON a.id      = n.alumno_id
JOIN   academic_schema.seccion                s    ON s.id      = a.seccion_id
JOIN   academic_schema.grado                  g    ON g.id      = s.grado_id
JOIN   academic_schema.nivel                  niv  ON niv.id    = g.nivel_id
JOIN   academic_schema.periodo_academico      pa   ON pa.id     = s.periodo_id
JOIN   academic_schema.competencia            comp ON comp.id   = n.competencia_id
JOIN   academic_schema.curso                  c    ON c.id      = comp.curso_id
LEFT   JOIN academic_schema.area_academica     area ON area.id  = c.area_academica_id
JOIN   academic_schema.bimestre               b    ON b.id      = n.bimestre_id
JOIN   academic_schema.institucion_educativa  ie   ON ie.activo = TRUE
LEFT   JOIN academic_schema.situacion_final_alumno sfa
       ON  sfa.alumno_id  = a.id
       AND sfa.periodo_id = pa.id
ORDER  BY
    pa."año",
    g.orden,
    s.nombre,
    a.apellido_paterno,
    a.apellido_materno,
    c.nombre,
    b.numero;

CREATE UNIQUE INDEX ON audit_schema.formato_siagie
    (periodo_id, seccion_id, alumno_id, curso, competencia, numero_bimestre);

CREATE INDEX idx_formato_siagie_periodo  ON audit_schema.formato_siagie(anio_escolar, grado, seccion);
CREATE INDEX idx_formato_siagie_alumno   ON audit_schema.formato_siagie(numero_documento, anio_escolar);

COMMENT ON MATERIALIZED VIEW audit_schema.formato_siagie IS
    'Acta oficial MINEDU/SIAGIE. Cabecera IE, datos del alumno, notas y situación final.
     Incluye curso_id/area_academica_id/area_nombre para que el export sepa agrupar
     los cursos finos por su área académica real, no por substring del nombre.
     Refrescar al cerrar cada bimestre o año lectivo.
     Comando: REFRESH MATERIALIZED VIEW CONCURRENTLY audit_schema.formato_siagie;';

REFRESH MATERIALIZED VIEW audit_schema.formato_siagie;

SELECT count(*) AS filas FROM audit_schema.formato_siagie;
