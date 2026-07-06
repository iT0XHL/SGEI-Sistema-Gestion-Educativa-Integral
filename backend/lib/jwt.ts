// ============================================================
//  lib/jwt.ts — Firma y verificación de JWT + opciones de cookie.
//  El token viaja SIEMPRE en una cookie HttpOnly (nunca en body
//  ni en localStorage). Algoritmo HS256.
// ============================================================
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { env } from '@/config/env';
import { UnauthorizedError } from '@/errors/http-errors';
import { isTokenRevoked } from '@/lib/token-blacklist';
import type { RolUsuario } from '@/types/roles';

/** Datos que viajan dentro del JWT. jti se añade automáticamente en signToken. */
export interface JwtPayload {
  sub: string; // credencial.id
  perfilId: string; // perfil_usuario.id
  rol: RolUsuario;
  entidadId: string; // perfil_usuario.entidad_id
  entidadTipo: string; // perfil_usuario.entidad_tipo
  nombre: string; // nombre para mostrar
}

/** Payload ya decodificado (incluye claims estándar). */
export interface JwtClaims extends JwtPayload {
  jti: string;
  iat: number;
  exp: number;
}

export const COOKIE_NAME = env.JWT_COOKIE_NAME;

function getSecret(): string {
  if (!env.JWT_SECRET) {
    throw new Error(
      'JWT_SECRET no está configurado. Define JWT_SECRET en el archivo .env',
    );
  }
  return env.JWT_SECRET;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(
    { ...payload, jti: randomUUID() },
    getSecret(),
    {
      algorithm: 'HS256',
      expiresIn: env.JWT_EXPIRES_IN,
    },
  );
}

export function verifyToken(token: string): JwtClaims {
  try {
    const payload = jwt.verify(token, getSecret(), { algorithms: ['HS256'] }) as JwtClaims;
    if (isTokenRevoked(payload.perfilId, payload.iat)) {
      throw new UnauthorizedError('TOKEN_REVOKED', 'Sesión revocada. Inicia sesión de nuevo.');
    }
    return payload;
  } catch (error) {
    if (error instanceof UnauthorizedError) throw error;
    throw new UnauthorizedError('TOKEN_INVALID', 'Sesión inválida o expirada');
  }
}

/** Opciones de la cookie de sesión. Guía Técnica §19. */
export function authCookieOptions() {
  return {
    httpOnly: true,
    // Solo HTTPS en producción; COOKIE_SECURE=false permite despliegues
    // por HTTP plano (ej. VPS accedido por IP sin dominio/SSL).
    secure: env.isProd && process.env.COOKIE_SECURE !== 'false',
    sameSite: 'lax' as const, // previene CSRF
    path: '/',
    maxAge: 8 * 60 * 60, // 8 horas (segundos)
  };
}

/** Opciones para invalidar/limpiar la cookie en el logout. */
export function clearCookieOptions() {
  return { ...authCookieOptions(), maxAge: 0 };
}
