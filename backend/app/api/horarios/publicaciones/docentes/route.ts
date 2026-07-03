// ============================================================
//  GET /api/horarios/publicaciones/docentes
//   Listado paginado de docentes con su estado de publicación
//   de horario en el período (?periodoId&page&limit).   (Admin)
// ============================================================
import { withRole } from '@/lib/auth';
import { ok } from '@/lib/response';
import { parseQuery } from '@/lib/request';
import { HorarioPublicacionesQuery } from '@/modules/horarios/horario-publicacion.schema';
import { HorarioPublicacionService } from '@/modules/horarios/horario-publicacion.service';

export const dynamic = 'force-dynamic';

export const GET = withRole(['Admin'], async (req, { user }) => {
  const { periodoId, page, limit } = parseQuery(req, HorarioPublicacionesQuery);
  const data = await HorarioPublicacionService.listarPorDocente({ periodoId, page, limit }, user);
  return ok(data, 'Estado de publicación por docente');
});
