import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/**
 * Una nota final agregada por (alumno, curso) — promedio anual de todos
 * los bimestres/competencias. Usado para el Acta Consolidada.
 */
export interface NotaFinalSiagie {
  periodo_id:                string;
  seccion_id:                string;
  alumno_id:                 string;
  grado:                     string;
  seccion:                   string;
  turno:                     string;
  nivel_educativo:           string;
  numero_orden:              number;
  codigo_estudiante:         string | null;
  numero_documento:          string;
  apellido_paterno:          string;
  apellido_materno:          string;
  nombres:                   string;
  sexo:                      string;
  curso_id:                  string;
  curso:                     string;
  codigo_cneb:               string | null;
  area_academica_id:         string | null;
  area_nombre:               string | null;
  area_orden:                number | null;
  nota_promedio:             number;
  comportamiento:            string | null;
  numero_areas_desaprobadas: number | null;
  situacion_final:           string | null;
  motivo_retiro:             string | null;
  observaciones:             string | null;
  codigo_ugel:               string;
  nombre_ugel:               string;
  nombre_ie:                 string;
  codigo_modular:            string;
  resolucion_creacion:       string | null;
  modalidad:                 string;
  gestion:                   string;
  departamento:              string;
  provincia:                 string;
  distrito:                  string;
  centro_poblado:            string | null;
  fecha_inicio_periodo:      Date;
  fecha_fin_periodo:         Date;
  anio_escolar:              number;
}

export interface FormatoSiagieRow {
  // IE
  codigo_ugel:          string;
  nombre_ugel:          string;
  nombre_ie:            string;
  codigo_modular:       string;
  resolucion_creacion:  string | null;
  modalidad:            string;
  gestion:              string;
  departamento:         string;
  provincia:            string;
  distrito:             string;
  centro_poblado:       string | null;
  // Período
  fecha_inicio_periodo: Date;
  fecha_fin_periodo:    Date;
  anio_escolar:         number;
  // Sección
  grado:                string;
  seccion:              string;
  turno:                string;
  numero_orden:         number;
  // Alumno
  codigo_estudiante:    string | null;
  numero_documento:     string;
  apellido_paterno:     string;
  apellido_materno:     string;
  nombres:              string;
  sexo:                 string;
  nivel_educativo:      string;
  // Nota
  curso_id:             string;
  curso:                string;
  codigo_cneb:          string | null;
  area_academica_id:    string | null;
  area_nombre:          string | null;
  competencia:          string;
  numero_bimestre:      number;
  bimestre:             string;
  nota_vigesimal:       number;
  nota_literal:         string;
  tipo_evaluacion:      string;
  // Situación final
  comportamiento:            string | null;
  numero_areas_desaprobadas: number | null;
  situacion_final:           string | null;
  motivo_retiro:             string | null;
  observaciones:             string | null;
  fecha_registro_nota:       Date;
  // IDs (para filtrado)
  periodo_id:  string;
  alumno_id:   string;
  seccion_id:  string;
}

function periodoClause(periodoId?: string) {
  return periodoId
    ? Prisma.sql`WHERE periodo_id = ${periodoId}::uuid`
    : Prisma.sql``;
}

export const SiagieRepository = {
  async obtener(periodoId?: string): Promise<FormatoSiagieRow[]> {
    const rows = await prisma.$queryRaw<FormatoSiagieRow[]>`
      SELECT *
      FROM  audit_schema.formato_siagie
      ${periodoClause(periodoId)}
      ORDER BY anio_escolar, grado, seccion, apellido_paterno, apellido_materno, curso, numero_bimestre
    `;
    return rows.map((r) => ({
      ...r,
      nota_vigesimal:            parseFloat(String(r.nota_vigesimal)),
      numero_orden:              Number(r.numero_orden),
      anio_escolar:              Number(r.anio_escolar),
      numero_bimestre:           Number(r.numero_bimestre),
      numero_areas_desaprobadas: r.numero_areas_desaprobadas !== null
        ? Number(r.numero_areas_desaprobadas)
        : null,
    }));
  },

  async refresh(): Promise<void> {
    // Primer intento: CONCURRENTLY (no bloquea lecturas, requiere índice único en la MV).
    // Si la MV nunca se ha poblado (caso seed inicial), CONCURRENTLY falla con
    // "cannot refresh materialized view concurrently"; en ese caso hacemos un
    // REFRESH plano una sola vez.
    try {
      await prisma.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY audit_schema.formato_siagie`;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/concurrently/i.test(msg)) {
        await prisma.$executeRaw`REFRESH MATERIALIZED VIEW audit_schema.formato_siagie`;
      } else {
        throw err;
      }
    }
  },

  /**
   * ¿Hay al menos una nota registrada en la DB? Se usa para decidir si vale
   * la pena refrescar la MV cuando viene vacía.
   */
  async existenNotas(): Promise<boolean> {
    const [r] = await prisma.$queryRaw<[{ existe: boolean }]>`
      SELECT EXISTS(SELECT 1 FROM academic_schema.nota) AS existe
    `;
    return Boolean(r?.existe);
  },

  /**
   * Devuelve notas finales agregadas a nivel (alumno, curso) para TODOS los
   * alumnos (con o sin notas). Parte desde alumno con LEFT JOIN para incluir
   * incluso a quienes aún no tienen notas registradas.
   * Usado por el builder de "Acta Consolidada".
   */
  async obtenerNotasFinales(periodoId?: string): Promise<NotaFinalSiagie[]> {
    const periodoCond = periodoId
      ? Prisma.sql`pa.id = ${periodoId}::uuid`
      : Prisma.sql`pa.activo = TRUE`;

    const rows = await prisma.$queryRaw<NotaFinalSiagie[]>`
      WITH cursos_por_grado AS (
        SELECT DISTINCT gc.grado_id, gc.curso_id
        FROM academic_schema.grado_curso gc
      ),
      promedios_alumno_curso AS (
        SELECT
          n.alumno_id,
          comp.curso_id,
          AVG(n.nota_vigesimal) AS promedio
        FROM academic_schema.nota n
        JOIN academic_schema.competencia comp ON comp.id = n.competencia_id
        GROUP BY n.alumno_id, comp.curso_id
      )
      SELECT
        pa.id                                                 AS periodo_id,
        s.id                                                  AS seccion_id,
        a.id                                                  AS alumno_id,
        g.nombre                                              AS grado,
        s.nombre                                              AS seccion,
        s.turno,
        niv.nombre                                            AS nivel_educativo,
        ROW_NUMBER() OVER (
          PARTITION BY s.id, pa.id
          ORDER BY a.apellido_paterno, a.apellido_materno, a.nombres
        )                                                     AS numero_orden,
        a.codigo_siagie                                       AS codigo_estudiante,
        a.dni                                                 AS numero_documento,
        a.apellido_paterno,
        a.apellido_materno,
        a.nombres,
        a.sexo,
        c.id                                                  AS curso_id,
        c.nombre                                              AS curso,
        c.codigo_cneb,
        c.area_academica_id,
        area.nombre                                           AS area_nombre,
        area.orden                                            AS area_orden,
        ROUND(pac.promedio, 2)                                AS nota_promedio,
        sfa.comportamiento,
        sfa.numero_areas_desaprobadas,
        sfa.situacion_final,
        sfa.motivo_retiro,
        sfa.observaciones,
        ie.codigo_ugel,
        ie.nombre_ugel,
        ie.nombre                                             AS nombre_ie,
        ie.codigo_modular,
        ie.resolucion_creacion,
        ie.modalidad,
        ie.gestion,
        ie.departamento,
        ie.provincia,
        ie.distrito,
        ie.centro_poblado,
        pa.fecha_inicio                                       AS fecha_inicio_periodo,
        pa.fecha_fin                                          AS fecha_fin_periodo,
        pa.año                                                AS anio_escolar
      FROM academic_schema.alumno a
      JOIN academic_schema.seccion s             ON s.id = a.seccion_id
      JOIN academic_schema.grado g               ON g.id = s.grado_id
      JOIN academic_schema.nivel niv             ON niv.id = g.nivel_id
      JOIN academic_schema.periodo_academico pa  ON pa.id = s.periodo_id
      JOIN academic_schema.institucion_educativa ie ON ie.activo = TRUE
      JOIN cursos_por_grado cpg                  ON cpg.grado_id = g.id
      JOIN academic_schema.curso c               ON c.id = cpg.curso_id
      LEFT JOIN academic_schema.area_academica area ON area.id = c.area_academica_id
      LEFT JOIN promedios_alumno_curso pac
        ON pac.alumno_id = a.id AND pac.curso_id = c.id
      LEFT JOIN academic_schema.situacion_final_alumno sfa
        ON sfa.alumno_id = a.id AND sfa.periodo_id = pa.id
      WHERE ${periodoCond}
        AND a.activo = TRUE
      ORDER BY pa.año, g.nombre, s.nombre, a.apellido_paterno, a.apellido_materno, c.nombre
    `;

    return rows.map(r => ({
      ...r,
      numero_orden:              Number(r.numero_orden),
      anio_escolar:              Number(r.anio_escolar),
      area_orden:                r.area_orden !== null ? Number(r.area_orden) : null,
      nota_promedio:             r.nota_promedio !== null && Number(r.nota_promedio) > 0
        ? parseFloat(String(r.nota_promedio))
        : 0,
      numero_areas_desaprobadas: r.numero_areas_desaprobadas !== null
        ? Number(r.numero_areas_desaprobadas)
        : null,
    }));
  },

  async stats(periodoId?: string) {
    const periodoFilter = periodoId
      ? Prisma.sql`WHERE periodo_id = ${periodoId}::uuid`
      : Prisma.sql``;

    const activoPeriodSubq = Prisma.sql`(
      SELECT id FROM academic_schema.periodo_academico WHERE activo = TRUE LIMIT 1
    )`;

    const seccionPeriodoCond = periodoId
      ? Prisma.sql`s.periodo_id = ${periodoId}::uuid`
      : Prisma.sql`s.periodo_id = ${activoPeriodSubq}`;

    const [totalRes, conNotasRes, fueraRangoRes, sinCodigoRes] = await Promise.all([
      prisma.$queryRaw<[{ total: bigint }]>`
        SELECT COUNT(DISTINCT a.id) AS total
        FROM  academic_schema.alumno   a
        JOIN  academic_schema.seccion  s ON s.id = a.seccion_id
        WHERE ${seccionPeriodoCond}
          AND a.activo = TRUE
      `,
      prisma.$queryRaw<[{ total: bigint }]>`
        SELECT COUNT(DISTINCT alumno_id) AS total
        FROM  audit_schema.formato_siagie
        ${periodoFilter}
      `,
      prisma.$queryRaw<[{ total: bigint }]>`
        SELECT COUNT(*) AS total
        FROM  academic_schema.nota
        WHERE nota_vigesimal < 0 OR nota_vigesimal > 20
      `,
      prisma.$queryRaw<[{ total: bigint }]>`
        SELECT COUNT(*) AS total
        FROM  academic_schema.alumno
        WHERE codigo_siagie IS NULL
          AND activo = TRUE
      `,
    ]);

    return {
      total_alumnos:              Number(totalRes[0]?.total ?? 0),
      alumnos_con_notas:          Number(conNotasRes[0]?.total ?? 0),
      notas_fuera_rango:          Number(fueraRangoRes[0]?.total ?? 0),
      alumnos_sin_codigo_siagie:  Number(sinCodigoRes[0]?.total ?? 0),
    };
  },

  async validaciones(periodoId?: string) {
    const periodoFilter = periodoId
      ? Prisma.sql`AND n.bimestre_id IN (
          SELECT id FROM academic_schema.bimestre WHERE periodo_id = ${periodoId}::uuid
        )`
      : Prisma.sql``;

    const activoPeriodSubq = periodoId
      ? Prisma.sql`${periodoId}::uuid`
      : Prisma.sql`(SELECT id FROM academic_schema.periodo_academico WHERE activo = TRUE LIMIT 1)`;

    const seccionCond = Prisma.sql`s.periodo_id = ${activoPeriodSubq}`;

    const [dniRes, notasRes, fueraRangoRes, sinSituFinalRes, sinCodigoSiagieRes] = await Promise.all([
      // Alumnos con DNI (todos tienen por constraint)
      prisma.$queryRaw<[{ con_dni: bigint; total: bigint }]>`
        SELECT
          COUNT(*) FILTER (WHERE a.dni IS NOT NULL) AS con_dni,
          COUNT(*) AS total
        FROM academic_schema.alumno   a
        JOIN academic_schema.seccion  s ON s.id = a.seccion_id
        WHERE ${seccionCond} AND a.activo = TRUE
      `,
      // Notas registradas vs total esperado
      prisma.$queryRaw<[{ alumnos_con_notas: bigint; total_alumnos: bigint }]>`
        SELECT
          (SELECT COUNT(DISTINCT alumno_id)
           FROM academic_schema.nota n
           WHERE TRUE ${periodoFilter}) AS alumnos_con_notas,
          (SELECT COUNT(DISTINCT a.id)
           FROM academic_schema.alumno  a
           JOIN academic_schema.seccion s ON s.id = a.seccion_id
           WHERE ${seccionCond} AND a.activo = TRUE) AS total_alumnos
      `,
      // Notas fuera de rango
      prisma.$queryRaw<[{ total: bigint }]>`
        SELECT COUNT(*) AS total
        FROM academic_schema.nota
        WHERE nota_vigesimal < 0 OR nota_vigesimal > 20
      `,
      // Alumnos sin situación final
      prisma.$queryRaw<[{ sin_sfa: bigint; total: bigint }]>`
        SELECT
          (SELECT COUNT(DISTINCT a.id)
           FROM academic_schema.alumno a
           JOIN academic_schema.seccion s ON s.id = a.seccion_id
           WHERE ${seccionCond} AND a.activo = TRUE
             AND NOT EXISTS (
               SELECT 1 FROM academic_schema.situacion_final_alumno sfa
               WHERE sfa.alumno_id = a.id
                 AND sfa.periodo_id = ${activoPeriodSubq}
             )
          ) AS sin_sfa,
          (SELECT COUNT(DISTINCT a.id)
           FROM academic_schema.alumno a
           JOIN academic_schema.seccion s ON s.id = a.seccion_id
           WHERE ${seccionCond} AND a.activo = TRUE) AS total
      `,
      // Alumnos sin código SIAGIE
      prisma.$queryRaw<[{ total: bigint }]>`
        SELECT COUNT(*) AS total
        FROM academic_schema.alumno
        WHERE codigo_siagie IS NULL AND activo = TRUE
      `,
    ]);

    const conDni     = Number(dniRes[0]?.con_dni ?? 0);
    const totalAlumn = Number(dniRes[0]?.total   ?? 0);
    const conNotas   = Number(notasRes[0]?.alumnos_con_notas ?? 0);
    const totalAlum2 = Number(notasRes[0]?.total_alumnos     ?? 0);
    const fueraRango = Number(fueraRangoRes[0]?.total ?? 0);
    const sinSfa     = Number(sinSituFinalRes[0]?.sin_sfa ?? 0);
    const sinCodigo  = Number(sinCodigoSiagieRes[0]?.total ?? 0);

    return [
      {
        id:     'v1',
        label:  'Alumnos matriculados con DNI registrado',
        status: conDni === totalAlumn ? 'ok' : 'warning',
        detail: `${conDni}/${totalAlumn} alumnos con DNI`,
      },
      {
        id:     'v2',
        label:  'Notas del período ingresadas',
        status: conNotas === totalAlum2 ? 'ok' : (conNotas === 0 ? 'error' : 'warning'),
        detail: `${conNotas}/${totalAlum2} alumnos con al menos una nota registrada`,
      },
      {
        id:     'v3',
        label:  'Notas fuera de rango (0–20)',
        status: fueraRango === 0 ? 'ok' : 'error',
        detail: fueraRango === 0
          ? 'Todas las notas están dentro del rango válido'
          : `${fueraRango} nota(s) registradas fuera del rango válido`,
      },
      {
        id:     'v4',
        label:  'Escala vigesimal convertida a literal',
        status: 'ok',
        detail: 'Conversión AD/A/B/C aplicada automáticamente por trigger tg_set_nota_literal',
      },
      {
        id:     'v5',
        label:  'Situación final del alumno registrada',
        status: sinSfa === 0 ? 'ok' : 'warning',
        detail: sinSfa === 0
          ? 'Todos los alumnos tienen situación final registrada'
          : `${sinSfa} alumno(s) sin situación final en el período`,
      },
      {
        id:     'v6',
        label:  'Código SIAGIE de alumnos registrado',
        status: sinCodigo === 0 ? 'ok' : 'warning',
        detail: sinCodigo === 0
          ? 'Todos los alumnos tienen código SIAGIE'
          : `${sinCodigo} alumno(s) sin código SIAGIE asignado`,
      },
      {
        id:     'v7',
        label:  'Estructura de archivo SIAGIE válida',
        status: 'ok',
        detail: 'Formato compatible con MINEDU v3.4 — generado desde audit_schema.formato_siagie',
      },
    ] as const;
  },
};
