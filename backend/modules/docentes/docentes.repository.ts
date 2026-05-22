import { prisma } from '@/lib/prisma';
import { withAuditContext } from '@/lib/audit-context';
import { Prisma } from '@prisma/client';
import type { CreateDocenteInput, UpdateDocenteInput } from '@/schemas/personas.schema';

export interface ListFilters {
  q?: string;
  activo?: boolean;
  page: number;
  limit: number;
}

export const DocentesRepository = {
  buildWhere(filters: ListFilters): Prisma.DocenteWhereInput {
    const where: Prisma.DocenteWhereInput = {};
    if (filters.activo !== undefined) where.activo = filters.activo;
    if (filters.q) {
      where.OR = [
        { nombres: { contains: filters.q, mode: 'insensitive' } },
        { apellido_paterno: { contains: filters.q, mode: 'insensitive' } },
        { dni: { contains: filters.q } },
      ];
    }
    return where;
  },

  async list(filters: ListFilters) {
    const where = this.buildWhere(filters);
    const [rows, total] = await Promise.all([
      prisma.docente.findMany({
        where,
        select: {
          id: true,
          dni: true,
          nombres: true,
          apellido_paterno: true,
          apellido_materno: true,
          especialidad: true,
          telefono: true,
          email_institucional: true,
          fecha_nacimiento: true,
          sexo: true,
          titulo_profesional: true,
          fecha_ingreso: true,
          activo: true,
          perfil: { select: { credencial: { select: { usuario_login: true } } } },
        },
        orderBy: { apellido_paterno: 'asc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.docente.count({ where }),
    ]);
    return { rows, total };
  },

  async findById(docenteId: string) {
    return prisma.docente.findUnique({
      where: { id: docenteId },
      select: {
        id: true,
        dni: true,
        nombres: true,
        apellido_paterno: true,
        apellido_materno: true,
        especialidad: true,
        telefono: true,
        email_institucional: true,
        fecha_nacimiento: true,
        sexo: true,
        titulo_profesional: true,
        fecha_ingreso: true,
        activo: true,
        perfil_usuario_id: true,
        perfil: { select: { credencial: { select: { usuario_login: true, id: true, activo: true } } } },
      },
    });
  },

  async findByDNI(dni: string) {
    return prisma.docente.findUnique({
      where: { dni },
      select: { id: true },
    });
  },

  async create(input: CreateDocenteInput & { perfilUsuarioId: string }, perfilId: string) {
    return withAuditContext(perfilId, async (tx) => {
      return tx.docente.create({
        data: {
          perfil_usuario_id: input.perfilUsuarioId,
          dni: input.dni,
          nombres: input.nombres,
          apellido_paterno: input.apellido_paterno,
          apellido_materno: input.apellido_materno,
          especialidad: input.especialidad,
          telefono: input.telefono,
          email_institucional: input.email_institucional ?? null,
          fecha_nacimiento: input.fecha_nacimiento ? new Date(input.fecha_nacimiento) : null,
          sexo: input.sexo ?? null,
          titulo_profesional: input.titulo_profesional ?? null,
          fecha_ingreso: input.fecha_ingreso ? new Date(input.fecha_ingreso) : new Date(),
        },
        select: {
          id: true,
          dni: true,
          nombres: true,
          apellido_paterno: true,
          apellido_materno: true,
          especialidad: true,
          telefono: true,
          email_institucional: true,
          fecha_nacimiento: true,
          sexo: true,
          titulo_profesional: true,
          fecha_ingreso: true,
          activo: true,
        },
      });
    });
  },

  async update(docenteId: string, input: UpdateDocenteInput, perfilId: string) {
    return withAuditContext(perfilId, async (tx) => {
      return tx.docente.update({
        where: { id: docenteId },
        data: {
          ...(input.nombres && { nombres: input.nombres }),
          ...(input.apellido_paterno && { apellido_paterno: input.apellido_paterno }),
          ...(input.apellido_materno && { apellido_materno: input.apellido_materno }),
          ...(input.dni && { dni: input.dni }),
          ...(input.especialidad && { especialidad: input.especialidad }),
          ...(input.telefono && { telefono: input.telefono }),
          ...(input.email_institucional !== undefined && { email_institucional: input.email_institucional }),
          ...(input.fecha_nacimiento !== undefined && { fecha_nacimiento: input.fecha_nacimiento ? new Date(input.fecha_nacimiento) : null }),
          ...(input.sexo !== undefined && { sexo: input.sexo }),
          ...(input.titulo_profesional !== undefined && { titulo_profesional: input.titulo_profesional }),
          ...(input.fecha_ingreso !== undefined && { fecha_ingreso: input.fecha_ingreso ? new Date(input.fecha_ingreso) : null }),
        },
      });
    });
  },

  async setActivo(docenteId: string, activo: boolean, perfilId: string) {
    return withAuditContext(perfilId, async (tx) => {
      return tx.docente.update({
        where: { id: docenteId },
        data: { activo },
      });
    });
  },
};
