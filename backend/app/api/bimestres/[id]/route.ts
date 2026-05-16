// ============================================================
//  /api/bimestres/:id
//   GET — detalle      (autenticado)
//   PUT — actualiza    (Admin, solo si no está cerrado)
// ============================================================
import { withAuth, withRole } from '@/lib/auth';
import { ok } from '@/lib/response';
import { parseBody } from '@/lib/request';
import { UpdateBimestreSchema } from '@/schemas/academic.schema';
import { BimestreService } from '@/modules/academic/periodo.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (_req, { params }) => {
  const bimestre = await BimestreService.get(params.id);
  return ok(bimestre, 'Detalle de bimestre');
});

export const PUT = withRole(['Admin'], async (req, { params }) => {
  const input = await parseBody(req, UpdateBimestreSchema);
  const bimestre = await BimestreService.update(params.id, input);
  return ok(bimestre, 'Bimestre actualizado');
});
