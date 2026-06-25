// ============================================================
//  PATCH /api/simulacros/:id/estado — Activar / concluir (Admin).
//  Solo puede haber un simulacro Activo por período.
// ============================================================
import { withRole } from '@/lib/auth';
import { ok } from '@/lib/response';
import { parseBody } from '@/lib/request';
import { CambiarEstadoSchema } from '@/schemas/simulacro.schema';
import { SimulacroService } from '@/modules/simulacros/simulacro.service';

export const dynamic = 'force-dynamic';

export const PATCH = withRole(['Admin'], async (req, { params }) => {
  const { estado } = await parseBody(req, CambiarEstadoSchema);
  const sim = await SimulacroService.cambiarEstado(params.id, estado);
  return ok(sim, `Simulacro ${estado === 'Activo' ? 'activado' : estado === 'Concluido' ? 'concluido' : 'actualizado'}`);
});
