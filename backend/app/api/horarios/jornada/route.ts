// ============================================================
//  /api/horarios/jornada
//   GET — jornada escolar de un nivel (?nivelId&periodoId)  (autenticado)
//   PUT — upsert (Admin)
//  Sin flujo de publicación: se sirve siempre en vivo.
// ============================================================
import { withAuth, withRole } from '@/lib/auth';
import { ok, okCached } from '@/lib/response';
import { parseBody, parseQuery } from '@/lib/request';
import { JornadaQuery, UpsertJornadaSchema } from '@/modules/horarios/nivel-horario-config.schema';
import { NivelHorarioConfigService } from '@/modules/horarios/nivel-horario-config.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (req) => {
  const { nivelId, periodoId } = parseQuery(req, JornadaQuery);
  const data = await NivelHorarioConfigService.obtener(nivelId, periodoId);
  return okCached(data, 'Jornada escolar');
});

export const PUT = withRole(['Admin'], async (req, { user }) => {
  const input = await parseBody(req, UpsertJornadaSchema);
  const data = await NivelHorarioConfigService.actualizar(input, user);
  return ok(data, 'Jornada escolar actualizada');
});
