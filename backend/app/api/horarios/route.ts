// ============================================================
//  /api/horarios
//   GET  — bloques de horario (?periodoId&seccionId)   (autenticado)
//   POST — crea un bloque de horario                    (Admin)
//  El trigger tg_validar_cruce_horario rechaza los cruces.
// ============================================================
import { withAuth, withRole } from '@/lib/auth';
import { ok, created } from '@/lib/response';
import { parseBody, parseQuery } from '@/lib/request';
import { CreateHorarioSchema, HorariosQuery } from '@/schemas/academic.schema';
import { HorarioService } from '@/modules/academic/asignacion.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (req) => {
  const { periodoId, seccionId } = parseQuery(req, HorariosQuery);
  const data = await HorarioService.list({ periodoId, seccionId });
  return ok(data, 'Horarios');
});

export const POST = withRole(['Admin'], async (req) => {
  const input = await parseBody(req, CreateHorarioSchema);
  const horario = await HorarioService.create(input);
  return created(horario, 'Bloque de horario creado');
});
