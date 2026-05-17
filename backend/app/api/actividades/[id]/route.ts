// ============================================================
//  /api/actividades/[id]
//   GET    — obtener actividad (Docente, Alumno, Admin)
//   PATCH  — editar actividad (Docente propio, Admin)
//   DELETE — eliminar actividad (Docente propio, Admin)
// ============================================================
import { withAuth } from '@/lib/auth';
import { ok, errorResponse } from '@/lib/response';
import { parseBody } from '@/lib/request';
import { UpdateActividadSchema } from '@/modules/actividades/actividades.schema';
import { ActividadesService } from '@/modules/actividades/actividades.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (req, { user, params }) => {
  try {
    const data = await ActividadesService.get(params.id, user);
    return ok(data, 'Actividad');
  } catch (error) {
    return errorResponse(error);
  }
});

export const PATCH = withAuth(async (req, { user, params }) => {
  try {
    const input = await parseBody(req, UpdateActividadSchema);
    const data = await ActividadesService.update(params.id, input, user);
    return ok(data, 'Actividad actualizada');
  } catch (error) {
    return errorResponse(error);
  }
});

export const DELETE = withAuth(async (req, { user, params }) => {
  try {
    const data = await ActividadesService.delete(params.id, user);
    return ok(data, 'Actividad eliminada');
  } catch (error) {
    return errorResponse(error);
  }
});
