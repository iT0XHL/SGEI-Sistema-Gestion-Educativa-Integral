// ============================================================
//  PATCH /api/competencias/reordenar — Reordena competencias (Admin).
// ============================================================
import { withRole } from '@/lib/auth';
import { ok } from '@/lib/response';
import { parseBody } from '@/lib/request';
import { ReordenarCompetenciasSchema } from '@/schemas/academic.schema';
import { CompetenciaService } from '@/modules/academic/estructura.service';

export const dynamic = 'force-dynamic';

export const PATCH = withRole(['Admin'], async (req) => {
  const input = await parseBody(req, ReordenarCompetenciasSchema);
  const result = await CompetenciaService.reordenar(input);
  return ok(result, 'Competencias reordenadas');
});
