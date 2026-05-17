import { type NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth';
import { ok, errorResponse } from '@/lib/response';
import { BoletaService } from '@/modules/boletas/boleta.service';

export function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(req, async (ctx) => {
    try {
      const boleta = await BoletaService.obtener(params.id, ctx.user);
      return ok(boleta, 'Boleta obtenida.');
    } catch (e) {
      return errorResponse(e);
    }
  });
}
