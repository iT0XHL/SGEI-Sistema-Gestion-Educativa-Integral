import { withAuth } from '@/lib/auth';
import { ok, errorResponse } from '@/lib/response';
import { NotificacionService } from '@/modules/notificaciones/notificacion.service';

export const GET = withAuth(async (_req, { user }) => {
  try {
    const data = await NotificacionService.contar(user);
    return ok(data);
  } catch (e) {
    return errorResponse(e);
  }
});
