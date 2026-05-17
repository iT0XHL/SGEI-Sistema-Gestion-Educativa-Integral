import { type NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth';
import { parseBody, parseQuery } from '@/lib/request';
import { ok } from '@/lib/response';
import { errorResponse } from '@/lib/response';
import { NotaService } from '@/modules/notas/nota.service';
import { UpsertBatchNotaSchema, ListarNotasQuery } from '@/modules/notas/nota.schema';

export function GET(req: NextRequest) {
  return withAuth(req, async (ctx) => {
    try {
      const query = await parseQuery(req, ListarNotasQuery);
      const notas = await NotaService.listar(query, ctx.user);
      return ok(notas, 'Notas obtenidas.');
    } catch (e) {
      return errorResponse(e);
    }
  });
}

export function POST(req: NextRequest) {
  return withAuth(req, async (ctx) => {
    try {
      const body = await parseBody(req, UpsertBatchNotaSchema);
      const resultado = await NotaService.upsertBatch(body, ctx.user);
      return ok(resultado, `${resultado.registradas} nota(s) registradas.`);
    } catch (e) {
      return errorResponse(e);
    }
  });
}
