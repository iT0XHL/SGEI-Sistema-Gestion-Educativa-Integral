// ============================================================
//  modules/auth/auth.service.ts — Lógica de autenticación.
//  Reglas: bcrypt compare, bloqueo tras 5 intentos, JWT en
//  cookie HttpOnly, auditoría LOGIN/LOGOUT.
// ============================================================
import { randomBytes, createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import { verifyPassword, hashPassword } from '@/lib/password';
import { signToken } from '@/lib/jwt';
import { withAuditContext } from '@/lib/audit-context';
import { revokeUserTokens } from '@/lib/token-blacklist';
import { ResendEmailSender } from '@/lib/email/resend-email-sender';
import {
  UnauthorizedError,
  AccountLockedError,
  BusinessRuleError,
  NotFoundError,
} from '@/errors/http-errors';
import { AuthRepository, MAX_FAILED_ATTEMPTS } from './auth.repository';
import { AuditService } from '@/modules/auditoria/audit.service';
import { REDIRECT_BY_ROLE, type LoginResult, type SessionUser } from './auth.types';
import type { LoginInput, ChangePasswordInput, ForgotPasswordInput, ResetPasswordInput, ForceChangePasswordInput } from '@/schemas/auth.schema';

const RESET_TOKEN_TTL_MIN = 30;
const RESET_MAX_SOLICITUDES = 3;
const RESET_VENTANA_MIN = 15;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

interface PerfilLike {
  id: string;
  rol: string;
  entidad_id: string;
  entidad_tipo: string;
}

/**
 * Resuelve el nombre para mostrar:
 *  - docente / alumno → nombres + apellidos de su tabla.
 *  - admin / secretaria → no existe tabla de entidad en el DDL;
 *    se usa el correo (usuario_login) como nombre visible.
 */
async function resolveNombre(perfil: PerfilLike, login: string): Promise<string> {
  if (perfil.entidad_tipo === 'docente') {
    const d = await prisma.docente.findUnique({
      where: { id: perfil.entidad_id },
      select: { nombres: true, apellido_paterno: true, apellido_materno: true },
    });
    if (d) return `${d.nombres} ${d.apellido_paterno} ${d.apellido_materno}`.trim();
  }
  if (perfil.entidad_tipo === 'alumno') {
    const a = await prisma.alumno.findUnique({
      where: { id: perfil.entidad_id },
      select: { nombres: true, apellido_paterno: true, apellido_materno: true },
    });
    if (a) return `${a.nombres} ${a.apellido_paterno} ${a.apellido_materno}`.trim();
  }
  return login;
}

export const AuthService = {
  /** Autentica al usuario y devuelve token + datos de sesión. */
  async login(
    input: LoginInput,
    meta: { ip?: string; userAgent?: string },
  ): Promise<LoginResult> {
    const cred = await AuthRepository.findCredencialByLogin(input.email);
    // Mensaje genérico: no revelar si el usuario existe.
    if (!cred) {
      throw new UnauthorizedError('INVALID_CREDENTIALS', 'Credenciales incorrectas.');
    }

    const perfil = await AuthRepository.getPerfilByCredencialId(cred.id);
    if (!perfil) {
      // Credencial sin perfil: cuenta inconsistente, no auditable.
      throw new UnauthorizedError('INVALID_CREDENTIALS', 'Credenciales incorrectas.');
    }

    // Cuenta bloqueada temporalmente.
    if (cred.bloqueado_hasta && cred.bloqueado_hasta > new Date()) {
      const hora = cred.bloqueado_hasta.toLocaleTimeString('es-PE', {
        hour: '2-digit',
        minute: '2-digit',
      });
      throw new AccountLockedError(
        `Cuenta bloqueada por intentos fallidos. Intenta nuevamente después de las ${hora}.`,
        { bloqueado_hasta: cred.bloqueado_hasta },
      );
    }

    // Cuenta desactivada por un administrador.
    if (!cred.activo) {
      throw new UnauthorizedError(
        'ACCOUNT_INACTIVE',
        'La cuenta está desactivada. Contacta a Secretaría.',
      );
    }

    // Verificación de contraseña.
    const valid = await verifyPassword(input.password, cred.password_hash);
    if (!valid) {
      const intentos = await withAuditContext(perfil.id, (tx) =>
        AuthRepository.registerFailedAttempt(tx, cred.id),
      );
      const restantes = Math.max(0, MAX_FAILED_ATTEMPTS - intentos);
      if (restantes === 0) {
        throw new AccountLockedError(
          'Cuenta bloqueada por superar los intentos permitidos. Intenta de nuevo en 30 minutos.',
        );
      }
      throw new UnauthorizedError(
        'INVALID_CREDENTIALS',
        `Credenciales incorrectas. Te ${restantes === 1 ? 'queda' : 'quedan'} ${restantes} ${restantes === 1 ? 'intento' : 'intentos'}.`,
      );
    }

    // El rol seleccionado en el login debe coincidir con el perfil.
    if (perfil.rol !== input.rol) {
      throw new UnauthorizedError(
        'ROLE_MISMATCH',
        'El perfil seleccionado no corresponde a esta cuenta.',
      );
    }

    // Login correcto: reinicia intentos y marca último acceso.
    await withAuditContext(perfil.id, (tx) =>
      AuthRepository.resetFailedAttempts(tx, cred.id),
    );

    const nombre = await resolveNombre(perfil, cred.usuario_login);
    const token = signToken({
      sub: cred.id,
      perfilId: perfil.id,
      rol: perfil.rol,
      entidadId: perfil.entidad_id,
      entidadTipo: perfil.entidad_tipo,
      nombre,
    });

    await AuditService.log({
      usuarioId: perfil.id,
      tipo: 'LOGIN',
      modulo: 'auth',
      entidadAfectada: 'credencial',
      entidadId: cred.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    const user: SessionUser = {
      id: perfil.id,
      rol: perfil.rol,
      nombre,
      entidadId: perfil.entidad_id,
      entidadTipo: perfil.entidad_tipo,
    };
    const debeCambiarPassword = cred.debe_cambiar_password ?? false;
    return { token, user, redirectTo: REDIRECT_BY_ROLE[perfil.rol], debeCambiarPassword };
  },

  /** Registra el evento de cierre de sesión. */
  async logout(
    perfilId: string,
    meta: { ip?: string; userAgent?: string },
  ): Promise<void> {
    await AuditService.log({
      usuarioId: perfilId,
      tipo: 'LOGOUT',
      modulo: 'auth',
      entidadAfectada: 'credencial',
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  },

  /** Devuelve el perfil de sesión actual (datos frescos de la DB). */
  async me(perfilId: string): Promise<SessionUser> {
    const perfil = await AuthRepository.getPerfilById(perfilId);
    if (!perfil) throw new NotFoundError('Perfil de usuario');
    const cred = await AuthRepository.findCredencialById(perfil.credencial_id);
    if (!cred || !cred.activo) {
      throw new UnauthorizedError('ACCOUNT_INACTIVE', 'La cuenta ya no está activa.');
    }
    const nombre = await resolveNombre(perfil, cred.usuario_login);
    return {
      id: perfil.id,
      rol: perfil.rol,
      nombre,
      entidadId: perfil.entidad_id,
      entidadTipo: perfil.entidad_tipo,
    };
  },

  /** Cambio de contraseña del propio usuario autenticado. */
  async changePassword(
    perfilId: string,
    credencialId: string,
    input: ChangePasswordInput,
  ): Promise<void> {
    const cred = await AuthRepository.findCredencialById(credencialId);
    if (!cred) throw new NotFoundError('Credencial');

    const valid = await verifyPassword(input.password_actual, cred.password_hash);
    if (!valid) {
      throw new UnauthorizedError(
        'INVALID_CREDENTIALS',
        'La contraseña actual es incorrecta.',
      );
    }

    const hash = await hashPassword(input.password_nueva);
    await withAuditContext(perfilId, (tx) =>
      AuthRepository.updatePasswordHash(tx, credencialId, hash),
    );
  },

  /**
   * Cambio OBLIGATORIO de contraseña (primer inicio o reseteo por admin).
   * No requiere password_actual; solo funciona si debe_cambiar_password = true.
   * Revoca tokens viejos y emite uno nuevo.
   */
  async forceChangePassword(
    perfilId: string,
    credencialId: string,
    input: ForceChangePasswordInput,
  ): Promise<LoginResult> {
    const cred = await AuthRepository.findCredencialById(credencialId);
    if (!cred) throw new NotFoundError('Credencial');
    if (!cred.debe_cambiar_password) {
      throw new BusinessRuleError(
        'NO_REQUIRED',
        'No es necesario cambiar la contraseña en este momento.',
      );
    }

    const hash = await hashPassword(input.password_nueva);
    await withAuditContext(perfilId, (tx) =>
      AuthRepository.forceUpdatePassword(tx, credencialId, hash),
    );

    // Revocar tokens viejos y emitir uno nuevo
    revokeUserTokens(perfilId);

    const perfil = await AuthRepository.getPerfilById(perfilId);
    if (!perfil) throw new NotFoundError('Perfil');

    const nombre = await resolveNombre(perfil, cred.usuario_login);
    const token = signToken({
      sub: cred.id,
      perfilId: perfil.id,
      rol: perfil.rol,
      entidadId: perfil.entidad_id,
      entidadTipo: perfil.entidad_tipo,
      nombre,
    });

    const user: SessionUser = {
      id: perfil.id,
      rol: perfil.rol,
      nombre,
      entidadId: perfil.entidad_id,
      entidadTipo: perfil.entidad_tipo,
    };
    return { token, user, redirectTo: REDIRECT_BY_ROLE[perfil.rol] };
  },

  /**
   * Solicita el envío de un enlace de recuperación. Siempre responde éxito
   * (no revela si el correo existe, igual que el login) y aplica un límite
   * de solicitudes por credencial para evitar abuso de envío de correos.
   */
  async forgotPassword(input: ForgotPasswordInput): Promise<void> {
    const cred = await AuthRepository.findCredencialByLogin(input.email);
    if (!cred || !cred.activo) return;

    const desde = new Date(Date.now() - RESET_VENTANA_MIN * 60_000);
    const recientes = await AuthRepository.contarTokensRecientes(cred.id, desde);
    if (recientes >= RESET_MAX_SOLICITUDES) return;

    const token = randomBytes(32).toString('hex');
    const expiraEn = new Date(Date.now() + RESET_TOKEN_TTL_MIN * 60_000);
    await AuthRepository.crearTokenRecuperacion(cred.id, hashToken(token), expiraEn);

    await ResendEmailSender.enviarRecuperacion(input.email, token);
  },

  /** Consume el token y actualiza la contraseña; invalida sesiones activas. */
  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const tokenRow = await AuthRepository.buscarTokenRecuperacionValido(hashToken(input.token));
    if (!tokenRow) {
      throw new BusinessRuleError('TOKEN_INVALIDO', 'El enlace de recuperación es inválido o expiró.');
    }

    const perfil = await AuthRepository.getPerfilByCredencialId(tokenRow.credencial_id);
    const hash = await hashPassword(input.password_nueva);

    await withAuditContext(perfil?.id ?? tokenRow.credencial_id, (tx) =>
      AuthRepository.updatePasswordHash(tx, tokenRow.credencial_id, hash),
    );
    await AuthRepository.marcarTokenRecuperacionUsado(tokenRow.id);
    if (perfil) revokeUserTokens(perfil.id);
  },
};
