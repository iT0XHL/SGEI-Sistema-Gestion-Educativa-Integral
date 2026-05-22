// ============================================================
//  /api/usuarios/:id/reset-contrasena
//  POST — admin resetea contraseña de otro usuario
// ============================================================
import { withRole } from '@/lib/auth';
import { ok } from '@/lib/response';
import { parseBody } from '@/lib/request';
import { AdminResetPasswordSchema } from '@/schemas/usuarios.schema';
import { UsersService } from '@/modules/users/users.service';

export const dynamic = 'force-dynamic';

export const POST = withRole(['Admin'], async (req, { params, user }) => {
  const input = await parseBody(req, AdminResetPasswordSchema);
  await UsersService.adminResetPassword(params.id, input, user.perfilId);
  return ok(null, 'Contraseña reseteada correctamente');
});
