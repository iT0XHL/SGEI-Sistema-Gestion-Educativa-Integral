// ============================================================
//  /api/horarios
//   GET  — bloques de horario borrador (?periodoId&seccionId&docenteId) (Admin)
//   POST — crea un bloque de horario                                    (Admin)
//  El trigger tg_validar_cruce_horario + la constraint EXCLUDE rechazan
//  los cruces. GET es solo Admin porque expone el borrador (no el
//  snapshot publicado) — Docente/Alumno consumen /api/docentes/:id/horario
//  y /api/alumnos/:id/horario, que sirven la última publicación.
// ============================================================
import { withRole } from '@/lib/auth';
import { ok, created } from '@/lib/response';
import { parseBody, parseQuery } from '@/lib/request';
import { CreateHorarioSchema, HorariosQuery } from '@/schemas/academic.schema';
import { HorarioService } from '@/modules/academic/asignacion.service';

export const dynamic = 'force-dynamic';

export const GET = withRole(['Admin'], async (req) => {
  const { periodoId, seccionId, docenteId } = parseQuery(req, HorariosQuery);
  const data = await HorarioService.list({ periodoId, seccionId, docenteId });
  return ok(data, 'Horarios');
});

export const POST = withRole(['Admin'], async (req) => {
  const input = await parseBody(req, CreateHorarioSchema);
  const horario = await HorarioService.create(input);
  return created(horario, 'Bloque de horario creado');
});
