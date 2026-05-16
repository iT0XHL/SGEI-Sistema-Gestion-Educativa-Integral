// ============================================================
//  PATCH /api/auth/change-password — Cambia la propia contraseña.
// ============================================================
import { withAuth } from '@/lib/auth';
import { ok } from '@/lib/response';
import { parseBody } from '@/lib/request';
import { ChangePasswordSchema } from '@/schemas/auth.schema';
import { AuthService } from '@/modules/auth/auth.service';

export const dynamic = 'force-dynamic';

export const PATCH = withAuth(async (req, { user }) => {
  const input = await parseBody(req, ChangePasswordSchema);
  await AuthService.changePassword(user.perfilId, user.sub, input);
  return ok({ updated: true }, 'Contraseña actualizada');
});
