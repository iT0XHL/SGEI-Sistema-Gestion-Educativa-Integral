// ============================================================
//  GET /api/periodos/activo
//   Período + bimestre activos (configuración GLOBAL).
//   Accesible por cualquier rol autenticado — el período activo
//   no depende del rol de la sesión (corrige que solo Admin/Secretaria
//   pudieran leerlo). Lo usan el AppShell y el módulo de Simulacros.
// ============================================================
import { withAuth } from '@/lib/auth';
import { okCached } from '@/lib/response';
import { PeriodoService } from '@/modules/periodo/periodo.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async () => {
  const data = await PeriodoService.getActivo();
  return okCached(data, 'Período y bimestre activos');
});
