import { withRole } from '@/lib/auth';
import { ok, created } from '@/lib/response';
import { parseBody, parseQuery } from '@/lib/request';
import { CreatePeriodoSchema, ListPeriodosQuery } from '@/schemas/periodo.schema';
import { PeriodoService } from '@/modules/periodo/periodo.service';

export const dynamic = 'force-dynamic';

// Lectura del calendario académico: todos los roles autenticados (el período
// activo se muestra en el AppShell de cada portal). La escritura sigue siendo Admin.
export const GET = withRole(['Admin', 'Secretaria', 'Docente', 'Alumno'], async (req) => {
  const q = parseQuery(req, ListPeriodosQuery);
  const data = await PeriodoService.list(q);
  return ok(data, 'Listado de períodos');
});

export const POST = withRole(['Admin'], async (req, { user }) => {
  const input = await parseBody(req, CreatePeriodoSchema);
  const periodo = await PeriodoService.create(input, user.perfilId);
  return created(periodo, 'Período creado');
});
