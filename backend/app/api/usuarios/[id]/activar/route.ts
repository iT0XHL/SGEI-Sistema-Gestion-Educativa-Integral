// ============================================================
//  PATCH /api/usuarios/:id/activar — Reactiva una cuenta (Admin).
// ============================================================
import { withRole } from '@/lib/auth';
import { ok } from '@/lib/response';
import { UsersService } from '@/modules/users/users.service';

export const dynamic = 'force-dynamic';

export const PATCH = withRole(['Admin'], async (_req, { params, user }) => {
  const usuario = await UsersService.setActivo(params.id, true, user.perfilId);
  return ok(usuario, 'Cuenta activada');
});
