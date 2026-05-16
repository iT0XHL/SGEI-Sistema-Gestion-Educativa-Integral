// ============================================================
//  /api/competencias
//   GET  — lista de competencias (?cursoId)   (autenticado)
//   POST — crea una competencia                (Admin)
// ============================================================
import { withAuth, withRole } from '@/lib/auth';
import { ok, created } from '@/lib/response';
import { parseBody, parseQuery } from '@/lib/request';
import { CreateCompetenciaSchema, CompetenciasQuery } from '@/schemas/academic.schema';
import { CompetenciaService } from '@/modules/academic/estructura.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (req) => {
  const { cursoId } = parseQuery(req, CompetenciasQuery);
  const data = await CompetenciaService.list(cursoId);
  return ok(data, 'Competencias');
});

export const POST = withRole(['Admin'], async (req) => {
  const input = await parseBody(req, CreateCompetenciaSchema);
  const competencia = await CompetenciaService.create(input);
  return created(competencia, 'Competencia creada');
});
