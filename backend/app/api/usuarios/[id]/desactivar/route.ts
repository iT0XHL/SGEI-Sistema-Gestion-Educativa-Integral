// ============================================================
//  /api/usuarios/:id/desactivar
//  POST — admin desactiva a un usuario
// ============================================================
import { withRole } from '@/lib/auth';
import { ok } from '@/lib/response';
import { UsersService } from '@/modules/users/users.service';

export const dynamic = 'force-dynamic';

export const POST = withRole(['Admin'], async (_req, { params, user }) => {
  await UsersService.setActivo(params.id, false, user.perfilId);
  const usuario = await UsersService.get(params.id);
  return ok(usuario, 'Usuario desactivado');
});
