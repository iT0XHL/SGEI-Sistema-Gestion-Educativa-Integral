// ============================================================
//  PATCH /api/simulacros/:id/estado — Activar (Admin/Docente) / concluir (Admin).
//  Solo puede haber un simulacro Activo por período.
// ============================================================
import { withRole } from '@/lib/auth';
import { ForbiddenError } from '@/errors/http-errors';
import { ok } from '@/lib/response';
import { parseBody } from '@/lib/request';
import { CambiarEstadoSchema } from '@/schemas/simulacro.schema';
import { SimulacroService } from '@/modules/simulacros/simulacro.service';

export const dynamic = 'force-dynamic';

export const PATCH = withRole(['Admin', 'Docente'], async (req, { params, user }) => {
  const { estado } = await parseBody(req, CambiarEstadoSchema);
  if (user.rol === 'Docente' && estado !== 'Activo') {
    throw new ForbiddenError('FORBIDDEN', 'Solo el administrador puede concluir el simulacro.');
  }
  const sim = await SimulacroService.cambiarEstado(params.id, estado);
  return ok(sim, `Simulacro ${estado === 'Activo' ? 'activado' : estado === 'Concluido' ? 'concluido' : 'actualizado'}`);
});
