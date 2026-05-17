// ============================================================
//  /api/actividades/[id]/adjunto
//   GET — URL firmada del adjunto del docente (300 s)
// ============================================================
import { withAuth } from '@/lib/auth';
import { ok, errorResponse } from '@/lib/response';
import { ActividadesService } from '@/modules/actividades/actividades.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (req, { user, params }) => {
  try {
    const data = await ActividadesService.getAdjuntoUrl(params.id, user);
    return ok(data, 'URL del adjunto');
  } catch (error) {
    return errorResponse(error);
  }
});
