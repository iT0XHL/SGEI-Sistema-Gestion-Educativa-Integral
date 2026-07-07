import { type NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth';
import { ok, okCached, errorResponse } from '@/lib/response';
import { PagoService } from '@/modules/pagos/pago.service';

export function GET(req: NextRequest) {
  return withAuth(req, async () => {
    try {
      const conceptos = await PagoService.listarConceptos();
      return okCached(conceptos, 'Conceptos obtenidos.');
    } catch (e) {
      return errorResponse(e);
    }
  });
}
