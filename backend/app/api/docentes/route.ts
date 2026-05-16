// ============================================================
//  /api/docentes
//   GET  — lista paginada de docentes   (Admin, Secretaria)
//   POST — crea docente + credencial    (Admin)
// ============================================================
import { withRole } from '@/lib/auth';
import { ok, created } from '@/lib/response';
import { parseBody, parseQuery } from '@/lib/request';
import { CreateDocenteSchema, ListDocentesQuery } from '@/schemas/personas.schema';
import { DocentesService } from '@/modules/docentes/docentes.service';

export const dynamic = 'force-dynamic';

export const GET = withRole(['Admin', 'Secretaria'], async (req) => {
  const q = parseQuery(req, ListDocentesQuery);
  const data = await DocentesService.list(q);
  return ok(data, 'Docentes');
});

export const POST = withRole(['Admin'], async (req, { user }) => {
  const input = await parseBody(req, CreateDocenteSchema);
  const docente = await DocentesService.create(input, user.perfilId);
  return created(docente, 'Docente creado');
});
