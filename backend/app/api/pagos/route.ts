import { type NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth';
import { parseBody, parseQuery } from '@/lib/request';
import { ok, created, errorResponse } from '@/lib/response';
import { PagoService } from '@/modules/pagos/pago.service';
import { CreatePagoSchema, ListarPagosQuery } from '@/modules/pagos/pago.schema';

export function GET(req: NextRequest) {
  return withAuth(req, async (ctx) => {
    try {
      const query = await parseQuery(req, ListarPagosQuery);
      const data  = await PagoService.listar(query, ctx.user);
      return ok(data, 'Pagos obtenidos.');
    } catch (e) {
      return errorResponse(e);
    }
  });
}

export function POST(req: NextRequest) {
  return withAuth(req, async (ctx) => {
    try {
      const body = await parseBody(req, CreatePagoSchema);
      const pago = await PagoService.crear(body, ctx.user);
      return created(pago, 'Pago creado.');
    } catch (e) {
      return errorResponse(e);
    }
  });
}
