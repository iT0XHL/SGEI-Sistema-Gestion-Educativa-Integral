// ============================================================
//  GET /api/periodos/:id — Detalle de un período académico.
// ============================================================
import { withAuth } from '@/lib/auth';
import { ok } from '@/lib/response';
import { PeriodoService } from '@/modules/academic/periodo.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (_req, { params }) => {
  const periodo = await PeriodoService.get(params.id);
  return ok(periodo, 'Detalle de período');
});
