import { withRole } from '@/lib/auth';
import { ok } from '@/lib/response';
import { parseBody } from '@/lib/request';
import { UpdateDocenteSchema } from '@/schemas/personas.schema';
import { DocentesService } from '@/modules/docentes/docentes.service';

export const dynamic = 'force-dynamic';

export const GET = withRole(['Admin', 'Secretaria'], async (_req, { params }) => {
  const docente = await DocentesService.get(params.id);
  return ok(docente, 'Detalle del docente');
});

export const PATCH = withRole(['Admin'], async (req, { params, user }) => {
  const input = await parseBody(req, UpdateDocenteSchema);
  const docente = await DocentesService.update(params.id, input, user);
  return ok(docente, 'Docente actualizado');
});
