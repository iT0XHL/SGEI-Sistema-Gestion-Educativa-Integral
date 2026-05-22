// ============================================================
//  /api/alumnos/:id/cambiar-contrasena
//   POST — Cambia la contraseña de un alumno (Admin)
// ============================================================
import { withRole } from '@/lib/auth';
import { ok } from '@/lib/response';
import { parseBody } from '@/lib/request';
import { AdminResetPasswordSchema } from '@/schemas/auth.schema';
import { AlumnosService } from '@/modules/alumnos/alumnos.service';

export const dynamic = 'force-dynamic';

export const POST = withRole(['Admin'], async (req, { params, user }) => {
  const input = await parseBody(req, AdminResetPasswordSchema);
  await AlumnosService.adminResetPassword(params.id, input, user.perfilId);
  return ok({}, 'Contraseña del alumno actualizada correctamente');
});
