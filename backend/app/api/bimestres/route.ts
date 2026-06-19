import { withRole } from '@/lib/auth';
import { ok, created } from '@/lib/response';
import { parseBody, parseQuery } from '@/lib/request';
import { CreateBimestreSchema, ListBimestresQuery } from '@/schemas/periodo.schema';
import { BimestreService } from '@/modules/periodo/periodo.service';

export const dynamic = 'force-dynamic';

// Lectura del calendario académico: todos los roles autenticados (Docente y
// Alumno necesitan el bimestre activo para notas/libreta). La escritura es Admin.
export const GET = withRole(['Admin', 'Secretaria', 'Docente', 'Alumno'], async (req) => {
  const q = parseQuery(req, ListBimestresQuery);
  const data = await BimestreService.list(q);
  return ok(data, 'Listado de bimestres');
});

export const POST = withRole(['Admin'], async (req, { user }) => {
  const input = await parseBody(req, CreateBimestreSchema);
  const bimestre = await BimestreService.create(input, user.perfilId);
  return created(bimestre, 'Bimestre creado');
});
