// ============================================================
//  /api/usuarios/:id
//   GET   — detalle de una cuenta     (Admin, Secretaria)
//   PATCH — actualiza rol / activo    (Admin)
// ============================================================
import { withRole } from '@/lib/auth';
import { ok } from '@/lib/response';
import { parseBody } from '@/lib/request';
import { UpdateUsuarioSchema } from '@/schemas/usuarios.schema';
import { UsersService } from '@/modules/users/users.service';

export const dynamic = 'force-dynamic';

export const GET = withRole(['Admin', 'Secretaria'], async (_req, { params }) => {
  const usuario = await UsersService.get(params.id);
  return ok(usuario, 'Detalle de cuenta');
});

export const PATCH = withRole(['Admin'], async (req, { params, user }) => {
  const input = await parseBody(req, UpdateUsuarioSchema);
  const usuario = await UsersService.update(params.id, input, user.perfilId);
  return ok(usuario, 'Cuenta actualizada');
});
