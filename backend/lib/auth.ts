// ============================================================
//  lib/auth.ts — Middlewares de protección y helpers RBAC.
//
//  withAuth  → verifica el JWT de la cookie HttpOnly.
//  withRole  → además exige uno de los roles indicados.
//
//  Uso en un Route Handler:
//    export const GET = withRole(['Admin'], async (req, ctx) => { ... })
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, COOKIE_NAME, type JwtClaims } from '@/lib/jwt';
import { errorResponse } from '@/lib/response';
import { UnauthorizedError, ForbiddenError } from '@/errors/http-errors';
import type { RolUsuario } from '@/types/roles';

/** Contexto que recibe un handler protegido. */
export interface AuthCtx {
  user: JwtClaims;
  params: Record<string, string>;
}

export type AuthedHandler = (
  req: NextRequest,
  ctx: AuthCtx,
) => Promise<NextResponse> | NextResponse;

/** Forma en que Next.js entrega los parámetros de ruta dinámica. */
type RouteCtx = { params?: Record<string, string> };

/** Extrae y verifica el usuario autenticado desde la cookie. */
export function getUserFromRequest(req: NextRequest): JwtClaims {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    throw new UnauthorizedError('TOKEN_MISSING', 'No autenticado. Inicia sesión.');
  }
  return verifyToken(token);
}

/** Envuelve un handler exigiendo autenticación válida. */
export function withAuth(handler: AuthedHandler) {
  return async (req: NextRequest, routeCtx: RouteCtx): Promise<NextResponse> => {
    try {
      const user = getUserFromRequest(req);
      return await handler(req, { user, params: routeCtx?.params ?? {} });
    } catch (error) {
      return errorResponse(error);
    }
  };
}

/** Envuelve un handler exigiendo autenticación + rol permitido (RBAC). */
export function withRole(roles: RolUsuario[], handler: AuthedHandler) {
  return withAuth(async (req, ctx) => {
    if (!roles.includes(ctx.user.rol)) {
      throw new ForbiddenError(
        'INSUFFICIENT_ROLE',
        'Tu rol no tiene acceso a este recurso.',
      );
    }
    return handler(req, ctx);
  });
}

// ── Helpers de negocio RBAC ───────────────────────────────────

/** Admin/Secretaria ven a cualquier alumno; el Alumno solo a sí mismo. */
export function canAccessAlumno(user: JwtClaims, alumnoId: string): boolean {
  if (user.rol === 'Admin' || user.rol === 'Secretaria') return true;
  if (user.rol === 'Alumno') return user.entidadId === alumnoId;
  return false;
}

/** Admin gestiona cualquier nota; el Docente solo las suyas. */
export function canManageNota(user: JwtClaims, docenteId: string): boolean {
  if (user.rol === 'Admin') return true;
  if (user.rol === 'Docente') return user.entidadId === docenteId;
  return false;
}

/** Solo Admin/Secretaria validan vouchers y exportan SIAGIE. */
export function canValidateVoucher(user: JwtClaims): boolean {
  return user.rol === 'Admin' || user.rol === 'Secretaria';
}

export function canExportSiagie(user: JwtClaims): boolean {
  return user.rol === 'Admin' || user.rol === 'Secretaria';
}

/** Lanza ForbiddenError si la condición no se cumple. */
export function assertAccess(condition: boolean, message?: string): void {
  if (!condition) {
    throw new ForbiddenError('ACCESS_DENIED', message ?? 'Acceso denegado.');
  }
}
