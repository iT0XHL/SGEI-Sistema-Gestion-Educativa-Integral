import { type NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth';
import { parseQuery } from '@/lib/request';
import { ok, errorResponse } from '@/lib/response';
import { LibretaService } from '@/modules/libretas/libreta.service';
import { EstadoRecepcionQuery } from '@/modules/libretas/libreta.schema';

export function GET(req: NextRequest) {
  return withAuth(req, async (ctx) => {
    try {
      const query = parseQuery(req, EstadoRecepcionQuery);
      const rows = await LibretaService.estadoRecepcion(query, ctx.user);
      return ok(rows, 'Estado de recepción obtenido.');
    } catch (e) {
      return errorResponse(e);
    }
  });
}
