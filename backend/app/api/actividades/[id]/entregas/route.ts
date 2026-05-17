// ============================================================
//  /api/actividades/[id]/entregas
//   GET  — lista entregas de la actividad (Docente, Admin) / propia entrega (Alumno)
//   POST — alumno entrega
//          · application/json → sin archivo
//          · multipart/form-data → con archivo a Storage
// ============================================================
import { withAuth } from '@/lib/auth';
import { ok, created, errorResponse } from '@/lib/response';
import { parseBody } from '@/lib/request';
import { SubmitEntregaSchema } from '@/modules/actividades/actividades.schema';
import { ActividadesService } from '@/modules/actividades/actividades.service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (req, { user, params }) => {
  try {
    const data = await ActividadesService.listEntregas(params.id, user);
    return ok(data, 'Entregas');
  } catch (error) {
    return errorResponse(error);
  }
});

export const POST = withAuth(async (req, { user, params }) => {
  try {
    const contentType = req.headers.get('content-type') ?? '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('archivo') as File | null;
      if (!file || typeof file === 'string') {
        return errorResponse(new Error('Se requiere el campo "archivo" en el form-data'));
      }

      const comentario = formData.get('comentario_alumno');
      const comentarioStr = typeof comentario === 'string' ? comentario : null;

      const data = await ActividadesService.submitEntregaConArchivo(
        params.id,
        comentarioStr,
        file,
        user,
      );
      return created(data, 'Entrega registrada con archivo');
    }

    const input = await parseBody(req, SubmitEntregaSchema);
    const data = await ActividadesService.submitEntrega(params.id, input, user);
    return created(data, 'Entrega registrada');
  } catch (error) {
    return errorResponse(error);
  }
});
