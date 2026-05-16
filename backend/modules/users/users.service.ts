// ============================================================
//  modules/users/users.service.ts — Gestión de cuentas (Admin).
//  Activar/desactivar son lógicos (nunca borrado físico).
// ============================================================
import { prisma } from '@/lib/prisma';
import { withAuditContext } from '@/lib/audit-context';
import { hashPassword } from '@/lib/password';
import { paginate } from '@/lib/response';
import { NotFoundError, ConflictError } from '@/errors/http-errors';
import { AuditService } from '@/modules/auditoria/audit.service';
import { UsersRepository, type ListFilters } from './users.repository';
import type { CreateUsuarioInput, UpdateUsuarioInput } from '@/schemas/usuarios.schema';
import type { RolUsuario } from '@/types/roles';

/** Cuenta tal como se expone al frontend (sin datos sensibles). */
export interface UsuarioDTO {
  id: string; // perfil_usuario.id
  usuario_login: string;
  rol: RolUsuario;
  entidad_tipo: string;
  entidad_id: string;
  activo: boolean;
  intentos_fallidos: number;
  bloqueado_hasta: Date | null;
  ultimo_acceso: Date | null;
  created_at: Date;
}

type PerfilRow = NonNullable<Awaited<ReturnType<typeof UsersRepository.findById>>>;

function toDTO(row: PerfilRow): UsuarioDTO {
  return {
    id: row.id,
    usuario_login: row.credencial.usuario_login,
    rol: row.rol,
    entidad_tipo: row.entidad_tipo,
    entidad_id: row.entidad_id,
    activo: row.credencial.activo,
    intentos_fallidos: row.credencial.intentos_fallidos,
    bloqueado_hasta: row.credencial.bloqueado_hasta,
    ultimo_acceso: row.credencial.ultimo_acceso,
    created_at: row.credencial.created_at,
  };
}

export const UsersService = {
  async list(filters: ListFilters) {
    const { rows, total } = await UsersRepository.list(filters);
    return paginate(rows.map(toDTO), filters.page, filters.limit, total);
  },

  async get(perfilId: string): Promise<UsuarioDTO> {
    const row = await UsersRepository.findById(perfilId);
    if (!row) throw new NotFoundError('Usuario');
    return toDTO(row);
  },

  /** Crea una cuenta de personal (Admin / Secretaria). */
  async createStaff(
    input: CreateUsuarioInput,
    adminPerfilId: string,
  ): Promise<UsuarioDTO> {
    const existing = await UsersRepository.findByLogin(input.usuario_login);
    if (existing) {
      throw new ConflictError('Ya existe una cuenta con ese correo institucional.');
    }
    const passwordHash = await hashPassword(input.password);
    const perfil = await UsersRepository.createStaffAccount({
      usuarioLogin: input.usuario_login,
      passwordHash,
      rol: input.rol,
    });
    await AuditService.log({
      usuarioId: adminPerfilId,
      tipo: 'CREATE',
      modulo: 'usuarios',
      entidadAfectada: 'perfil_usuario',
      entidadId: perfil.id,
      newValue: { usuario_login: input.usuario_login, rol: input.rol },
    });
    return toDTO(perfil);
  },

  async update(
    perfilId: string,
    input: UpdateUsuarioInput,
    adminPerfilId: string,
  ): Promise<UsuarioDTO> {
    const current = await UsersRepository.findById(perfilId);
    if (!current) throw new NotFoundError('Usuario');

    let result = current;
    if (input.rol && input.rol !== current.rol) {
      result = await UsersRepository.updateRol(perfilId, input.rol);
    }
    if (input.activo !== undefined && input.activo !== current.credencial.activo) {
      await this.setActivo(perfilId, input.activo, adminPerfilId);
      const refreshed = await UsersRepository.findById(perfilId);
      if (refreshed) result = refreshed;
    } else if (input.rol) {
      await AuditService.log({
        usuarioId: adminPerfilId,
        tipo: 'UPDATE',
        modulo: 'usuarios',
        entidadAfectada: 'perfil_usuario',
        entidadId: perfilId,
        oldValue: { rol: current.rol },
        newValue: { rol: input.rol },
      });
    }
    return toDTO(result);
  },

  /**
   * Activa/desactiva la cuenta (credencial.activo).
   * El UPDATE de credencial dispara tg_audit_credencial, por eso
   * corre dentro de withAuditContext.
   */
  async setActivo(
    perfilId: string,
    activo: boolean,
    adminPerfilId: string,
  ): Promise<UsuarioDTO> {
    const current = await UsersRepository.findById(perfilId);
    if (!current) throw new NotFoundError('Usuario');

    await withAuditContext(adminPerfilId, (tx) =>
      tx.credencial.update({
        where: { id: current.credencial.id },
        data: {
          activo,
          // Al reactivar, se limpia cualquier bloqueo por intentos.
          ...(activo ? { intentos_fallidos: 0, bloqueado_hasta: null } : {}),
        },
      }),
    );
    await AuditService.log({
      usuarioId: adminPerfilId,
      tipo: 'UPDATE',
      modulo: 'usuarios',
      entidadAfectada: 'credencial',
      entidadId: current.credencial.id,
      oldValue: { activo: current.credencial.activo },
      newValue: { activo },
    });
    const updated = await UsersRepository.findById(perfilId);
    return toDTO(updated!);
  },
};
