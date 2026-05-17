// ============================================================
//  /api/asistencias/alumnos
//   GET  — lista registros de asistencia (Docente, Admin, Alumno)
//   POST — guarda/actualiza asistencia en lote (Docente, Admin)
// ============================================================
import { withAuth } from '@/lib/auth';
import { ok, created, errorResponse } from '@/lib/response';
import { parseBody, parseQuery } from '@/lib/request';
import { GuardarAsistenciaSchema, ListarAsistenciaQuery } from '@/modules/asistencias/asistencia-alumnos.schema';
import { AsistenciaAlumnosService } from '@/modules/asistencias/asistencia-alumnos.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (req, { user }) => {
  try {
    const q = parseQuery(req, ListarAsistenciaQuery);
    const data = await AsistenciaAlumnosService.list(q, user);
    return ok(data, 'Asistencias');
  } catch (error) {
    return errorResponse(error);
  }
});

export const POST = withAuth(async (req, { user }) => {
  try {
    const input = await parseBody(req, GuardarAsistenciaSchema);
    const data = await AsistenciaAlumnosService.guardar(input, user);
    return created(data, 'Asistencia registrada');
  } catch (error) {
    return errorResponse(error);
  }
});
