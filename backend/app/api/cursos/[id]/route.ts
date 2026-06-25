// ============================================================
//  /api/cursos/:id
//   PUT    — actualiza un curso       (Admin)
//   DELETE — elimina un curso sin uso (Admin)
// ============================================================
import { withRole } from '@/lib/auth';
import { ok } from '@/lib/response';
import { parseBody } from '@/lib/request';
import { UpdateCursoSchema } from '@/schemas/academic.schema';
import { CursoService } from '@/modules/academic/estructura.service';

export const dynamic = 'force-dynamic';

export const PUT = withRole(['Admin'], async (req, { params }) => {
  const input = await parseBody(req, UpdateCursoSchema);
  const curso = await CursoService.update(params.id, input);
  return ok(curso, 'Curso actualizado');
});

export const DELETE = withRole(['Admin'], async (_req, { params }) => {
  const result = await CursoService.remove(params.id);
  return ok(result, 'Curso eliminado');
});
