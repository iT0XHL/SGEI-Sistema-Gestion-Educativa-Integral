// ============================================================
//  POST /api/auth/logout — Cierra sesión.
//  Registra la auditoría LOGOUT y limpia la cookie HttpOnly.
// ============================================================
import { withAuth } from '@/lib/auth';
import { ok } from '@/lib/response';
import { getClientIp, getUserAgent } from '@/lib/request';
import { AuthService } from '@/modules/auth/auth.service';
import { COOKIE_NAME, clearCookieOptions } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

export const POST = withAuth(async (req, { user }) => {
  await AuthService.logout(user.perfilId, {
    ip: getClientIp(req),
    userAgent: getUserAgent(req),
  });
  const res = ok({ loggedOut: true }, 'Sesión cerrada');
  res.cookies.set(COOKIE_NAME, '', clearCookieOptions());
  return res;
});
