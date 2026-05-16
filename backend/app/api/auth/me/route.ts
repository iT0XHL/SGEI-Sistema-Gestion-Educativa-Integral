// ============================================================
//  GET /api/auth/me — Devuelve el usuario de la sesión actual.
// ============================================================
import { withAuth } from '@/lib/auth';
import { ok } from '@/lib/response';
import { AuthService } from '@/modules/auth/auth.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (_req, { user }) => {
  const session = await AuthService.me(user.perfilId);
  return ok(session, 'Sesión activa');
});
