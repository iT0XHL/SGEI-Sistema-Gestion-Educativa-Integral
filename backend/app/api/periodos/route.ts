import { withRole } from '@/lib/auth';
import { okCached, created } from '@/lib/response';
import { parseBody, parseQuery } from '@/lib/request';
import { CreatePeriodoSchema, ListPeriodosQuery } from '@/schemas/periodo.schema';
import { PeriodoService } from '@/modules/periodo/periodo.service';

export const dynamic = 'force-dynamic';

export const GET = withRole(['Admin', 'Secretaria'], async (req) => {
  const q = parseQuery(req, ListPeriodosQuery);
  const data = await PeriodoService.list(q);
  return okCached(data, 'Listado de períodos');
});

export const POST = withRole(['Admin'], async (req, { user }) => {
  const input = await parseBody(req, CreatePeriodoSchema);
  const periodo = await PeriodoService.create(input, user.perfilId);
  return created(periodo, 'Período creado');
});
