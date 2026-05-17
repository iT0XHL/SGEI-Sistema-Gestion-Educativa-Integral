import { type NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth';
import { ok, errorResponse } from '@/lib/response';
import { BoletaService } from '@/modules/boletas/boleta.service';

export function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(req, async (ctx) => {
    try {
      const result = await BoletaService.getArchivoUrl(params.id, ctx.user);
      return ok(result, 'URL de archivo generada.');
    } catch (e) {
      return errorResponse(e);
    }
  });
}
