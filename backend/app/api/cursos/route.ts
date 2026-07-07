// ============================================================
//  /api/cursos
//   GET  — lista de cursos (?nivelId)   (autenticado)
//   POST — crea un curso                (Admin)
// ============================================================
import { withAuth, withRole } from '@/lib/auth';
import { okCached, created } from '@/lib/response';
import { parseBody, parseQuery } from '@/lib/request';
import { CreateCursoSchema, NivelIdQuery } from '@/schemas/academic.schema';
import { CursoService } from '@/modules/academic/estructura.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (req) => {
  const { nivelId } = parseQuery(req, NivelIdQuery);
  const data = await CursoService.list(nivelId);
  return okCached(data, 'Cursos');
});

export const POST = withRole(['Admin'], async (req) => {
  const input = await parseBody(req, CreateCursoSchema);
  const curso = await CursoService.create(input);
  return created(curso, 'Curso creado');
});
