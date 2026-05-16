// ============================================================
//  GET /api/alumnos/:id/cursos — Cursos (asignaciones) de la
//  sección del alumno en su período.
// ============================================================
import { withAuth, canAccessAlumno, assertAccess } from '@/lib/auth';
import { ok } from '@/lib/response';
import { AlumnosService } from '@/modules/alumnos/alumnos.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (_req, { user, params }) => {
  assertAccess(canAccessAlumno(user, params.id));
  const data = await AlumnosService.cursos(params.id);
  return ok(data, 'Cursos del alumno');
});
