// ============================================================
//  DELETE /api/grados/:id/cursos/:cursoId
//   Quita un curso del grado (no elimina el curso del catálogo). (Admin)
// ============================================================
import { withRole } from '@/lib/auth';
import { ok } from '@/lib/response';
import { GradoCursoService } from '@/modules/academic/estructura.service';

export const dynamic = 'force-dynamic';

export const DELETE = withRole(['Admin'], async (_req, { params }) => {
  const data = await GradoCursoService.unassign(params.id, params.cursoId);
  return ok(data, 'Curso quitado del grado');
});
