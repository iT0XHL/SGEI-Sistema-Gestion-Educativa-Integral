// ============================================================
//  /api/simulacros/:id/examen
//   GET  — examen oficial de un grado (?gradoId)     (Admin)
//   PUT  — arma/reemplaza el examen de un grado       (Admin)
//          body: { grado_id, cursos:[{curso_id, orden, pregunta_ids:[5]}] }
// ============================================================
import { withRole } from '@/lib/auth';
import { ok } from '@/lib/response';
import { parseBody, parseQuery } from '@/lib/request';
import { ExamenQuery, GuardarExamenSchema } from '@/schemas/simulacro.schema';
import { SimulacroService } from '@/modules/simulacros/simulacro.service';

export const dynamic = 'force-dynamic';

export const GET = withRole(['Admin'], async (req, { params }) => {
  const { gradoId } = parseQuery(req, ExamenQuery);
  const data = await SimulacroService.getExamen(params.id, gradoId);
  return ok(data, 'Examen del grado');
});

export const PUT = withRole(['Admin'], async (req, { params }) => {
  const input = await parseBody(req, GuardarExamenSchema);
  const data = await SimulacroService.guardarExamen(params.id, input);
  return ok(data, 'Examen guardado');
});
