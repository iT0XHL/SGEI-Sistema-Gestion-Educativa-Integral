// ============================================================
//  /api/grados
//   GET  — lista de grados (?nivelId)   (autenticado)
//   POST — crea un grado                (Admin)
// ============================================================
import { withAuth, withRole } from '@/lib/auth';
import { okCached, created } from '@/lib/response';
import { parseBody, parseQuery } from '@/lib/request';
import { CreateGradoSchema, NivelIdQuery } from '@/schemas/academic.schema';
import { GradoService } from '@/modules/academic/estructura.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (req) => {
  const { nivelId } = parseQuery(req, NivelIdQuery);
  const data = await GradoService.list(nivelId);
  return okCached(data, 'Grados');
});

export const POST = withRole(['Admin'], async (req) => {
  const input = await parseBody(req, CreateGradoSchema);
  const grado = await GradoService.create(input);
  return created(grado, 'Grado creado');
});
