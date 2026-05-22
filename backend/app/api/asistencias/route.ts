// ============================================================
//  /api/asistencias
//   GET  — listar asistencias con filtros       (Admin, Secretaria)
//   POST — registrar asistencia                 (Admin, Secretaria)
// ============================================================
import { withRole } from '@/lib/auth';
import { ok, created } from '@/lib/response';
import { parseBody, parseQuery } from '@/lib/request';
import { CreateAsistenciaSchema, ListAsistenciasQuery } from '@/schemas/asistencia.schema';
import { AsistenciaService } from '@/modules/asistencia/asistencia.service';

export const dynamic = 'force-dynamic';

export const GET = withRole(['Admin', 'Secretaria'], async (req) => {
  const q = parseQuery(req, ListAsistenciasQuery);
  const data = await AsistenciaService.list(q);
  return ok(data, 'Listado de asistencias');
});

export const POST = withRole(['Admin', 'Secretaria'], async (req, { user }) => {
  const input = await parseBody(req, CreateAsistenciaSchema);
  const asistencia = await AsistenciaService.create(input, user.perfilId);
  return created(asistencia, 'Asistencia registrada');
});
