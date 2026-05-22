// ============================================================
//  modules/users/users.repository.ts — Acceso a datos de Cuentas.
//  Una "cuenta" = auth_schema.credencial + auth_schema.perfil_usuario.
// ============================================================
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { RolUsuario } from '@/types/roles';

/** SELECT seguro de credencial — NUNCA incluye password_hash. */
const credencialSafeSelect = {
  id: true,
  usuario_login: true,
  activo: true,
  intentos_fallidos: true,
  bloqueado_hasta: true,
  ultimo_acceso: true,
  created_at: true,
} satisfies Prisma.CredencialSelect;

const perfilWithCredencial = {
  id: true,
  rol: true,
  entidad_tipo: true,
  entidad_id: true,
  created_at: true,
  credencial: { select: credencialSafeSelect },
} satisfies Prisma.PerfilUsuarioSelect;

export interface ListFilters {
  q?: string;
  rol?: RolUsuario;
  activo?: boolean;
  page: number;
  limit: number;
}

export const UsersRepository = {
  buildWhere(filters: ListFilters): Prisma.PerfilUsuarioWhereInput {
    const where: Prisma.PerfilUsuarioWhereInput = {};
    if (filters.rol) where.rol = filters.rol;
    if (filters.q || filters.activo !== undefined) {
      where.credencial = {};
      if (filters.q) {
        where.credencial.usuario_login = {
          contains: filters.q,
          mode: 'insensitive',
        };
      }
      if (filters.activo !== undefined) where.credencial.activo = filters.activo;
    }
    return where;
  },

  async list(filters: ListFilters) {
    const where = this.buildWhere(filters);
    const [rows, total] = await Promise.all([
      prisma.perfilUsuario.findMany({
        where,
        select: perfilWithCredencial,
        orderBy: { created_at: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.perfilUsuario.count({ where }),
    ]);
    return { rows, total };
  },

  findById(perfilId: string) {
    return prisma.perfilUsuario.findUnique({
      where: { id: perfilId },
      select: perfilWithCredencial,
    });
  },

  /**
   * Busca perfil CON password_hash (solo para verificación de cambio de contraseña).
   * NUNCA exponer esto en API responses.
   */
  async findByIdWithPassword(perfilId: string) {
    return prisma.perfilUsuario.findUnique({
      where: { id: perfilId },
      select: {
        id: true,
        rol: true,
        entidad_tipo: true,
        entidad_id: true,
        created_at: true,
        credencial: { select: { id: true, usuario_login: true, password_hash: true, activo: true } },
      },
    });
  },

  findByLogin(login: string) {
    return prisma.credencial.findUnique({
      where: { usuario_login: login },
      select: { id: true },
    });
  },

  /** Crea credencial + perfil de forma atómica (personal Admin/Secretaria). */
  async createStaffAccount(input: {
    usuarioLogin: string;
    passwordHash: string;
    rol: 'Admin' | 'Secretaria';
  }) {
    return prisma.$transaction(async (tx) => {
      const cred = await tx.credencial.create({
        data: {
          usuario_login: input.usuarioLogin,
          password_hash: input.passwordHash,
        },
        select: credencialSafeSelect,
      });
      // Sin tabla de entidad para Admin/Secretaria en el DDL:
      // entidad_id apunta a la propia credencial como referencia estable.
      const perfil = await tx.perfilUsuario.create({
        data: {
          credencial_id: cred.id,
          rol: input.rol,
          entidad_tipo: input.rol.toLowerCase(),
          entidad_id: cred.id,
        },
        select: perfilWithCredencial,
      });
      return perfil;
    });
  },

  updateRol(perfilId: string, rol: RolUsuario) {
    return prisma.perfilUsuario.update({
      where: { id: perfilId },
      data: { rol },
      select: perfilWithCredencial,
    });
  },

  updateLogin(credencialId: string, usuarioLogin: string) {
    return prisma.credencial.update({
      where: { id: credencialId },
      data: { usuario_login: usuarioLogin },
      select: credencialSafeSelect,
    });
  },
};

export { credencialSafeSelect, perfilWithCredencial };
