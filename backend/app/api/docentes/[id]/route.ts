// ============================================================
//  /api/docentes/:id
//   GET — detalle    (Admin, Secretaria, o el propio Docente)
//   PUT — actualiza  (Admin)
// ============================================================
import { withAuth, withRole, assertAccess } from '@/lib/auth';
import { ok } from '@/lib/response';
import { parseBody } from '@/lib/request';
import { UpdateDocenteSchema } from '@/schemas/personas.schema';
import { DocentesService } from '@/modules/docentes/docentes.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (_req, { user, params }) => {
  assertAccess(
    user.rol === 'Admin' ||
      user.rol === 'Secretaria' ||
      (user.rol === 'Docente' && user.entidadId === params.id),
  );
  const docente = await DocentesService.get(params.id);
  return ok(docente, 'Detalle de docente');
});

export const PUT = withRole(['Admin'], async (req, { params }) => {
  const input = await parseBody(req, UpdateDocenteSchema);
  const docente = await DocentesService.update(params.id, input);
  return ok(docente, 'Docente actualizado');
});
