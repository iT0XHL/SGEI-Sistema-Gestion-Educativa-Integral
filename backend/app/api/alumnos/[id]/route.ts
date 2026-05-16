// ============================================================
//  /api/alumnos/:id
//   GET    — detalle   (Admin, Secretaria, o el propio Alumno)
//   PUT    — actualiza (Admin, Secretaria)
//   DELETE — baja lógica del alumno (Admin, Secretaria)
// ============================================================
import { withAuth, withRole, canAccessAlumno, assertAccess } from '@/lib/auth';
import { ok } from '@/lib/response';
import { parseBody } from '@/lib/request';
import { UpdateAlumnoSchema } from '@/schemas/personas.schema';
import { AlumnosService } from '@/modules/alumnos/alumnos.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (_req, { user, params }) => {
  assertAccess(canAccessAlumno(user, params.id));
  const alumno = await AlumnosService.get(params.id);
  return ok(alumno, 'Detalle de alumno');
});

export const PUT = withRole(['Admin', 'Secretaria'], async (req, { params }) => {
  const input = await parseBody(req, UpdateAlumnoSchema);
  const alumno = await AlumnosService.update(params.id, input);
  return ok(alumno, 'Alumno actualizado');
});

export const DELETE = withRole(['Admin', 'Secretaria'], async (_req, { params, user }) => {
  const result = await AlumnosService.deactivate(params.id, user.perfilId);
  return ok(result, 'Alumno desactivado');
});
