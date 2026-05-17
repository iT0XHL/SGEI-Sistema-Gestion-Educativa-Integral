// ============================================================
//  /api/asistencias/alumnos/[id]
//   PATCH  — corrige estado/justificación de un registro (Docente, Admin)
//   DELETE — elimina un registro (Admin only)
// ============================================================
import { withAuth } from '@/lib/auth';
import { ok, errorResponse } from '@/lib/response';
import { parseBody } from '@/lib/request';
import { ActualizarAsistenciaSchema } from '@/modules/asistencias/asistencia-alumnos.schema';
import { AsistenciaAlumnosService } from '@/modules/asistencias/asistencia-alumnos.service';

export const dynamic = 'force-dynamic';

export const PATCH = withAuth(async (req, { user, params }) => {
  try {
    const input = await parseBody(req, ActualizarAsistenciaSchema);
    const data = await AsistenciaAlumnosService.actualizar(params.id, input, user);
    return ok(data, 'Asistencia actualizada');
  } catch (error) {
    return errorResponse(error);
  }
});

export const DELETE = withAuth(async (req, { user, params }) => {
  try {
    const data = await AsistenciaAlumnosService.eliminar(params.id, user);
    return ok(data, 'Asistencia eliminada');
  } catch (error) {
    return errorResponse(error);
  }
});
