import { withAuth, withRole, canAccessAlumno, assertAccess } from '@/lib/auth';
import { ok } from '@/lib/response';
import { parseBody } from '@/lib/request';
import { UpdateAlumnoSchema } from '@/schemas/personas.schema';
import { AlumnosService } from '@/modules/alumnos/alumnos.service';

export const dynamic = 'force-dynamic';

// Admin/Secretaria ven cualquier alumno; el Alumno solo su propio registro.
export const GET = withAuth(async (_req, { user, params }) => {
  assertAccess(canAccessAlumno(user, params.id), 'Solo puedes ver tu propia información.');
  const alumno = await AlumnosService.get(params.id);
  return ok(alumno, 'Detalle del alumno');
});

export const PATCH = withRole(['Admin', 'Secretaria'], async (req, { params, user }) => {
  const input = await parseBody(req, UpdateAlumnoSchema);
  const alumno = await AlumnosService.update(params.id, input, user.perfilId);
  return ok(alumno, 'Alumno actualizado');
});
