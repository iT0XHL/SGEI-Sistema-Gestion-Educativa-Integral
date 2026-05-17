import { withAuth } from '@/lib/auth';
import { ok, errorResponse } from '@/lib/response';
import { NotificacionService } from '@/modules/notificaciones/notificacion.service';

export const PATCH = withAuth(async (_req, { user }) => {
  try {
    const data = await NotificacionService.marcarTodasLeidas(user);
    return ok(data, 'Todas las notificaciones marcadas como leídas.');
  } catch (e) {
    return errorResponse(e);
  }
});
