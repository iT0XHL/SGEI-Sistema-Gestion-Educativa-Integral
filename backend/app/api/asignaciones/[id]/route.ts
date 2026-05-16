// ============================================================
//  DELETE /api/asignaciones/:id — Da de baja una asignación (Admin).
//  Baja lógica: marca activo = false.
// ============================================================
import { withRole } from '@/lib/auth';
import { ok } from '@/lib/response';
import { AsignacionService } from '@/modules/academic/asignacion.service';

export const dynamic = 'force-dynamic';

export const DELETE = withRole(['Admin'], async (_req, { params }) => {
  const result = await AsignacionService.remove(params.id);
  return ok(result, 'Asignación dada de baja');
});
