// ============================================================
//  PATCH /api/horarios/:id — Actualiza un bloque de horario (Admin).
//  DELETE /api/horarios/:id — Elimina un bloque de horario (Admin).
// ============================================================
import { withRole } from '@/lib/auth';
import { ok } from '@/lib/response';
import { parseBody } from '@/lib/request';
import { UpdateHorarioSchema } from '@/schemas/academic.schema';
import { HorarioService } from '@/modules/academic/asignacion.service';

export const dynamic = 'force-dynamic';

export const PATCH = withRole(['Admin'], async (req, { params }) => {
  const input = await parseBody(req, UpdateHorarioSchema);
  const result = await HorarioService.update(params.id, input);
  return ok(result, 'Bloque de horario actualizado');
});

export const DELETE = withRole(['Admin'], async (_req, { params }) => {
  const result = await HorarioService.remove(params.id);
  return ok(result, 'Bloque de horario eliminado');
});
