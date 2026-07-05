// ============================================================
//  /api/areas-academicas/:id
//   PUT    — actualiza un área académica          (Admin)
//   DELETE — elimina un área académica sin cursos  (Admin)
// ============================================================
import { withRole } from '@/lib/auth';
import { ok } from '@/lib/response';
import { parseBody } from '@/lib/request';
import { UpdateAreaAcademicaSchema } from '@/schemas/academic.schema';
import { AreaAcademicaService } from '@/modules/academic/estructura.service';

export const dynamic = 'force-dynamic';

export const PUT = withRole(['Admin'], async (req, { params }) => {
  const input = await parseBody(req, UpdateAreaAcademicaSchema);
  const area = await AreaAcademicaService.update(params.id, input);
  return ok(area, 'Área académica actualizada');
});

export const DELETE = withRole(['Admin'], async (_req, { params }) => {
  const result = await AreaAcademicaService.remove(params.id);
  return ok(result, 'Área académica eliminada');
});
