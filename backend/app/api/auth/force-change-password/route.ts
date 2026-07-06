// ============================================================
//  POST /api/auth/force-change-password — Cambio OBLIGATORIO de
//  contraseña (primer inicio o reseteo por admin/secretaría).
//  No requiere password_actual. Revoca tokens viejos y emite uno
//  nuevo.
// ============================================================
import { NextRequest } from 'next/server';
import { ok, errorResponse } from '@/lib/response';
import { parseBody } from '@/lib/request';
import { ForceChangePasswordSchema } from '@/schemas/auth.schema';
import { AuthService } from '@/modules/auth/auth.service';
import { getUserFromRequest } from '@/lib/auth';
import { COOKIE_NAME, authCookieOptions } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    const input = await parseBody(req, ForceChangePasswordSchema);
    const { token, user: sessionUser, redirectTo } = await AuthService.forceChangePassword(
      user.perfilId,
      user.sub,
      input,
    );

    const res = ok({ user: sessionUser, redirectTo }, 'Contraseña actualizada correctamente');
    res.cookies.set(COOKIE_NAME, token, authCookieOptions());
    return res;
  } catch (error) {
    return errorResponse(error);
  }
}
