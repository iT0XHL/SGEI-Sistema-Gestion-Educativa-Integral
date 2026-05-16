// ============================================================
//  /api/alumnos
//   GET  — lista paginada (?q&nivelId&gradoId&seccionId&periodoId)  (Admin, Secretaria)
//   POST — crea alumno + credencial  (Admin, Secretaria)
// ============================================================
import { withRole } from '@/lib/auth';
import { ok, created } from '@/lib/response';
import { parseBody, parseQuery } from '@/lib/request';
import { CreateAlumnoSchema, ListAlumnosQuery } from '@/schemas/personas.schema';
import { AlumnosService } from '@/modules/alumnos/alumnos.service';

export const dynamic = 'force-dynamic';

export const GET = withRole(['Admin', 'Secretaria'], async (req) => {
  const q = parseQuery(req, ListAlumnosQuery);
  const data = await AlumnosService.list(q);
  return ok(data, 'Alumnos');
});

export const POST = withRole(['Admin', 'Secretaria'], async (req, { user }) => {
  const input = await parseBody(req, CreateAlumnoSchema);
  const alumno = await AlumnosService.create(input, user.perfilId);
  return created(alumno, 'Alumno creado');
});
