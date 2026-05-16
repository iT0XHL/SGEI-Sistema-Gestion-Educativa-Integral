// ============================================================
//  DELETE /api/horarios/:id — Elimina un bloque de horario (Admin).
// ============================================================
import { withRole } from '@/lib/auth';
import { ok } from '@/lib/response';
import { HorarioService } from '@/modules/academic/asignacion.service';

export const dynamic = 'force-dynamic';

export const DELETE = withRole(['Admin'], async (_req, { params }) => {
  const result = await HorarioService.remove(params.id);
  return ok(result, 'Bloque de horario eliminado');
});
