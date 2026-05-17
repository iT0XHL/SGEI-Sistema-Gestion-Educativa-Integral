import { type NextRequest } from 'next/server';
import { withRole } from '@/lib/auth';
import { parseBody } from '@/lib/request';
import { ok, errorResponse } from '@/lib/response';
import { NotaService } from '@/modules/notas/nota.service';
import { DesbloquearNotaSchema } from '@/modules/notas/nota.schema';

export function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return withRole(['Admin'], req, async (ctx) => {
    try {
      const body = await parseBody(req, DesbloquearNotaSchema);
      const nota = await NotaService.desbloquear(params.id, body, ctx.user);
      return ok(nota, 'Nota desbloqueada y valor actualizado.');
    } catch (e) {
      return errorResponse(e);
    }
  });
}
