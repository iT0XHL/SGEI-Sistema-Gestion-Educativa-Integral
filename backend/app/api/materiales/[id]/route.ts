// ============================================================
//  /api/materiales/[id]
//   GET    — obtener un material (Docente propio, Alumno sección, Admin)
//   PATCH  — editar metadatos (Docente propio, Admin)
//   DELETE — eliminar material + archivo en Storage (Docente propio, Admin)
// ============================================================
import { withAuth } from '@/lib/auth';
import { ok, errorResponse } from '@/lib/response';
import { parseBody } from '@/lib/request';
import { UpdateMaterialSchema } from '@/modules/materiales/materiales.schema';
import { MaterialesService } from '@/modules/materiales/materiales.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (req, { user, params }) => {
  try {
    const data = await MaterialesService.get(params.id, user);
    return ok(data, 'Material');
  } catch (error) {
    return errorResponse(error);
  }
});

export const PATCH = withAuth(async (req, { user, params }) => {
  try {
    const input = await parseBody(req, UpdateMaterialSchema);
    const data = await MaterialesService.update(params.id, input, user);
    return ok(data, 'Material actualizado');
  } catch (error) {
    return errorResponse(error);
  }
});

export const DELETE = withAuth(async (req, { user, params }) => {
  try {
    const data = await MaterialesService.delete(params.id, user);
    return ok(data, 'Material eliminado');
  } catch (error) {
    return errorResponse(error);
  }
});
