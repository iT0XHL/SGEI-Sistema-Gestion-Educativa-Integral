// ============================================================
//  PATCH /api/usuarios/:id/desactivar — Desactiva una cuenta (Admin).
//  Desactivación lógica: nunca se elimina físicamente.
// ============================================================
import { withRole } from '@/lib/auth';
import { ok } from '@/lib/response';
import { UsersService } from '@/modules/users/users.service';

export const dynamic = 'force-dynamic';

export const PATCH = withRole(['Admin'], async (_req, { params, user }) => {
  const usuario = await UsersService.setActivo(params.id, false, user.perfilId);
  return ok(usuario, 'Cuenta desactivada');
});
