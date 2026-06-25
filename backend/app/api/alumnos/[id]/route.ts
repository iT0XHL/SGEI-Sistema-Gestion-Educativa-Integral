import { withRole } from '@/lib/auth';
import { ok, errorResponse } from '@/lib/response';
import { parseBody } from '@/lib/request';
import { UpdateAlumnoSchema } from '@/schemas/personas.schema';
import { AlumnosService } from '@/modules/alumnos/alumnos.service';

export const dynamic = 'force-dynamic';

export const GET = withRole(['Admin', 'Secretaria'], async (_req, { params }) => {
  const alumno = await AlumnosService.get(params.id);
  return ok(alumno, 'Detalle del alumno');
});

export const PATCH = withRole(['Admin', 'Secretaria'], async (req, { params, user }) => {
  const input = await parseBody(req, UpdateAlumnoSchema);
  const alumno = await AlumnosService.update(params.id, input, user.perfilId);
  return ok(alumno, 'Alumno actualizado');
});
