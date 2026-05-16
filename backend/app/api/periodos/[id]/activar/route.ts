// ============================================================
//  PATCH /api/periodos/:id/activar — Activa el período (Admin).
//  El trigger tg_un_periodo_activo desactiva los demás.
// ============================================================
import { withRole } from '@/lib/auth';
import { ok } from '@/lib/response';
import { PeriodoService } from '@/modules/academic/periodo.service';

export const dynamic = 'force-dynamic';

export const PATCH = withRole(['Admin'], async (_req, { params, user }) => {
  const periodo = await PeriodoService.activar(params.id, user.perfilId);
  return ok(periodo, 'Período activado');
});
