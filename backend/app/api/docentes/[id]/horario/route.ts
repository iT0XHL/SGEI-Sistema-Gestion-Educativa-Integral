// ============================================================
//  GET /api/docentes/:id/horario — Bloques de horario del docente.
// ============================================================
import { withAuth, assertAccess } from '@/lib/auth';
import { ok } from '@/lib/response';
import { DocentesService } from '@/modules/docentes/docentes.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (_req, { user, params }) => {
  assertAccess(
    user.rol === 'Admin' ||
      user.rol === 'Secretaria' ||
      (user.rol === 'Docente' && user.entidadId === params.id),
  );
  const data = await DocentesService.horario(params.id);
  return ok(data, 'Horario del docente');
});
