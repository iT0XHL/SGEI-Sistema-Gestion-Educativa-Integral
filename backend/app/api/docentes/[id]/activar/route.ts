import { withRole } from '@/lib/auth';
import { ok } from '@/lib/response';
import { DocentesService } from '@/modules/docentes/docentes.service';

export const dynamic = 'force-dynamic';

export const POST = withRole(['Admin'], async (_req, { params, user }) => {
  const docente = await DocentesService.setActivo(params.id, true, user.perfilId);
  return ok(docente, 'Docente reactivado');
});
