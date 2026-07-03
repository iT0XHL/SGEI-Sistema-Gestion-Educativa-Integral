// ============================================================
//  GET /api/alumnos/:id/horario — Horario publicado de la sección
//  del alumno (?periodoId, opcional → período activo por defecto).
//  La sección se resuelve en el servidor a partir del alumno, nunca
//  se confía en un seccionId enviado por el cliente. Secretaría NO
//  tiene acceso a este módulo (decisión de negocio) — a diferencia
//  de canAccessAlumno() (que sí incluye Secretaria), aquí el check
//  se hace inline sin ese helper.
// ============================================================
import { withAuth } from '@/lib/auth';
import { ok } from '@/lib/response';
import { HorarioPublicacionService } from '@/modules/horarios/horario-publicacion.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (req, { user, params }) => {
  const { searchParams } = new URL(req.url);
  const periodoId = searchParams.get('periodoId') ?? undefined;
  const data = await HorarioPublicacionService.horarioPublicadoDeAlumno(params.id, periodoId, user);
  return ok(data, 'Horario del alumno');
});
