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
    fecha?: Date;
    fechaDesde?: Date;
    fechaHasta?: Date;
  }) {
    const where: Prisma.AsistenciaWhereInput = {};
    if (filters.seccionId) where.seccion_id = filters.seccionId;
    if (filters.alumnoId) where.alumno_id = filters.alumnoId;
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
      include: { alumno: { select: alumnoSelect } },
      orderBy: [{ fecha: 'desc' }, { alumno: { apellido_paterno: 'asc' } }],
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

  /** Resumen por sección usando la vista v_resumen_asistencia. */
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
      SELECT alumno_id, alumno_nombre, seccion_id,
             total_presentes, total_faltas, total_tardanzas,
             total_justificados, total_dias_registrados,
             porcentaje_asistencia
      FROM   academic_schema.v_resumen_asistencia
      WHERE  seccion_id = ${seccionId}::uuid
      ORDER  BY alumno_nombre
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
};
