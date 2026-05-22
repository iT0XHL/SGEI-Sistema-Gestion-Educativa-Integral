import { withRole } from '@/lib/auth';
import { ok } from '@/lib/response';
import { parseBody } from '@/lib/request';
import { UpdatePeriodoSchema } from '@/schemas/periodo.schema';
import { PeriodoService } from '@/modules/periodo/periodo.service';

export const dynamic = 'force-dynamic';

export const PATCH = withRole(['Admin'], async (req, { params, user }) => {
  const input = await parseBody(req, UpdatePeriodoSchema);
  const result = await PeriodoService.update(params.id, input, user.perfilId);
  return ok(result, 'Período actualizado');
});

export const DELETE = withRole(['Admin'], async (_req, { params, user }) => {
  const result = await PeriodoService.delete(params.id, user.perfilId);
  return ok(result, 'Período eliminado');
});

export const PUT = withRole(['Admin'], async (req, { params, user }) => {
  const body = await req.json();
  if (body.activo !== undefined) {
    const result = await PeriodoService.setActivo(params.id, body.activo, user.perfilId);
    return ok(result, `Período ${body.activo ? 'activado' : 'desactivado'}`);
  }
  throw new Error('Request inválido');
});
