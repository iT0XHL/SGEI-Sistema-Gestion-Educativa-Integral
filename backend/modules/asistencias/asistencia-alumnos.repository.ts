// ============================================================
//  modules/asistencias/asistencia-alumnos.repository.ts
//
//  La tabla academic_schema.asistencia tiene:
//    UNIQUE (alumno_id, seccion_id, fecha)
//  Por eso el guardado en lote usa INSERT … ON CONFLICT DO UPDATE
//  para garantizar idempotencia (permite corregir el día).
//
//  `registrado_por` referencia academic_schema.docente(id),
//  no perfil_usuario — ver DDL v2.1.
// ============================================================
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import type { GuardarAsistenciaInput } from './asistencia-alumnos.schema';

const alumnoSelect = {
  id: true,
  nombres: true,
  apellido_paterno: true,
  apellido_materno: true,
  dni: true,
} satisfies Prisma.AlumnoSelect;

const registradorSelect = {
  id: true,
  nombres: true,
  apellido_paterno: true,
  apellido_materno: true,
} satisfies Prisma.DocenteSelect;

const seccionSelect = {
  id: true,
  nombre: true,
  grado: { select: { nombre: true } },
} satisfies Prisma.SeccionSelect;

export const AsistenciaAlumnosRepository = {
  /**
   * Guarda asistencia en lote con upsert atómico.
   * Retorna el número de filas afectadas.
   */
  async upsertBatch(
    input: GuardarAsistenciaInput,
    docenteId: string,
  ): Promise<number> {
    if (input.registros.length === 0) return 0;

    // Construir VALUES parametrizados para un upsert multi-fila eficiente.
    const values = input.registros.map((r) => ({
      alumno_id: r.alumno_id,
      seccion_id: input.seccion_id,
      fecha: new Date(input.fecha),
      estado: r.estado,
      justificacion: r.justificacion ?? null,
      registrado_por: docenteId,
    }));

    let affected = 0;
    await prisma.$transaction(async (tx) => {
      for (const v of values) {
        await tx.asistencia.upsert({
          where: {
            alumno_id_seccion_id_fecha: {
              alumno_id: v.alumno_id,
              seccion_id: v.seccion_id,
              fecha: v.fecha,
            },
          },
          create: v,
          update: {
            estado: v.estado,
            justificacion: v.justificacion,
            registrado_por: v.registrado_por,
            hora_registro: new Date(),
          },
        });
        affected++;
      }
    });
    return affected;
  },

  /** Lista asistencias con filtros opcionales. */
  list(filters: {
    seccionId?: string;
    alumnoId?: string;
    estado?: 'P' | 'F' | 'T' | 'J';
    fecha?: Date;
    fechaDesde?: Date;
    fechaHasta?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: Prisma.AsistenciaWhereInput = {};
    if (filters.seccionId) where.seccion_id = filters.seccionId;
    if (filters.alumnoId) where.alumno_id = filters.alumnoId;
    if (filters.estado) where.estado = filters.estado;
    if (filters.fecha) {
      where.fecha = filters.fecha;
    } else {
      if (filters.fechaDesde || filters.fechaHasta) {
        where.fecha = {
          ...(filters.fechaDesde ? { gte: filters.fechaDesde } : {}),
          ...(filters.fechaHasta ? { lte: filters.fechaHasta } : {}),
        };
      }
    }
    return prisma.asistencia.findMany({
      where,
      include: {
        alumno: { select: alumnoSelect },
        registrador: { select: registradorSelect },
        seccion: { select: seccionSelect },
      },
      orderBy: [{ fecha: 'desc' }, { alumno: { apellido_paterno: 'asc' } }],
      take: filters.limit ?? 1000,
      skip: filters.offset ?? 0,
    });
  },

  findById(id: string) {
    return prisma.asistencia.findUnique({
      where: { id },
      include: { alumno: { select: alumnoSelect } },
    });
  },

  update(id: string, data: Prisma.AsistenciaUpdateInput) {
    return prisma.asistencia.update({
      where: { id },
      data,
      include: { alumno: { select: alumnoSelect } },
    });
  },

  delete(id: string) {
    return prisma.asistencia.delete({ where: { id } });
  },

  /**
   * Resumen de asistencia por sección.
   *
   * A diferencia de la vista `v_resumen_asistencia` (que solo lista
   * alumnos con al menos un registro), aquí partimos de `alumno` con un
   * LEFT JOIN a `asistencia`, de modo que **todos los alumnos activos
   * matriculados en la sección** aparecen aunque aún no tengan registros
   * (totales en 0). Esto permite que el docente vea su lista completa
   * para pasar lista por primera vez y que el resumen del Admin sea
   * institucionalmente completo.
   */
  resumenPorSeccion(seccionId: string) {
    return prisma.$queryRaw<
      Array<{
        alumno_id: string;
        alumno_nombre: string;
        seccion_id: string;
        total_presentes: bigint;
        total_faltas: bigint;
        total_tardanzas: bigint;
        total_justificados: bigint;
        total_dias_registrados: bigint;
        porcentaje_asistencia: string | null;
      }>
    >`
      SELECT al.id                                            AS alumno_id,
             al.nombres || ' ' || al.apellido_paterno         AS alumno_nombre,
             s.id                                             AS seccion_id,
             COUNT(*) FILTER (WHERE a.estado = 'P')           AS total_presentes,
             COUNT(*) FILTER (WHERE a.estado = 'F')           AS total_faltas,
             COUNT(*) FILTER (WHERE a.estado = 'T')           AS total_tardanzas,
             COUNT(*) FILTER (WHERE a.estado = 'J')           AS total_justificados,
             COUNT(a.id)                                      AS total_dias_registrados,
             ROUND(
               COUNT(*) FILTER (WHERE a.estado = 'P') * 100.0
               / NULLIF(COUNT(a.id), 0), 1
             )                                                AS porcentaje_asistencia
      FROM   academic_schema.alumno  al
      JOIN   academic_schema.seccion s ON s.id = al.seccion_id
      LEFT   JOIN academic_schema.asistencia a
             ON a.alumno_id = al.id AND a.seccion_id = s.id
      WHERE  al.seccion_id = ${seccionId}::uuid
        AND  al.activo = TRUE
      GROUP  BY al.id, al.nombres, al.apellido_paterno, s.id
      ORDER  BY al.apellido_paterno, al.apellido_materno, al.nombres
    `;
  },

  /** Verifica que el docente tenga asignación activa en la sección. */
  async docenteTieneAsignacion(docenteId: string, seccionId: string): Promise<boolean> {
    const result = await prisma.asignacionDocente.findFirst({
      where: { docente_id: docenteId, seccion_id: seccionId, activo: true },
      select: { id: true },
    });
    return result !== null;
  },

  /**
   * Verifica que el docente tenga al menos un bloque de horario en la
   * sección para un día de la semana dado (1=Lun … 5=Vie).
   * Garantiza que solo se registre asistencia de clases realmente
   * programadas en el horario académico.
   */
  async docenteTieneClaseEnDia(
    docenteId: string,
    seccionId: string,
    diaSemana: number,
  ): Promise<boolean> {
    const result = await prisma.horario.findFirst({
      where: {
        dia_semana: diaSemana,
        asignacion: { docente_id: docenteId, seccion_id: seccionId, activo: true },
      },
      select: { id: true },
    });
    return result !== null;
  },

  /** Verifica que una sección tenga al menos un bloque de horario en el día. */
  async seccionTieneClaseEnDia(seccionId: string, diaSemana: number): Promise<boolean> {
    const result = await prisma.horario.findFirst({
      where: {
        dia_semana: diaSemana,
        asignacion: { seccion_id: seccionId, activo: true },
      },
      select: { id: true },
    });
    return result !== null;
  },

  /**
   * Retorna el conjunto de IDs de alumnos activos matriculados en la
   * sección. Usado para validar que la asistencia solo abarque alumnos
   * que realmente pertenecen a la sección.
   */
  async alumnosDeSeccion(seccionId: string): Promise<Set<string>> {
    const rows = await prisma.alumno.findMany({
      where: { seccion_id: seccionId, activo: true },
      select: { id: true },
    });
    return new Set(rows.map((r) => r.id));
  },
};
