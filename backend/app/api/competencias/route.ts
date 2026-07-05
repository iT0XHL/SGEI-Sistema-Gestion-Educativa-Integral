// ============================================================
//  /api/competencias
//   GET  — lista de competencias (?cursoId, ?gradoId)   (autenticado)
//   POST — crea una competencia                          (Admin)
//
//   Con gradoId: si el curso tiene overrides para ese grado, se
//   devuelven esos; si no, se cae al default del nivel (grado_id NULL).
// ============================================================
import { withAuth, withRole } from '@/lib/auth';
import { ok, created } from '@/lib/response';
import { parseBody, parseQuery } from '@/lib/request';
import { CreateCompetenciaSchema, CompetenciasQuery } from '@/schemas/academic.schema';
import { CompetenciaService } from '@/modules/academic/estructura.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (req) => {
  const { cursoId, gradoId } = parseQuery(req, CompetenciasQuery);
  const data = await CompetenciaService.list(cursoId, gradoId);
  return ok(data, 'Competencias');
});

export const POST = withRole(['Admin'], async (req) => {
  const input = await parseBody(req, CreateCompetenciaSchema);
  const competencia = await CompetenciaService.create(input);
  return created(competencia, 'Competencia creada');
});
