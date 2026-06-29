import { withAuth, withRole } from '@/lib/auth';
import { ok, created } from '@/lib/response';
import { parseBody, parseQuery } from '@/lib/request';
import { CreateBimestreSchema, ListBimestresQuery } from '@/schemas/periodo.schema';
import { BimestreService } from '@/modules/periodo/periodo.service';

export const dynamic = 'force-dynamic';

// Lectura abierta a cualquier usuario autenticado: los bimestres son
// dato académico de referencia que docentes (notas) y alumnos (libreta,
// cursos) necesitan, igual que cursos/grados/competencias. La gestión
// (POST/PATCH/DELETE) sigue restringida a Admin.
export const GET = withAuth(async (req) => {
  const q = parseQuery(req, ListBimestresQuery);
  const data = await BimestreService.list(q);
  return ok(data, 'Listado de bimestres');
});

export const POST = withRole(['Admin'], async (req, { user }) => {
  const input = await parseBody(req, CreateBimestreSchema);
  const bimestre = await BimestreService.create(input, user.perfilId);
  return created(bimestre, 'Bimestre creado');
});
