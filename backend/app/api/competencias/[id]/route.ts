// ============================================================
//  /api/competencias/:id
//   PUT    — actualiza una competencia   (Admin)
//   DELETE — elimina una competencia     (Admin)
// ============================================================
import { withRole } from '@/lib/auth';
import { ok } from '@/lib/response';
import { parseBody } from '@/lib/request';
import { UpdateCompetenciaSchema } from '@/schemas/academic.schema';
import { CompetenciaService } from '@/modules/academic/estructura.service';

export const dynamic = 'force-dynamic';

export const PUT = withRole(['Admin'], async (req, { params }) => {
  const input = await parseBody(req, UpdateCompetenciaSchema);
  const competencia = await CompetenciaService.update(params.id, input);
  return ok(competencia, 'Competencia actualizada');
});

export const DELETE = withRole(['Admin'], async (_req, { params }) => {
  const result = await CompetenciaService.remove(params.id);
  return ok(result, 'Competencia eliminada');
});
