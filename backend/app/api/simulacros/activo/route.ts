// ============================================================
//  GET /api/simulacros/activo — Simulacro activo (cualquier rol).
//  Devuelve null si no hay ninguno → la UI muestra "Sin simulacros activos".
// ============================================================
import { withAuth } from '@/lib/auth';
import { okCached } from '@/lib/response';
import { SimulacroService } from '@/modules/simulacros/simulacro.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async () => {
  const sim = await SimulacroService.getActivo();
  return okCached(sim, sim ? 'Simulacro activo' : 'Sin simulacros activos');
});
