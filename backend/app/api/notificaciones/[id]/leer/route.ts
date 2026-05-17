import { withAuth } from '@/lib/auth';
import { ok, errorResponse } from '@/lib/response';
import { NotificacionService } from '@/modules/notificaciones/notificacion.service';

export const PATCH = withAuth(async (_req, { user, params }) => {
  try {
    const data = await NotificacionService.marcarLeida(params.id, user);
    return ok(data, 'Notificación marcada como leída.');
  } catch (e) {
    return errorResponse(e);
  }
});
