// ============================================================
//  /api/horarios/descansos
//   GET — Recreo/Refrigerio de uno o más niveles (?periodoId&nivelIds=a,b) (autenticado)
//   PUT — upsert de un bloque (nivel+tipo+horas)                          (Admin)
//  Sin flujo de publicación: se sirve siempre en vivo.
// ============================================================
import { withAuth, withRole } from '@/lib/auth';
import { ok } from '@/lib/response';
import { parseBody, parseQuery } from '@/lib/request';
import { DescansosQuery, UpsertDescansoSchema } from '@/modules/horarios/horario-descanso.schema';
import { HorarioDescansoService } from '@/modules/horarios/horario-descanso.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (req) => {
  const { periodoId, nivelIds } = parseQuery(req, DescansosQuery);
  const data = await HorarioDescansoService.listarPorNiveles(nivelIds, periodoId);
  return ok(data, 'Recreo y Refrigerio');
});

export const PUT = withRole(['Admin'], async (req, { user }) => {
  const input = await parseBody(req, UpsertDescansoSchema);
  const data = await HorarioDescansoService.upsert(input, user);
  return ok(data, 'Recreo/Refrigerio actualizado');
});
