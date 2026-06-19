import { type NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth';
import { ok, errorResponse } from '@/lib/response';
import { LibretaService } from '@/modules/libretas/libreta.service';

export function GET(req: NextRequest, { params }: { params: { seccionId: string } }) {
  return withAuth(req, async (ctx) => {
    try {
      const { searchParams } = new URL(req.url);
      const bimestreId = searchParams.get('bimestreId') ?? undefined;
      const resumen = await LibretaService.resumenSeccion(params.seccionId, bimestreId, ctx.user);
      return ok(resumen, 'Resumen de sección obtenido.');
    } catch (e) {
      return errorResponse(e);
    }
  });
}
