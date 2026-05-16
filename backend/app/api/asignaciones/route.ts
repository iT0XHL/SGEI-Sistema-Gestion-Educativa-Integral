// ============================================================
//  /api/asignaciones
//   GET  — asignaciones docente (?periodoId&seccionId&docenteId)  (autenticado)
//   POST — crea una asignación docente–curso–sección–período      (Admin)
// ============================================================
import { withAuth, withRole } from '@/lib/auth';
import { ok, created } from '@/lib/response';
import { parseBody, parseQuery } from '@/lib/request';
import { CreateAsignacionSchema, AsignacionesQuery } from '@/schemas/academic.schema';
import { AsignacionService } from '@/modules/academic/asignacion.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (req) => {
  const { periodoId, seccionId, docenteId } = parseQuery(req, AsignacionesQuery);
  const data = await AsignacionService.list({ periodoId, seccionId, docenteId });
  return ok(data, 'Asignaciones docente');
});

export const POST = withRole(['Admin'], async (req) => {
  const input = await parseBody(req, CreateAsignacionSchema);
  const asignacion = await AsignacionService.create(input);
  return created(asignacion, 'Asignación creada');
});
