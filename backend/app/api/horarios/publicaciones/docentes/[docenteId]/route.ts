// ============================================================
//  /api/horarios/publicaciones/docentes/:docenteId
//   POST   — publica ("Mostrar a Docente") el horario vivo actual (Admin)
//   DELETE — despublica (oculta de nuevo al docente)              (Admin)
// ============================================================
import { withRole } from '@/lib/auth';
import { ok, created } from '@/lib/response';
import { parseBody } from '@/lib/request';
import { PublicarHorarioSchema } from '@/modules/horarios/horario-publicacion.schema';
import { HorarioPublicacionService } from '@/modules/horarios/horario-publicacion.service';

export const dynamic = 'force-dynamic';

export const POST = withRole(['Admin'], async (req, { user, params }) => {
  const { periodo_id } = await parseBody(req, PublicarHorarioSchema);
  const data = await HorarioPublicacionService.publicarParaDocente(params.docenteId, periodo_id, user);
  return created(data, 'Horario publicado al docente');
});

export const DELETE = withRole(['Admin'], async (req, { user, params }) => {
  const { searchParams } = new URL(req.url);
  const periodoId = searchParams.get('periodoId') ?? undefined;
  const data = await HorarioPublicacionService.despublicarDocente(params.docenteId, periodoId, user);
  return ok(data, 'Horario despublicado del docente');
});
