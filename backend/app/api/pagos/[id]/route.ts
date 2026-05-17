import { type NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth';
import { ok, errorResponse } from '@/lib/response';
import { PagoService } from '@/modules/pagos/pago.service';

export function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(req, async (ctx) => {
    try {
      const pago = await PagoService.obtener(params.id, ctx.user);
      return ok(pago, 'Pago obtenido.');
    } catch (e) {
      return errorResponse(e);
    }
  });
}
