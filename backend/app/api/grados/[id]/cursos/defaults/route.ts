// ============================================================
//  POST /api/grados/:id/cursos/defaults
//   Copia los cursos del nivel al grado (predeterminados). (Admin)
// ============================================================
import { withRole } from '@/lib/auth';
import { ok } from '@/lib/response';
import { GradoCursoService } from '@/modules/academic/estructura.service';

export const dynamic = 'force-dynamic';

export const POST = withRole(['Admin'], async (_req, { params }) => {
  const data = await GradoCursoService.applyNivelDefaults(params.id);
  return ok(data, 'Cursos del nivel aplicados al grado');
});
