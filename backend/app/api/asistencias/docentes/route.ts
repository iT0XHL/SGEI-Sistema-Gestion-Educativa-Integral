// ============================================================
//  /api/asistencias/docentes
//   GET  — lista asistencia de docentes (Admin only)
//   POST — guarda/actualiza asistencia en lote (Admin only)
// ============================================================
import { withRole } from '@/lib/auth';
import { ok, created, errorResponse } from '@/lib/response';
import { parseBody, parseQuery } from '@/lib/request';
import {
  GuardarAsistenciaDocenteSchema,
  ListarAsistenciaDocenteQuery,
} from '@/modules/asistencias/asistencia-docentes.schema';
import { AsistenciaDocentesService } from '@/modules/asistencias/asistencia-docentes.service';

export const dynamic = 'force-dynamic';

export const GET = withRole(['Admin'], async (req, { user }) => {
  try {
    const q = parseQuery(req, ListarAsistenciaDocenteQuery);
    const data = await AsistenciaDocentesService.list(q, user);
    return ok(data, 'Asistencia de docentes');
  } catch (error) {
    return errorResponse(error);
  }
});

export const POST = withRole(['Admin'], async (req, { user }) => {
  try {
    const input = await parseBody(req, GuardarAsistenciaDocenteSchema);
    const data = await AsistenciaDocentesService.guardar(input, user);
    return created(data, 'Asistencia de docentes registrada');
  } catch (error) {
    return errorResponse(error);
  }
});
