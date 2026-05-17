import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth';
import { SiagieService } from '@/modules/siagie/siagie.service';
import { ok, errorResponse } from '@/lib/response';

export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const periodoId = req.nextUrl.searchParams.get('periodoId') ?? undefined;
    const data = await SiagieService.stats(periodoId, user);
    return ok(data, 'Estadísticas SIAGIE');
  } catch (e) {
    return errorResponse(e);
  }
});
