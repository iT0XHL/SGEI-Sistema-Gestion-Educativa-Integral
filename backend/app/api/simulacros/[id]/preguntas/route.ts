// ============================================================
//  GET /api/simulacros/:id/preguntas — Matriz de curaduría (Admin).
//  Filtros: ?nivelId&gradoId&seccionId&cursoId
// ============================================================
import { withRole } from '@/lib/auth';
import { ok } from '@/lib/response';
import { parseQuery } from '@/lib/request';
import { CuraduriaQuery } from '@/schemas/simulacro.schema';
import { SimulacroService } from '@/modules/simulacros/simulacro.service';

export const dynamic = 'force-dynamic';

export const GET = withRole(['Admin'], async (req, { params }) => {
  const filters = parseQuery(req, CuraduriaQuery);
  const data = await SimulacroService.curaduria(params.id, filters);
  return ok(data, 'Banco de preguntas');
});
