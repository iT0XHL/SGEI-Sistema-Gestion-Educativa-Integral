// ============================================================
//  modules/auth/auth.repository.ts — Acceso a datos de Auth.
//  Tablas: auth_schema.credencial, auth_schema.perfil_usuario.
//  Las escrituras sobre `credencial` reciben un cliente `tx`
//  porque deben correr dentro de withAuditContext (trigger
//  tg_audit_credencial).
// ============================================================
import { prisma } from '@/lib/prisma';
import type { Tx } from '@/lib/audit-context';

const LOCK_MINUTES = 30;
const MAX_FAILED_ATTEMPTS = 5;

export const AuthRepository = {
  /** Busca la credencial por su login (correo institucional). */
  findCredencialByLogin(login: string) {
    return prisma.credencial.findUnique({ where: { usuario_login: login } });
  },

  findCredencialById(id: string) {
    return prisma.credencial.findUnique({ where: { id } });
  },

  /** Perfil asociado a una credencial (rol + entidad). */
  getPerfilByCredencialId(credencialId: string) {
    return prisma.perfilUsuario.findUnique({
      where: { credencial_id: credencialId },
    });
  },

  getPerfilById(perfilId: string) {
    return prisma.perfilUsuario.findUnique({ where: { id: perfilId } });
  },

  /**
   * Suma 1 a intentos_fallidos y, si llega al máximo, bloquea la
   * cuenta por LOCK_MINUTES. Devuelve el conteo resultante.
   * DEBE ejecutarse dentro de withAuditContext.
   */
  async registerFailedAttempt(tx: Tx, credencialId: string): Promise<number> {
    const updated = await tx.credencial.update({
      where: { id: credencialId },
      data: { intentos_fallidos: { increment: 1 } },
      select: { intentos_fallidos: true },
    });
    if (updated.intentos_fallidos >= MAX_FAILED_ATTEMPTS) {
      await tx.credencial.update({
        where: { id: credencialId },
        data: { bloqueado_hasta: new Date(Date.now() + LOCK_MINUTES * 60_000) },
      });
    }
    return updated.intentos_fallidos;
  },

  /** Login exitoso: limpia intentos, desbloquea y marca acceso. */
  async resetFailedAttempts(tx: Tx, credencialId: string): Promise<void> {
    await tx.credencial.update({
      where: { id: credencialId },
      data: {
        intentos_fallidos: 0,
        bloqueado_hasta: null,
        ultimo_acceso: new Date(),
      },
    });
  },

  /** Actualiza el hash de contraseña. DEBE ir en withAuditContext. */
  async updatePasswordHash(tx: Tx, credencialId: string, hash: string): Promise<void> {
    await tx.credencial.update({
      where: { id: credencialId },
      data: { password_hash: hash },
    });
  },

  /** Cambio obligatorio: actualiza hash + limpia flag. DEBE ir en withAuditContext. */
  async forceUpdatePassword(tx: Tx, credencialId: string, hash: string): Promise<void> {
    await tx.credencial.update({
      where: { id: credencialId },
      data: { password_hash: hash, debe_cambiar_password: false },
    });
  },

  /** Cuenta solicitudes de recuperación recientes (rate limiting básico). */
  contarTokensRecientes(credencialId: string, desde: Date) {
    return prisma.tokenRecuperacion.count({
      where: { credencial_id: credencialId, created_at: { gte: desde } },
    });
  },

  crearTokenRecuperacion(credencialId: string, tokenHash: string, expiraEn: Date) {
    return prisma.tokenRecuperacion.create({
      data: { credencial_id: credencialId, token_hash: tokenHash, expira_en: expiraEn },
    });
  },

  buscarTokenRecuperacionValido(tokenHash: string) {
    return prisma.tokenRecuperacion.findFirst({
      where: { token_hash: tokenHash, usado: false, expira_en: { gt: new Date() } },
    });
  },

  marcarTokenRecuperacionUsado(id: string) {
    return prisma.tokenRecuperacion.update({ where: { id }, data: { usado: true } });
  },
};

export { MAX_FAILED_ATTEMPTS };
