// ============================================================
//  /api/materiales/[id]/archivo
//   GET — devuelve URL firmada temporal (300 s) para el archivo del material.
//         Para materiales tipo enlace/video devuelve la URL directamente.
//         Acceso: Docente propio, Alumno de la sección, Admin.
// ============================================================
import { withAuth } from '@/lib/auth';
import { ok, errorResponse } from '@/lib/response';
import { MaterialesService } from '@/modules/materiales/materiales.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (req, { user, params }) => {
  try {
    const data = await MaterialesService.getArchivoUrl(params.id, user);
    return ok(data, 'URL del archivo');
  } catch (error) {
    return errorResponse(error);
  }
});
