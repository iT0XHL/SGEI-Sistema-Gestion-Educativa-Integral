// ============================================================
//  /api/bimestres
//   GET  — lista de bimestres (?periodoId)   (autenticado)
//   POST — crea un bimestre                  (Admin)
// ============================================================
import { withAuth, withRole } from '@/lib/auth';
import { ok, created } from '@/lib/response';
import { parseBody, parseQuery } from '@/lib/request';
import { CreateBimestreSchema, BimestresQuery } from '@/schemas/academic.schema';
import { BimestreService } from '@/modules/academic/periodo.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (req) => {
  const { periodoId } = parseQuery(req, BimestresQuery);
  const data = await BimestreService.list(periodoId);
  return ok(data, 'Bimestres');
});

export const POST = withRole(['Admin'], async (req) => {
  const input = await parseBody(req, CreateBimestreSchema);
  const bimestre = await BimestreService.create(input);
  return created(bimestre, 'Bimestre creado');
});
