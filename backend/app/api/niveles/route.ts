// ============================================================
//  /api/niveles
//   GET  — lista de niveles educativos   (autenticado)
//   POST — crea un nivel                 (Admin)
// ============================================================
import { withAuth, withRole } from '@/lib/auth';
import { ok, okCached, created } from '@/lib/response';
import { parseBody } from '@/lib/request';
import { CreateNivelSchema } from '@/schemas/academic.schema';
import { NivelService } from '@/modules/academic/estructura.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async () => {
  const data = await NivelService.list();
  return okCached(data, 'Niveles educativos');
});

export const POST = withRole(['Admin'], async (req) => {
  const input = await parseBody(req, CreateNivelSchema);
  const nivel = await NivelService.create(input);
  return created(nivel, 'Nivel creado');
});
