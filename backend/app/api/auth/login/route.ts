// ============================================================
//  POST /api/auth/login — Inicia sesión.
//  Devuelve datos de sesión y setea la cookie HttpOnly sgei_token.
// ============================================================
import { NextRequest } from 'next/server';
import { ok, errorResponse } from '@/lib/response';
import { parseBody, getClientIp, getUserAgent } from '@/lib/request';
import { LoginSchema } from '@/schemas/auth.schema';
import { AuthService } from '@/modules/auth/auth.service';
import { COOKIE_NAME, authCookieOptions } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const input = await parseBody(req, LoginSchema);
    const { token, user, redirectTo } = await AuthService.login(input, {
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    const res = ok({ user, redirectTo }, 'Sesión iniciada correctamente');
    res.cookies.set(COOKIE_NAME, token, authCookieOptions());
    return res;
  } catch (error) {
    return errorResponse(error);
  }
}
