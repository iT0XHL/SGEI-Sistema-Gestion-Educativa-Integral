// ============================================================
//  /api/asistencias/docentes/[id]  (Admin only)
// ============================================================
import { withRole } from '@/lib/auth';
import { ok, errorResponse } from '@/lib/response';
import { parseBody } from '@/lib/request';
import { ActualizarAsistenciaDocenteSchema } from '@/modules/asistencias/asistencia-docentes.schema';
import { AsistenciaDocentesService } from '@/modules/asistencias/asistencia-docentes.service';

export const dynamic = 'force-dynamic';

export const PATCH = withRole(['Admin'], async (req, { user, params }) => {
  try {
    const input = await parseBody(req, ActualizarAsistenciaDocenteSchema);
    const data = await AsistenciaDocentesService.actualizar(params.id, input, user);
    return ok(data, 'Asistencia actualizada');
  } catch (error) {
    return errorResponse(error);
  }
});

export const DELETE = withRole(['Admin'], async (req, { user, params }) => {
  try {
    const data = await AsistenciaDocentesService.eliminar(params.id, user);
    return ok(data, 'Asistencia eliminada');
  } catch (error) {
    return errorResponse(error);
  }
});
