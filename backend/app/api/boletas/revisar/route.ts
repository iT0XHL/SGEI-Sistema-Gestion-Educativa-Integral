import { withRole } from '@/lib/auth';
import { parseBody } from '@/lib/request';
import { ok, errorResponse } from '@/lib/response';
import { BoletaService } from '@/modules/boletas/boleta.service';
import { RevisarBoletaSchema } from '@/modules/boletas/boleta.schema';

export const dynamic = 'force-dynamic';

export const POST = withRole(['Admin', 'Secretaria'], async (req, ctx) => {
  try {
    const body   = await parseBody(req, RevisarBoletaSchema);
    const boleta = await BoletaService.revisar(body, ctx.user);
    return ok(boleta, `Boleta ${body.nuevo_estado.toLowerCase()}.`);
  } catch (e) {
    return errorResponse(e);
  }
});
