// ============================================================
//  GET /api/horarios/publicaciones/secciones
//   Listado paginado de secciones (Grado+Sección+Nivel) con su
//   estado de publicación de horario en el período
//   (?periodoId&page&limit).                              (Admin)
// ============================================================
import { withRole } from '@/lib/auth';
import { ok } from '@/lib/response';
import { parseQuery } from '@/lib/request';
import { HorarioPublicacionesQuery } from '@/modules/horarios/horario-publicacion.schema';
import { HorarioPublicacionService } from '@/modules/horarios/horario-publicacion.service';

export const dynamic = 'force-dynamic';

export const GET = withRole(['Admin'], async (req, { user }) => {
  const { periodoId, page, limit } = parseQuery(req, HorarioPublicacionesQuery);
  const data = await HorarioPublicacionService.listarPorSeccion({ periodoId, page, limit }, user);
  return ok(data, 'Estado de publicación por sección');
});
