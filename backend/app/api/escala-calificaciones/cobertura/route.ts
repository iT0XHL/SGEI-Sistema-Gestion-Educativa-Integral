// ============================================================
//  GET /api/escala-calificaciones/cobertura?periodoId=...
//  Verifica que la escala cubra 0–20 sin huecos ni superposiciones.
// ============================================================
import { z } from 'zod';
import { withAuth } from '@/lib/auth';
import { ok, okCached } from '@/lib/response';
import { parseQuery } from '@/lib/request';
import { EscalaService } from '@/modules/academic/periodo.service';

export const dynamic = 'force-dynamic';

const Query = z.object({ periodoId: z.string().uuid('periodoId es obligatorio') });

export const GET = withAuth(async (req) => {
  const { periodoId } = parseQuery(req, Query);
  const data = await EscalaService.cobertura(periodoId);
  return okCached(data, 'Cobertura de la escala');
});
