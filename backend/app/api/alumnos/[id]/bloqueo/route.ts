// ============================================================
//  PATCH /api/alumnos/:id/bloqueo — Bloqueo manual de libreta (Admin).
//  bloqueo_manual=TRUE impide la descarga de la libreta aunque
//  el alumno no tenga deuda (ver fn_bloquea_libreta en el DDL).
// ============================================================
import { withRole } from '@/lib/auth';
import { ok } from '@/lib/response';
import { parseBody } from '@/lib/request';
import { BloqueoLibretaSchema } from '@/schemas/personas.schema';
import { AlumnosService } from '@/modules/alumnos/alumnos.service';

export const dynamic = 'force-dynamic';

export const PATCH = withRole(['Admin'], async (req, { params, user }) => {
  const { bloqueo_manual } = await parseBody(req, BloqueoLibretaSchema);
  const alumno = await AlumnosService.setBloqueoManual(
    params.id,
    bloqueo_manual,
    user.perfilId,
  );
  return ok(alumno, bloqueo_manual ? 'Libreta bloqueada' : 'Libreta desbloqueada');
});
