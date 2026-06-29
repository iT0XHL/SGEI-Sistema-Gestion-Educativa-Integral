import { prisma } from '@/lib/prisma';
import { withAuditContext } from '@/lib/audit-context';
import { Prisma } from '@prisma/client';
import type { CreateAlumnoInput, UpdateAlumnoInput } from '@/schemas/personas.schema';

export interface ListFilters {
  q?: string;
  activo?: boolean;
  page: number;
  limit: number;
  nivelId?: string;
  gradoId?: string;
  seccionId?: string;
  periodoId?: string;
}

export const AlumnosRepository = {
  buildWhere(filters: ListFilters): Prisma.AlumnoWhereInput {
    const where: Prisma.AlumnoWhereInput = {};
    if (filters.activo !== undefined) where.activo = filters.activo;
    if (filters.seccionId) where.seccion_id = filters.seccionId;
    if (filters.periodoId) where.periodo_id = filters.periodoId;
    if (filters.gradoId || filters.nivelId) {
      const gradoWhere: Prisma.GradoWhereInput = {};
      if (filters.gradoId) gradoWhere.id = filters.gradoId;
      if (filters.nivelId) gradoWhere.nivel_id = filters.nivelId;
      where.seccion = { grado: gradoWhere };
    }
    if (filters.q) {
      where.OR = [
        { nombres: { contains: filters.q, mode: 'insensitive' } },
        { apellido_paterno: { contains: filters.q, mode: 'insensitive' } },
        { apellido_materno: { contains: filters.q, mode: 'insensitive' } },
        { dni: { contains: filters.q } },
      ];
    }
    return where;
  },

  async list(filters: ListFilters) {
    const where = this.buildWhere(filters);
    const [rows, total] = await Promise.all([
      prisma.alumno.findMany({
        where,
        select: {
          id: true,
          dni: true,
          nombres: true,
          apellido_paterno: true,
          apellido_materno: true,
          fecha_nacimiento: true,
          sexo: true,
          activo: true,
          bloqueo_manual: true,
          seccion: {
            select: {
              id: true,
              nombre: true,
              grado: {
                select: {
                  id: true,
                  nombre: true,
                  nivel: { select: { id: true, nombre: true } },
                },
              },
            },
          },
          perfil: { select: { credencial: { select: { usuario_login: true } } } },
        },
        orderBy: { apellido_paterno: 'asc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.alumno.count({ where }),
    ]);
    return { rows, total };
  },

  async findById(alumnoId: string) {
    return prisma.alumno.findUnique({
      where: { id: alumnoId },
      select: {
        id: true,
        dni: true,
        nombres: true,
        apellido_paterno: true,
        apellido_materno: true,
        fecha_nacimiento: true,
        sexo: true,
        direccion: true,
        distrito: true,
        telefono_emergencia: true,
        grupo_sanguineo: true,
        condicion_especial: true,
        codigo_siagie: true,
        activo: true,
        seccion_id: true,
        periodo_id: true,
        perfil_usuario_id: true,
        seccion: {
            select: {
              id: true,
              nombre: true,
              grado: {
                select: {
                  id: true,
                  nombre: true,
                  nivel: { select: { id: true, nombre: true } },
                },
              },
            },
          },
        perfil: { select: { credencial: { select: { usuario_login: true, id: true, activo: true } } } },
      },
    });
  },

  async findByDNI(dni: string, periodoId: string) {
    return prisma.alumno.findFirst({
      where: { dni, periodo_id: periodoId },
      select: { id: true },
    });
  },

  async create(input: CreateAlumnoInput & { perfilUsuarioId: string }, perfilId: string) {
    return withAuditContext(perfilId, async (tx) => {
      return tx.alumno.create({
        data: {
          perfil_usuario_id: input.perfilUsuarioId,
          seccion_id: input.seccion_id,
          periodo_id: input.periodo_id,
          dni: input.dni,
          nombres: input.nombres,
          apellido_paterno: input.apellido_paterno,
          apellido_materno: input.apellido_materno,
          fecha_nacimiento: new Date(input.fecha_nacimiento),
          sexo: input.sexo,
          direccion: input.direccion ?? null,
          distrito: input.distrito ?? null,
          telefono_emergencia: input.telefono_emergencia ?? null,
          grupo_sanguineo: input.grupo_sanguineo ?? null,
          condicion_especial: input.condicion_especial ?? null,
          codigo_siagie: input.codigo_siagie ?? null,
        },
        select: {
          id: true,
          dni: true,
          nombres: true,
          apellido_paterno: true,
          apellido_materno: true,
          fecha_nacimiento: true,
          sexo: true,
          direccion: true,
          distrito: true,
          telefono_emergencia: true,
          grupo_sanguineo: true,
          condicion_especial: true,
          codigo_siagie: true,
          activo: true,
        },
      });
    });
  },

  async update(alumnoId: string, input: UpdateAlumnoInput, perfilId: string) {
    return withAuditContext(perfilId, async (tx) => {
      return tx.alumno.update({
        where: { id: alumnoId },
        data: {
          ...(input.nombres && { nombres: input.nombres }),
          ...(input.apellido_paterno && { apellido_paterno: input.apellido_paterno }),
          ...(input.apellido_materno && { apellido_materno: input.apellido_materno }),
          ...(input.dni && { dni: input.dni }),
          ...(input.fecha_nacimiento && { fecha_nacimiento: new Date(input.fecha_nacimiento) }),
          ...(input.sexo && { sexo: input.sexo }),
          ...(input.direccion !== undefined && { direccion: input.direccion }),
          ...(input.distrito !== undefined && { distrito: input.distrito }),
          ...(input.telefono_emergencia !== undefined && { telefono_emergencia: input.telefono_emergencia }),
          ...(input.grupo_sanguineo !== undefined && { grupo_sanguineo: input.grupo_sanguineo }),
          ...(input.condicion_especial !== undefined && { condicion_especial: input.condicion_especial }),
          ...(input.codigo_siagie !== undefined && { codigo_siagie: input.codigo_siagie }),
          ...(input.seccion_id && { seccion_id: input.seccion_id }),
        },
      });
    });
  },

  async setActivo(alumnoId: string, activo: boolean, perfilId: string) {
    return withAuditContext(perfilId, async (tx) => {
      return tx.alumno.update({
        where: { id: alumnoId },
        data: { activo },
      });
    });
  },

  async setBloqueoManual(alumnoId: string, bloqueado: boolean, perfilId: string) {
    return withAuditContext(perfilId, async (tx) => {
      return tx.alumno.update({
        where: { id: alumnoId },
        data: { bloqueo_manual: bloqueado },
      });
    });
  },
};
