// ============================================================
//  /api/grados/:id/cursos
//   GET  — cursos asignados al grado            (autenticado)
//   POST — asigna un curso del nivel al grado   (Admin)
// ============================================================
import { withAuth, withRole } from '@/lib/auth';
import { okCached, created } from '@/lib/response';
import { parseBody } from '@/lib/request';
import { AssignGradoCursoSchema } from '@/schemas/academic.schema';
import { GradoCursoService } from '@/modules/academic/estructura.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (_req, { params }) => {
  const data = await GradoCursoService.list(params.id);
  return okCached(data, 'Cursos del grado');
});

export const POST = withRole(['Admin'], async (req, { params }) => {
  const { curso_id } = await parseBody(req, AssignGradoCursoSchema);
  const data = await GradoCursoService.assign(params.id, curso_id);
  return created(data, 'Curso asignado al grado');
});
