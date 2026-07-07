// ============================================================
//  /api/areas-academicas
//   GET  — lista de áreas académicas (?nivelId)   (autenticado)
//   POST — crea un área académica                 (Admin)
// ============================================================
import { withAuth, withRole } from '@/lib/auth';
import { ok, okCached, created } from '@/lib/response';
import { parseBody, parseQuery } from '@/lib/request';
import { CreateAreaAcademicaSchema, NivelIdQuery } from '@/schemas/academic.schema';
import { AreaAcademicaService } from '@/modules/academic/estructura.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (req) => {
  const { nivelId } = parseQuery(req, NivelIdQuery);
  const data = await AreaAcademicaService.list(nivelId);
  return okCached(data, 'Áreas académicas');
});

export const POST = withRole(['Admin'], async (req) => {
  const input = await parseBody(req, CreateAreaAcademicaSchema);
  const area = await AreaAcademicaService.create(input);
  return created(area, 'Área académica creada');
});
