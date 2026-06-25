// ============================================================
//  /api/simulacros
//   GET  — lista de simulacros del período (Admin)
//   POST — crea un simulacro (Admin)
// ============================================================
import { withRole } from '@/lib/auth';
import { ok, created } from '@/lib/response';
import { parseBody, parseQuery } from '@/lib/request';
import { CreateSimulacroSchema, ListSimulacrosQuery } from '@/schemas/simulacro.schema';
import { SimulacroService } from '@/modules/simulacros/simulacro.service';

export const dynamic = 'force-dynamic';

export const GET = withRole(['Admin'], async (req) => {
  const { periodoId } = parseQuery(req, ListSimulacrosQuery);
  const data = await SimulacroService.list(periodoId);
  return ok(data, 'Simulacros');
});

export const POST = withRole(['Admin'], async (req, { user }) => {
  const input = await parseBody(req, CreateSimulacroSchema);
  const sim = await SimulacroService.create(input, user.perfilId);
  return created(sim, 'Simulacro creado');
});
