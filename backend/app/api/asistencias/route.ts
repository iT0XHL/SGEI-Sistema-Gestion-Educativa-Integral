// ============================================================
//  /api/asistencias  — Asistencia del PERSONAL DOCENTE
//   GET  — listar asistencia de docentes          (Admin)
//   POST — registrar asistencia de docente         (Admin)
//
//  Solo el rol Admin gestiona la asistencia docente (ver DDL v2.1:
//  "Solo el rol Admin puede registrar, validado por RLS"). La
//  Secretaría no participa en este flujo.
// ============================================================
import { withRole } from '@/lib/auth';
import { ok, created } from '@/lib/response';
import { parseBody, parseQuery } from '@/lib/request';
import { CreateAsistenciaSchema, ListAsistenciasQuery } from '@/schemas/asistencia.schema';
import { AsistenciaService } from '@/modules/asistencia/asistencia.service';

export const dynamic = 'force-dynamic';

export const GET = withRole(['Admin'], async (req) => {
  const q = parseQuery(req, ListAsistenciasQuery);
  const data = await AsistenciaService.list(q);
  return ok(data, 'Listado de asistencias');
});

export const POST = withRole(['Admin'], async (req, { user }) => {
  const input = await parseBody(req, CreateAsistenciaSchema);
  const asistencia = await AsistenciaService.create(input, user.perfilId);
  return created(asistencia, 'Asistencia registrada');
});
