import { withRole } from '@/lib/auth';
import { ok } from '@/lib/response';
import { AlumnosService } from '@/modules/alumnos/alumnos.service';

export const dynamic = 'force-dynamic';

export const POST = withRole(['Admin', 'Secretaria'], async (_req, { params, user }) => {
  const alumno = await AlumnosService.setActivo(params.id, true, user.perfilId);
  return ok(alumno, 'Alumno reactivado');
});
