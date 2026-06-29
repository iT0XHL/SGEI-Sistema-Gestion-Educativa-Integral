// ============================================================
//  Asistencia del PERSONAL DOCENTE (gestión solo Admin)
//  PATCH  /api/asistencias/:id — Edita asistencia docente (Admin)
//  DELETE /api/asistencias/:id — Elimina asistencia docente (Admin)
// ============================================================
import { withRole } from '@/lib/auth';
import { ok } from '@/lib/response';
import { parseBody } from '@/lib/request';
import { UpdateAsistenciaSchema } from '@/schemas/asistencia.schema';
import { AsistenciaService } from '@/modules/asistencia/asistencia.service';

export const dynamic = 'force-dynamic';

export const PATCH = withRole(['Admin'], async (req, { params, user }) => {
  const input = await parseBody(req, UpdateAsistenciaSchema);
  const result = await AsistenciaService.update(params.id, input, user.perfilId);
  return ok(result, 'Asistencia actualizada');
});

export const DELETE = withRole(['Admin'], async (_req, { params, user }) => {
  const result = await AsistenciaService.delete(params.id, user.perfilId);
  return ok(result, 'Asistencia eliminada');
});
