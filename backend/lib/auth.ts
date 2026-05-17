// ============================================================
//  lib/auth.ts — Middlewares de protección y helpers RBAC.
//
//  Soporta dos formas de uso:
//
//  Forma 1 — export const GET = withAuth(async (req, { user }) => { ... })
//  Forma 2 — export function GET(req) { return withAuth(req, async ({ user }) => { ... }) }
//
//  withRole idem, solo agrega la verificación de rol.
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, COOKIE_NAME, type JwtClaims } from '@/lib/jwt';
import { errorResponse } from '@/lib/response';
import { UnauthorizedError, ForbiddenError } from '@/errors/http-errors';
import type { RolUsuario } from '@/types/roles';

/** Contexto que recibe un handler protegido. */
export interface AuthCtx {
  user:   JwtClaims;
  params: Record<string, string>;
}

export type AuthedHandler = (
  req: NextRequest,
  ctx: AuthCtx,
) => Promise<NextResponse> | NextResponse;

type RouteCtx = { params?: Record<string, string> | Promise<Record<string, string>> };

/** Extrae y verifica el usuario autenticado desde la cookie. */
export function getUserFromRequest(req: NextRequest): JwtClaims {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    throw new UnauthorizedError('TOKEN_MISSING', 'No autenticado. Inicia sesión.');
  }
  return verifyToken(token);
}

// ── Overloads ─────────────────────────────────────────────────

/** Forma 1: withAuth(handler) → devuelve función de ruta de Next.js. */
export function withAuth(
  handler: AuthedHandler,
): (req: NextRequest, routeCtx: RouteCtx) => Promise<NextResponse>;

/** Forma 2: withAuth(req, handler) → devuelve Promise directamente. */
export function withAuth(
  req: NextRequest,
  handler: (ctx: AuthCtx) => Promise<NextResponse> | NextResponse,
): Promise<NextResponse>;

/** Implementación unificada. */
export function withAuth(
  handlerOrReq: AuthedHandler | NextRequest,
  inlineHandler?: (ctx: AuthCtx) => Promise<NextResponse> | NextResponse,
): ((req: NextRequest, routeCtx: RouteCtx) => Promise<NextResponse>) | Promise<NextResponse> {
  if (typeof handlerOrReq === 'function') {
    // Forma 1
    const handler = handlerOrReq;
    return async (req: NextRequest, routeCtx: RouteCtx): Promise<NextResponse> => {
      try {
        const user   = getUserFromRequest(req);
        const params = routeCtx?.params
          ? await Promise.resolve(routeCtx.params)
          : {};
        return await handler(req, { user, params: params as Record<string, string> });
      } catch (error) {
        return errorResponse(error);
      }
    };
  }

  // Forma 2
  const req     = handlerOrReq;
  const handler = inlineHandler!;
  return (async (): Promise<NextResponse> => {
    try {
      const user = getUserFromRequest(req);
      return await handler({ user, params: {} });
    } catch (error) {
      return errorResponse(error);
    }
  })();
}

// ── withRole ──────────────────────────────────────────────────

/** Forma 1: withRole(roles, handler) → devuelve función de ruta de Next.js. */
export function withRole(
  roles:   RolUsuario[],
  handler: AuthedHandler,
): (req: NextRequest, routeCtx: RouteCtx) => Promise<NextResponse> {
  return withAuth(async (req, ctx) => {
    if (!roles.includes(ctx.user.rol)) {
      throw new ForbiddenError('INSUFFICIENT_ROLE', 'Tu rol no tiene acceso a este recurso.');
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
