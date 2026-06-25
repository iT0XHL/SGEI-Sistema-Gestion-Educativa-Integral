// ============================================================
//  /api/grados/:id
//   PATCH  — actualiza un grado          (Admin)
//   DELETE — elimina un grado sin secciones (Admin)
// ============================================================
import { withRole } from '@/lib/auth';
import { ok } from '@/lib/response';
import { parseBody } from '@/lib/request';
import { UpdateGradoSchema } from '@/schemas/academic.schema';
import { GradoService } from '@/modules/academic/estructura.service';

export const dynamic = 'force-dynamic';

export const PATCH = withRole(['Admin'], async (req, { params }) => {
  const input = await parseBody(req, UpdateGradoSchema);
  const grado = await GradoService.update(params.id, input);
  return ok(grado, 'Grado actualizado');
});

export const DELETE = withRole(['Admin'], async (_req, { params }) => {
  const result = await GradoService.remove(params.id);
  return ok(result, 'Grado eliminado');
});
