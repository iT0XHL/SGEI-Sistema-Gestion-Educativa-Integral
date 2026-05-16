// ============================================================
//  GET /api/docentes/:id/asignaciones — Asignaciones del docente.
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
  const data = await DocentesService.asignaciones(params.id);
  return ok(data, 'Asignaciones del docente');
});
