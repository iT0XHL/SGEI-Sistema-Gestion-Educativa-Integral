// ============================================================
//  /api/actividades/[id]/entregas/[entregaId]
//   PATCH — docente califica la entrega
//   GET   — URL firmada del archivo de entrega
// ============================================================
import { withAuth } from '@/lib/auth';
import { ok, errorResponse } from '@/lib/response';
import { parseBody } from '@/lib/request';
import { CalificarEntregaSchema } from '@/modules/actividades/actividades.schema';
import { ActividadesService } from '@/modules/actividades/actividades.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (req, { user, params }) => {
  try {
    const data = await ActividadesService.getEntregaArchivoUrl(params.entregaId, user);
    return ok(data, 'URL del archivo de entrega');
  } catch (error) {
    return errorResponse(error);
  }
});

export const PATCH = withAuth(async (req, { user, params }) => {
  try {
    const input = await parseBody(req, CalificarEntregaSchema);
    const data = await ActividadesService.calificarEntrega(params.entregaId, input, user);
    return ok(data, 'Entrega calificada');
  } catch (error) {
    return errorResponse(error);
  }
});
