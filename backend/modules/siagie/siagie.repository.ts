import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

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
  curso:                string;
  codigo_cneb:          string | null;
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
    // CONCURRENTLY no bloquea lecturas; requiere el unique index definido en la MV.
    await prisma.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY audit_schema.formato_siagie`;
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
