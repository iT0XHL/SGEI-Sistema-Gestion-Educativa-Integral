// ============================================================
//  /api/secciones
//   GET  — lista de secciones (?periodoId&gradoId)  (autenticado)
//   POST — crea una sección                          (Admin)
// ============================================================
import { withAuth, withRole } from '@/lib/auth';
import { okCached, created } from '@/lib/response';
import { parseBody, parseQuery } from '@/lib/request';
import { CreateSeccionSchema, SeccionesQuery } from '@/schemas/academic.schema';
import { SeccionService } from '@/modules/academic/estructura.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (req) => {
  const { periodoId, gradoId } = parseQuery(req, SeccionesQuery);
  const data = await SeccionService.list({ periodoId, gradoId });
  return okCached(data, 'Secciones');
});

export const POST = withRole(['Admin'], async (req) => {
  const input = await parseBody(req, CreateSeccionSchema);
  const seccion = await SeccionService.create(input);
  return created(seccion, 'Sección creada');
});
