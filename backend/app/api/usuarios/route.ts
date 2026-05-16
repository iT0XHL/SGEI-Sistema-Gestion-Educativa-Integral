// ============================================================
//  /api/usuarios
//   GET  — lista paginada de cuentas        (Admin, Secretaria)
//   POST — crea cuenta de personal Admin/Secretaria  (Admin)
// ============================================================
import { withRole } from '@/lib/auth';
import { ok, created } from '@/lib/response';
import { parseBody, parseQuery } from '@/lib/request';
import {
  CreateUsuarioSchema,
  ListUsuariosQuerySchema,
} from '@/schemas/usuarios.schema';
import { UsersService } from '@/modules/users/users.service';

export const dynamic = 'force-dynamic';

export const GET = withRole(['Admin', 'Secretaria'], async (req) => {
  const q = parseQuery(req, ListUsuariosQuerySchema);
  const data = await UsersService.list(q);
  return ok(data, 'Listado de cuentas');
});

export const POST = withRole(['Admin'], async (req, { user }) => {
  const input = await parseBody(req, CreateUsuarioSchema);
  const usuario = await UsersService.createStaff(input, user.perfilId);
  return created(usuario, 'Cuenta creada');
});
