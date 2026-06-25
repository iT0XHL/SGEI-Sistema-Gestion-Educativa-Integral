// ============================================================
//  /api/simulacros/activo/preguntas
//   GET  — preguntas ya guardadas por el docente (?cursoId&gradoId&seccionId)
//   POST — guarda (reemplaza) el bloque de 5 preguntas
//  Solo Docente. La persistencia ocurre únicamente en el POST.
// ============================================================
import { withRole } from '@/lib/auth';
import { ok, created } from '@/lib/response';
import { parseBody, parseQuery } from '@/lib/request';
import { GuardarPreguntasSchema, CargaQuery } from '@/schemas/simulacro.schema';
import { SimulacroService } from '@/modules/simulacros/simulacro.service';

export const dynamic = 'force-dynamic';

export const GET = withRole(['Docente'], async (req, { user }) => {
  const { cursoId, gradoId, seccionId } = parseQuery(req, CargaQuery);
  const data = await SimulacroService.getPreguntasDocente(user.entidadId, { cursoId, gradoId, seccionId });
  return ok(data, 'Preguntas del docente');
});

export const POST = withRole(['Docente'], async (req, { user }) => {
  const input = await parseBody(req, GuardarPreguntasSchema);
  const data = await SimulacroService.guardarPreguntas(user.entidadId, input);
  return created(data, 'Preguntas guardadas');
});
