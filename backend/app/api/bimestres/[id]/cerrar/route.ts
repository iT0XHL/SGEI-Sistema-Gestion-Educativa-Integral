// ============================================================
//  PATCH /api/bimestres/:id/cerrar — Cierra el bimestre (Admin).
//  El trigger tg_cerrar_notas_bimestre cierra todas sus notas.
// ============================================================
import { withRole } from '@/lib/auth';
import { ok } from '@/lib/response';
import { BimestreService } from '@/modules/periodo/periodo.service';

export const dynamic = 'force-dynamic';

export const PATCH = withRole(['Admin'], async (_req, { params, user }) => {
  const bimestre = await BimestreService.cerrar(params.id, user.perfilId);
  return ok(bimestre, 'Bimestre cerrado. Las notas asociadas quedaron cerradas.');
});
