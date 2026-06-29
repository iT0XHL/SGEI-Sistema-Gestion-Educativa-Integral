import { prisma } from '@/lib/prisma';
import { withAuditContext } from '@/lib/audit-context';
import { Prisma } from '@prisma/client';
import type { CreatePeriodoInput, UpdatePeriodoInput, CreateBimestreInput, UpdateBimestreInput } from '@/schemas/periodo.schema';

export interface ListFilters {
  activo?: boolean;
  page: number;
  limit: number;
}

export interface BimestreFilters {
  periodoId?: string;
  page: number;
  limit: number;
}

export const PeriodoRepository = {
  async list(filters: ListFilters) {
    const where: Prisma.PeriodoAcademicoWhereInput = {};
    if (filters.activo !== undefined) where.activo = filters.activo;

    const [rows, total] = await Promise.all([
      prisma.periodoAcademico.findMany({
        where,
        orderBy: { anio: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.periodoAcademico.count({ where }),
    ]);
    return { rows, total };
  },

  async findById(id: string) {
    return prisma.periodoAcademico.findUnique({ where: { id } });
  },

  async create(input: CreatePeriodoInput, perfilId: string) {
    return withAuditContext(perfilId, async (tx) => {
      return tx.periodoAcademico.create({
        data: {
          anio: input.anio,
          nombre: input.nombre,
          fecha_inicio: input.fecha_inicio,
          fecha_fin: input.fecha_fin,
          activo: input.activo,
        },
      });
    });
  },

  async update(id: string, input: UpdatePeriodoInput, perfilId: string) {
    return withAuditContext(perfilId, async (tx) => {
      return tx.periodoAcademico.update({
        where: { id },
        data: {
          ...(input.nombre && { nombre: input.nombre }),
          ...(input.fecha_inicio && { fecha_inicio: input.fecha_inicio }),
          ...(input.fecha_fin && { fecha_fin: input.fecha_fin }),
          ...(input.activo !== undefined && { activo: input.activo }),
        },
      });
    });
  },

  async setActivo(id: string, activo: boolean, perfilId: string) {
    return withAuditContext(perfilId, async (tx) => {
      return tx.periodoAcademico.update({
        where: { id },
        data: { activo },
      });
    });
  },

  async delete(id: string, perfilId: string) {
    return withAuditContext(perfilId, async (tx) => {
      return tx.periodoAcademico.delete({ where: { id } });
    });
  },
};

export const BimestreRepository = {
  async list(filters: BimestreFilters) {
    const where: Prisma.BimestreWhereInput = {};
    if (filters.periodoId) where.periodo_id = filters.periodoId;

    const [rows, total] = await Promise.all([
      prisma.bimestre.findMany({
        where,
        include: { periodo: { select: { nombre: true, anio: true } } },
        orderBy: { numero: 'asc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.bimestre.count({ where }),
    ]);
    return { rows, total };
  },

  async findById(id: string) {
    return prisma.bimestre.findUnique({
      where: { id },
      include: { periodo: true },
    });
  },

  async create(input: CreateBimestreInput, perfilId: string) {
    return withAuditContext(perfilId, async (tx) => {
      return tx.bimestre.create({
        data: {
          periodo_id: input.periodo_id,
          numero: input.numero,
          nombre: input.nombre,
          fecha_inicio: input.fecha_inicio,
          fecha_fin: input.fecha_fin,
        },
        include: { periodo: true },
      });
    });
  },

  async update(id: string, input: UpdateBimestreInput, perfilId: string) {
    return withAuditContext(perfilId, async (tx) => {
      return tx.bimestre.update({
        where: { id },
        data: {
          ...(input.nombre && { nombre: input.nombre }),
          ...(input.fecha_inicio && { fecha_inicio: input.fecha_inicio }),
          ...(input.fecha_fin && { fecha_fin: input.fecha_fin }),
          ...(input.cerrado !== undefined && { cerrado: input.cerrado }),
        },
        include: { periodo: true },
      });
    });
  },

  async delete(id: string, perfilId: string) {
    return withAuditContext(perfilId, async (tx) => {
      return tx.bimestre.delete({ where: { id } });
    });
  },

  async cerrar(id: string, perfilId: string) {
    return withAuditContext(perfilId, async (tx) => {
      return tx.bimestre.update({
        where: { id },
        data: { cerrado: true },
        include: { periodo: true },
      });
    });
  },
};
