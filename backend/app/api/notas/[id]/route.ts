import { type NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth';
import { parseBody } from '@/lib/request';
import { ok, errorResponse } from '@/lib/response';
import { NotaService } from '@/modules/notas/nota.service';
import { UpdateNotaSchema } from '@/modules/notas/nota.schema';

export function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(req, async (ctx) => {
    try {
      const nota = await NotaService.obtener(params.id, ctx.user);
      return ok(nota, 'Nota obtenida.');
    } catch (e) {
      return errorResponse(e);
    }
  });
}

export function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(req, async (ctx) => {
    try {
      const body = await parseBody(req, UpdateNotaSchema);
      const nota = await NotaService.actualizar(params.id, body, ctx.user);
      return ok(nota, 'Nota actualizada.');
    } catch (e) {
      return errorResponse(e);
    }
  });
}
