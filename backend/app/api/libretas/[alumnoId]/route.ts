import { type NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth';
import { ok, errorResponse } from '@/lib/response';
import { LibretaService } from '@/modules/libretas/libreta.service';

export function GET(req: NextRequest, { params }: { params: { alumnoId: string } }) {
  return withAuth(req, async (ctx) => {
    try {
      const { searchParams } = new URL(req.url);
      const bimestreId = searchParams.get('bimestreId') ?? undefined;
      const rows = await LibretaService.obtener(params.alumnoId, bimestreId, ctx.user);
      return ok(rows, 'Libreta obtenida.');
    } catch (e) {
      return errorResponse(e);
    }
  });
}
