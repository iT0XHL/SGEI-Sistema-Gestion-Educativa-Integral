import { type NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth';
import { parseBodyOptional } from '@/lib/request';
import { ok, errorResponse } from '@/lib/response';
import { LibretaService } from '@/modules/libretas/libreta.service';
import { CambiarEstadoSchema } from '@/modules/libretas/libreta.schema';

export function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(req, async (ctx) => {
    try {
      const body = await parseBodyOptional(req, CambiarEstadoSchema);
      const libreta = await LibretaService.cambiarEstado(params.id, 'ANULADA', ctx.user, body.observacion);
      return ok(libreta, 'Libreta anulada.');
    } catch (e) {
      return errorResponse(e);
    }
  });
}
