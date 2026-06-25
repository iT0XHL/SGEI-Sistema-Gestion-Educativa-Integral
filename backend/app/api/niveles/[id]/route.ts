// ============================================================
//  /api/niveles/:id
//   PATCH  — actualiza un nivel        (Admin)
//   DELETE — elimina un nivel vacío    (Admin)
// ============================================================
import { withRole } from '@/lib/auth';
import { ok } from '@/lib/response';
import { parseBody } from '@/lib/request';
import { UpdateNivelSchema } from '@/schemas/academic.schema';
import { NivelService } from '@/modules/academic/estructura.service';

export const dynamic = 'force-dynamic';

export const PATCH = withRole(['Admin'], async (req, { params }) => {
  const input = await parseBody(req, UpdateNivelSchema);
  const nivel = await NivelService.update(params.id, input);
  return ok(nivel, 'Nivel actualizado');
});

export const DELETE = withRole(['Admin'], async (_req, { params }) => {
  const result = await NivelService.remove(params.id);
  return ok(result, 'Nivel eliminado');
});
