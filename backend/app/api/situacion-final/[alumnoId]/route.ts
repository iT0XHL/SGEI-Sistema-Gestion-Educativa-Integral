import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth';
import { ok, errorResponse } from '@/lib/response';
import { ValidationError } from '@/errors/http-errors';
import { SfaService } from '@/modules/situacion-final/sfa.service';

export const GET = withAuth(async (req: NextRequest, { user, params }) => {
  try {
    const { alumnoId } = params;
    const periodoId    = req.nextUrl.searchParams.get('periodoId');
    if (!periodoId) {
      return errorResponse(new ValidationError({ periodoId: ['periodoId es requerido'] }));
    }
    const data = await SfaService.obtener(alumnoId, periodoId, user);
    return ok(data, 'Situación final obtenida.');
  } catch (e) {
    return errorResponse(e);
  }
});

export const DELETE = withAuth(async (req: NextRequest, { user, params }) => {
  try {
    const { alumnoId } = params;
    const periodoId    = req.nextUrl.searchParams.get('periodoId');
    if (!periodoId) {
      return errorResponse(new ValidationError({ periodoId: ['periodoId es requerido'] }));
    }
    await SfaService.eliminar(alumnoId, periodoId, user);
    return ok(null, 'Situación final eliminada.');
  } catch (e) {
    return errorResponse(e);
  }
});
