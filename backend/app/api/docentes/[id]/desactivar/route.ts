// ============================================================
//  PATCH /api/docentes/:id/desactivar — Baja lógica (Admin).
// ============================================================
import { withRole } from '@/lib/auth';
import { ok } from '@/lib/response';
import { DocentesService } from '@/modules/docentes/docentes.service';

export const dynamic = 'force-dynamic';

export const PATCH = withRole(['Admin'], async (_req, { params, user }) => {
  const result = await DocentesService.deactivate(params.id, user.perfilId);
  return ok(result, 'Docente desactivado');
});
