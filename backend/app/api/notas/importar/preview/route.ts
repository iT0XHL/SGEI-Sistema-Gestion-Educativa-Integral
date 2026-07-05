// ============================================================
//  POST /api/notas/importar/preview
//   Sube la plantilla .xlsx ya llenada y devuelve una vista previa
//   validada contra el estado ACTUAL de la base de datos (alumnos
//   activos, competencias vigentes) — no escribe nada todavía. El
//   docente debe confirmar en el frontend, que luego llama al
//   endpoint existente POST /api/notas para persistir.
//                                                    (Docente/Admin)
// ============================================================
import { withAuth } from '@/lib/auth';
import { ok, errorResponse } from '@/lib/response';
import { NotasPlantillaService } from '@/modules/notas/notas-plantilla.service';

export const dynamic = 'force-dynamic';

export const POST = withAuth(async (req, { user }) => {
  try {
    const contentType = req.headers.get('content-type') ?? '';
    if (!contentType.includes('multipart/form-data')) {
      return errorResponse(new Error('Se requiere multipart/form-data con el campo "archivo".'));
    }

    const formData = await req.formData();
    const file = formData.get('archivo') as File | null;
    if (!file || typeof file === 'string') {
      return errorResponse(new Error('Se requiere el campo "archivo" en el form-data'));
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const preview = await NotasPlantillaService.previsualizar(buffer, user);
    return ok(preview, 'Vista previa generada.');
  } catch (e) {
    return errorResponse(e);
  }
});
