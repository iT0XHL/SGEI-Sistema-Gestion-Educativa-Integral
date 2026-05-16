// ============================================================
//  GET /api/institucion — Datos de la institución educativa activa.
// ============================================================
import { withAuth } from '@/lib/auth';
import { ok } from '@/lib/response';
import { InstitucionService } from '@/modules/academic/estructura.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async () => {
  const ie = await InstitucionService.get();
  return ok(ie, 'Institución educativa');
});
