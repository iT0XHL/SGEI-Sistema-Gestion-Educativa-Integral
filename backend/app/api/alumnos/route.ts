import { withRole } from '@/lib/auth';
import { ok, created } from '@/lib/response';
import { parseBody, parseQuery } from '@/lib/request';
import { CreateAlumnoSchema, ListAlumnosQuery } from '@/schemas/personas.schema';
import { AlumnosService } from '@/modules/alumnos/alumnos.service';

export const dynamic = 'force-dynamic';

export const GET = withRole(['Admin', 'Secretaria'], async (req) => {
  const q = parseQuery(req, ListAlumnosQuery);
  const data = await AlumnosService.list(q);
  return ok(data, 'Listado de alumnos');
});

export const POST = withRole(['Admin', 'Secretaria'], async (req, { user }) => {
  const input = await parseBody(req, CreateAlumnoSchema);
  const alumno = await AlumnosService.create(input, user);
  return created(alumno, 'Alumno creado');
});
