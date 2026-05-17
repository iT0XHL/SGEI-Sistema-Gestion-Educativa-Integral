// ============================================================
//  modules/asistencias/asistencia-docentes.repository.ts
//  UNIQUE (docente_id, fecha) — el upsert es idempotente.
//  `registrado_por` referencia auth_schema.perfil_usuario(id).
// ============================================================
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import type { GuardarAsistenciaDocenteInput } from './asistencia-docentes.schema';

const docenteSelect = {
  id: true,
  nombres: true,
  apellido_paterno: true,
  apellido_materno: true,
  dni: true,
  especialidad: true,
} satisfies Prisma.DocenteSelect;

export const AsistenciaDocentesRepository = {
  async upsertBatch(
    input: GuardarAsistenciaDocenteInput,
    adminPerfilId: string,
  ): Promise<number> {
    let affected = 0;
    await prisma.$transaction(async (tx) => {
      for (const r of input.registros) {
        await tx.asistenciaDocente.upsert({
          where: {
            docente_id_fecha: {
              docente_id: r.docente_id,
              fecha: new Date(input.fecha),
            },
          },
          create: {
            docente_id: r.docente_id,
            registrado_por: adminPerfilId,
            fecha: new Date(input.fecha),
            estado: r.estado,
            justificacion: r.justificacion ?? null,
          },
          update: {
            estado: r.estado,
            justificacion: r.justificacion ?? null,
            registrado_por: adminPerfilId,
            hora_registro: new Date(),
          },
        });
        affected++;
      }
    });
    return affected;
  },

  list(filters: {
    docenteId?: string;
    fecha?: Date;
    fechaDesde?: Date;
    fechaHasta?: Date;
  }) {
    const where: Prisma.AsistenciaDocenteWhereInput = {};
    if (filters.docenteId) where.docente_id = filters.docenteId;
    if (filters.fecha) {
      where.fecha = filters.fecha;
    } else if (filters.fechaDesde || filters.fechaHasta) {
      where.fecha = {
        ...(filters.fechaDesde ? { gte: filters.fechaDesde } : {}),
        ...(filters.fechaHasta ? { lte: filters.fechaHasta } : {}),
      };
    }
    return prisma.asistenciaDocente.findMany({
      where,
      include: { docente: { select: docenteSelect } },
      orderBy: [{ fecha: 'desc' }, { docente: { apellido_paterno: 'asc' } }],
    });
  },

  findById(id: string) {
    return prisma.asistenciaDocente.findUnique({
      where: { id },
      include: { docente: { select: docenteSelect } },
    });
  },

  update(id: string, data: Prisma.AsistenciaDocenteUpdateInput) {
    return prisma.asistenciaDocente.update({
      where: { id },
      data,
      include: { docente: { select: docenteSelect } },
    });
  },

  delete(id: string) {
    return prisma.asistenciaDocente.delete({ where: { id } });
  },
};
