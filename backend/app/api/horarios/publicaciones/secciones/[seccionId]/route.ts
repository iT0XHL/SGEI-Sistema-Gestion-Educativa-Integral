// ============================================================
//  /api/horarios/publicaciones/secciones/:seccionId
//   POST   — publica ("Mostrar a Alumnos") el horario vivo actual (Admin)
//   DELETE — despublica (oculta de nuevo a los alumnos)            (Admin)
// ============================================================
import { withRole } from '@/lib/auth';
import { ok, created } from '@/lib/response';
import { parseBody } from '@/lib/request';
import { PublicarHorarioSchema } from '@/modules/horarios/horario-publicacion.schema';
import { HorarioPublicacionService } from '@/modules/horarios/horario-publicacion.service';

export const dynamic = 'force-dynamic';

export const POST = withRole(['Admin'], async (req, { user, params }) => {
  const { periodo_id } = await parseBody(req, PublicarHorarioSchema);
  const data = await HorarioPublicacionService.publicarParaSeccion(params.seccionId, periodo_id, user);
  return created(data, 'Horario publicado a la sección');
});

export const DELETE = withRole(['Admin'], async (req, { user, params }) => {
  const { searchParams } = new URL(req.url);
  const periodoId = searchParams.get('periodoId') ?? undefined;
  const data = await HorarioPublicacionService.despublicarSeccion(params.seccionId, periodoId, user);
  return ok(data, 'Horario despublicado de la sección');
});
