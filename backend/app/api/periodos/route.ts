// ============================================================
//  /api/periodos
//   GET  — lista de períodos académicos   (autenticado)
//   POST — crea un período                (Admin)
// ============================================================
import { withAuth, withRole } from '@/lib/auth';
import { ok, created } from '@/lib/response';
import { parseBody } from '@/lib/request';
import { CreatePeriodoSchema } from '@/schemas/academic.schema';
import { PeriodoService } from '@/modules/academic/periodo.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async () => {
  const data = await PeriodoService.list();
  return ok(data, 'Períodos académicos');
});

export const POST = withRole(['Admin'], async (req) => {
  const input = await parseBody(req, CreatePeriodoSchema);
  const periodo = await PeriodoService.create(input);
  return created(periodo, 'Período creado');
});
