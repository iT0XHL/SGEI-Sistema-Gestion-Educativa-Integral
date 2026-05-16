// ============================================================
//  modules/alumnos/alumnos.repository.ts
//  Un alumno = credencial + perfil_usuario + academic_schema.alumno.
// ============================================================
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { Tx } from '@/lib/audit-context';

export interface AlumnoData {
  seccion_id: string;
  periodo_id: string;
  dni: string;
  codigo_siagie?: string | null;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  fecha_nacimiento: Date;
  sexo: string;
  direccion?: string | null;
  distrito?: string | null;
  telefono_emergencia?: string | null;
  grupo_sanguineo?: string | null;
  condicion_especial?: string | null;
}

const alumnoInclude = {
  seccion: {
    select: {
      id: true,
      nombre: true,
      turno: true,
      grado: {
        select: {
          id: true,
          nombre: true,
          nivel: { select: { id: true, nombre: true } },
        },
      },
    },
  },
} satisfies Prisma.AlumnoInclude;

export const AlumnosRepository = {
  list(filters: {
    q?: string;
    nivelId?: string;
    gradoId?: string;
    seccionId?: string;
    periodoId?: string;
    activo?: boolean;
    page: number;
    limit: number;
  }) {
    const where: Prisma.AlumnoWhereInput = {};
    if (filters.activo !== undefined) where.activo = filters.activo;
    if (filters.periodoId) where.periodo_id = filters.periodoId;
    if (filters.seccionId) where.seccion_id = filters.seccionId;
    if (filters.gradoId || filters.nivelId) {
      where.seccion = {
        ...(filters.gradoId ? { grado_id: filters.gradoId } : {}),
        ...(filters.nivelId ? { grado: { nivel_id: filters.nivelId } } : {}),
      };
    }
    if (filters.q) {
      where.OR = [
        { nombres: { contains: filters.q, mode: 'insensitive' } },
        { apellido_paterno: { contains: filters.q, mode: 'insensitive' } },
        { apellido_materno: { contains: filters.q, mode: 'insensitive' } },
        { dni: { contains: filters.q } },
      ];
    }
    return Promise.all([
      prisma.alumno.findMany({
        where,
        include: alumnoInclude,
        orderBy: [{ apellido_paterno: 'asc' }, { apellido_materno: 'asc' }, { nombres: 'asc' }],
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.alumno.count({ where }),
    ]);
  },

  findById(id: string) {
    return prisma.alumno.findUnique({ where: { id }, include: alumnoInclude });
  },

  findByDni(dni: string) {
    return prisma.alumno.findUnique({ where: { dni } });
  },

  /** Nº de alumnos activos en una sección (control de cupo). */
  countActivosEnSeccion(seccionId: string) {
    return prisma.alumno.count({ where: { seccion_id: seccionId, activo: true } });
  },

  /** Crea credencial + perfil + alumno de forma atómica. */
  createWithAccount(input: {
    usuarioLogin: string;
    passwordHash: string;
    alumno: AlumnoData;
  }) {
    const alumnoId = randomUUID();
    return prisma.$transaction(async (tx) => {
      const cred = await tx.credencial.create({
        data: {
          usuario_login: input.usuarioLogin,
          password_hash: input.passwordHash,
        },
      });
      const perfil = await tx.perfilUsuario.create({
        data: {
          credencial_id: cred.id,
          rol: 'Alumno',
          entidad_tipo: 'alumno',
          entidad_id: alumnoId,
        },
      });
      return tx.alumno.create({
        data: {
          id: alumnoId,
          perfil_usuario_id: perfil.id,
          ...input.alumno,
        },
        include: alumnoInclude,
      });
    });
  },

  update(id: string, data: Prisma.AlumnoUpdateInput) {
    return prisma.alumno.update({ where: { id }, data, include: alumnoInclude });
  },

  setBloqueoManual(id: string, bloqueo: boolean) {
    return prisma.alumno.update({
      where: { id },
      data: { bloqueo_manual: bloqueo },
      include: alumnoInclude,
    });
  },

  /** Baja lógica: desactiva alumno + su credencial (Tx auditada). */
  async deactivate(tx: Tx, id: string, credencialId: string) {
    await tx.alumno.update({ where: { id }, data: { activo: false } });
    await tx.credencial.update({ where: { id: credencialId }, data: { activo: false } });
  },

  async getCredencialId(alumnoId: string): Promise<string | null> {
    const alumno = await prisma.alumno.findUnique({
      where: { id: alumnoId },
      select: { perfil: { select: { credencial_id: true } } },
    });
    return alumno?.perfil.credencial_id ?? null;
  },
};
