// ============================================================
//  /api/secciones/:id
//   PATCH  — actualiza una sección          (Admin)
//   DELETE — elimina una sección sin alumnos (Admin)
// ============================================================
import { withRole } from '@/lib/auth';
import { ok } from '@/lib/response';
import { parseBody } from '@/lib/request';
import { UpdateSeccionSchema } from '@/schemas/academic.schema';
import { SeccionService } from '@/modules/academic/estructura.service';

export const dynamic = 'force-dynamic';

export const PATCH = withRole(['Admin'], async (req, { params }) => {
  const input = await parseBody(req, UpdateSeccionSchema);
  const seccion = await SeccionService.update(params.id, input);
  return ok(seccion, 'Sección actualizada');
});

export const DELETE = withRole(['Admin'], async (_req, { params }) => {
  const result = await SeccionService.remove(params.id);
  return ok(result, 'Sección eliminada');
});
