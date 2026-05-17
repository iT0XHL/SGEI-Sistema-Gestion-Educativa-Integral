import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth';
import { parseBody, parseQuery } from '@/lib/request';
import { ok, created, errorResponse } from '@/lib/response';
import { NotificacionService } from '@/modules/notificaciones/notificacion.service';
import { CrearNotificacionSchema, ListarNotificacionesQuery } from '@/modules/notificaciones/notificacion.schema';

export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const { leida } = parseQuery(req, ListarNotificacionesQuery);
    const data      = await NotificacionService.listar(user, leida);
    return ok(data, 'Notificaciones obtenidas.');
  } catch (e) {
    return errorResponse(e);
  }
});

export const POST = withAuth(async (req: NextRequest, { user }) => {
  try {
    const input = await parseBody(req, CrearNotificacionSchema);
    const data  = await NotificacionService.crear(input, user);
    return created(data, 'Notificación enviada.');
  } catch (e) {
    return errorResponse(e);
  }
});
