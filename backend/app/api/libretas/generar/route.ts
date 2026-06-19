import { type NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth';
import { parseBody } from '@/lib/request';
import { created, errorResponse } from '@/lib/response';
import { LibretaService } from '@/modules/libretas/libreta.service';
import { GenerarLibretaSchema } from '@/modules/libretas/libreta.schema';

export function POST(req: NextRequest) {
  return withAuth(req, async (ctx) => {
    try {
      const body = await parseBody(req, GenerarLibretaSchema);
      const libreta = await LibretaService.generar(body.alumnoId, body.bimestreId, ctx.user);
      return created(libreta, 'Libreta generada.');
    } catch (e) {
      return errorResponse(e);
    }
  });
}
