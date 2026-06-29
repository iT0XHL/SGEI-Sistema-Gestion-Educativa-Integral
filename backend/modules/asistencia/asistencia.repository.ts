// ============================================================
//  modules/asistencia/asistencia.repository.ts — Acceso a datos
//  de asistencia docente con filtros avanzados.
// ============================================================
import { prisma } from '@/lib/prisma';
import { withAuditContext } from '@/lib/audit-context';
import { Prisma } from '@prisma/client';
import type { CreateAsistenciaInput, UpdateAsistenciaInput } from '@/schemas/asistencia.schema';

export interface ListFilters {
  docenteId?: string;
  fecha_inicio?: Date;
  fecha_fin?: Date;
  estado?: 'P' | 'F' | 'T' | 'J';
  page: number;
  limit: number;
}

export const AsistenciaRepository = {
  buildWhere(filters: ListFilters): Prisma.AsistenciaDocenteWhereInput {
    const where: Prisma.AsistenciaDocenteWhereInput = {};
    if (filters.docenteId) where.docente_id = filters.docenteId;
    if (filters.estado) where.estado = filters.estado;
    if (filters.fecha_inicio || filters.fecha_fin) {
      where.fecha = {};
      if (filters.fecha_inicio) where.fecha.gte = filters.fecha_inicio;
      if (filters.fecha_fin) where.fecha.lte = filters.fecha_fin;
    }
    return where;
  },

  async list(filters: ListFilters) {
    const where = this.buildWhere(filters);
    const [rows, total] = await Promise.all([
      prisma.asistenciaDocente.findMany({
        where,
        select: {
          id: true,
          docente_id: true,
          fecha: true,
          estado: true,
          justificacion: true,
          hora_registro: true,
          docente: { select: { nombres: true, apellido_paterno: true, apellido_materno: true, dni: true } },
          registrador: { select: { credencial: { select: { usuario_login: true } } } },
        },
        orderBy: { fecha: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.asistenciaDocente.count({ where }),
    ]);
    return { rows, total };
  },

  async findById(id: string) {
    return prisma.asistenciaDocente.findUnique({
      where: { id },
      select: {
        id: true,
        docente_id: true,
        fecha: true,
        estado: true,
        justificacion: true,
        hora_registro: true,
        docente: { select: { id: true, nombres: true, apellido_paterno: true, apellido_materno: true, dni: true } },
        registrador: { select: { credencial: { select: { usuario_login: true } } } },
      },
    });
  },

  async create(input: CreateAsistenciaInput, registradoPorId: string) {
    return withAuditContext(registradoPorId, async (tx) => {
      return tx.asistenciaDocente.create({
        data: {
          docente_id: input.docente_id,
          registrado_por: registradoPorId,
          fecha: input.fecha,
          estado: input.estado,
          justificacion: input.justificacion ?? null,
        },
        select: {
          id: true,
          docente_id: true,
          fecha: true,
          estado: true,
          justificacion: true,
          hora_registro: true,
        },
      });
    });
  },

  async update(id: string, input: UpdateAsistenciaInput, registradoPorId: string) {
    return withAuditContext(registradoPorId, async (tx) => {
      return tx.asistenciaDocente.update({
        where: { id },
        data: {
          ...(input.estado && { estado: input.estado }),
          ...(input.justificacion !== undefined && { justificacion: input.justificacion }),
        },
        select: {
          id: true,
          docente_id: true,
          fecha: true,
          estado: true,
          justificacion: true,
          hora_registro: true,
        },
      });
    });
  },

  async findByDocenteAndFecha(docenteId: string, fecha: Date) {
    return prisma.asistenciaDocente.findUnique({
      where: { docente_id_fecha: { docente_id: docenteId, fecha } },
      select: { id: true },
    });
  },

  async delete(id: string, registradoPorId: string) {
    return withAuditContext(registradoPorId, async (tx) => {
      return tx.asistenciaDocente.delete({
        where: { id },
      });
    });
  },
};
