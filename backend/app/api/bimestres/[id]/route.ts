import { withRole } from '@/lib/auth';
import { ok } from '@/lib/response';
import { parseBody } from '@/lib/request';
import { UpdateBimestreSchema } from '@/schemas/periodo.schema';
import { BimestreService } from '@/modules/periodo/periodo.service';

export const dynamic = 'force-dynamic';

export const PATCH = withRole(['Admin'], async (req, { params, user }) => {
  const input = await parseBody(req, UpdateBimestreSchema);
  const result = await BimestreService.update(params.id, input, user.perfilId);
  return ok(result, 'Bimestre actualizado');
});

export const DELETE = withRole(['Admin'], async (_req, { params, user }) => {
  const result = await BimestreService.delete(params.id, user.perfilId);
  return ok(result, 'Bimestre eliminado');
});
