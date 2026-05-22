// ============================================================
//  /api/docentes/:id/cambiar-contrasena
//   POST — Cambia la contraseña de un docente (Admin)
// ============================================================
import { withRole } from '@/lib/auth';
import { ok } from '@/lib/response';
import { parseBody } from '@/lib/request';
import { AdminResetPasswordSchema } from '@/schemas/auth.schema';
import { DocentesService } from '@/modules/docentes/docentes.service';

export const dynamic = 'force-dynamic';

export const POST = withRole(['Admin'], async (req, { params, user }) => {
  const input = await parseBody(req, AdminResetPasswordSchema);
  await DocentesService.adminResetPassword(params.id, input, user.perfilId);
  return ok({}, 'Contraseña del docente actualizada correctamente');
});
