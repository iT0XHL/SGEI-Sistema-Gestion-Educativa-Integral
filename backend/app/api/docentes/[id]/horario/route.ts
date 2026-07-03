// ============================================================
//  GET /api/docentes/:id/horario — Horario PUBLICADO del docente
//  (?periodoId, opcional → período activo por defecto). Nunca sirve
//  el borrador. Secretaría no tiene acceso (decisión de negocio) —
//  el chequeo de acceso vive en HorarioPublicacionService.
// ============================================================
import { withAuth } from '@/lib/auth';
import { ok } from '@/lib/response';
import { HorarioPublicacionService } from '@/modules/horarios/horario-publicacion.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (req, { user, params }) => {
  const { searchParams } = new URL(req.url);
  const periodoId = searchParams.get('periodoId') ?? undefined;
  const data = await HorarioPublicacionService.horarioPublicadoDeDocente(params.id, periodoId, user);
  return ok(data, 'Horario del docente');
});
