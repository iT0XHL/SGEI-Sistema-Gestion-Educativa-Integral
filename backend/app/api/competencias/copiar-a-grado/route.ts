// ============================================================
//  /api/competencias/copiar-a-grado
//   POST   — copia las competencias default del nivel como override
//            editable de un grado ("Personalizar para este grado")
//   DELETE — elimina los overrides de un grado, restaurando el
//            default del nivel ("Restaurar valores del nivel")
//                                                            (Admin)
// ============================================================
import { withRole } from '@/lib/auth';
import { ok } from '@/lib/response';
import { parseBody, parseQuery } from '@/lib/request';
import { CopiarCompetenciasAGradoSchema } from '@/schemas/academic.schema';
import { CompetenciaService } from '@/modules/academic/estructura.service';

export const dynamic = 'force-dynamic';

export const POST = withRole(['Admin'], async (req) => {
  const { curso_id, grado_id } = await parseBody(req, CopiarCompetenciasAGradoSchema);
  const data = await CompetenciaService.copiarAGrado(curso_id, grado_id);
  return ok(data, 'Competencias personalizadas para el grado');
});

export const DELETE = withRole(['Admin'], async (req) => {
  const { curso_id, grado_id } = parseQuery(req, CopiarCompetenciasAGradoSchema);
  const data = await CompetenciaService.restaurarPredeterminado(curso_id, grado_id);
  return ok(data, 'Valores predeterminados del nivel restaurados');
});
