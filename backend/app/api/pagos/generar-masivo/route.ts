import { type NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth';
import { parseBody } from '@/lib/request';
import { ok, errorResponse } from '@/lib/response';
import { PagoService } from '@/modules/pagos/pago.service';
import { GenerarMasivoSchema } from '@/modules/pagos/pago.schema';

export const dynamic = 'force-dynamic';

export function POST(req: NextRequest) {
  return withAuth(req, async (ctx) => {
    try {
      const input = await parseBody(req, GenerarMasivoSchema);
      const result = await PagoService.generarMasivo(input, ctx.user);
      const msg = result.creados + ' pagos generados.';
      return ok(result, msg);
    } catch (e) {
      return errorResponse(e);
    }
  });
}
