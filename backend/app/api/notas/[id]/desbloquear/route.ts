import { withRole } from '@/lib/auth';
import { parseBody } from '@/lib/request';
import { ok, errorResponse } from '@/lib/response';
import { NotaService } from '@/modules/notas/nota.service';
import { DesbloquearNotaSchema } from '@/modules/notas/nota.schema';

export const dynamic = 'force-dynamic';

export const POST = withRole(['Admin'], async (req, { params, user }) => {
  try {
    const body = await parseBody(req, DesbloquearNotaSchema);
    const nota = await NotaService.desbloquear(params.id, body, user);
    return ok(nota, 'Nota desbloqueada y valor actualizado.');
  } catch (e) {
    return errorResponse(e);
  }
});
