// ============================================================
//  /api/escala-calificaciones
//   GET — escala literal de un período (?periodoId)  (autenticado)
//   PUT — crea/actualiza las 4 escalas AD/A/B/C        (Admin)
// ============================================================
import { z } from 'zod';
import { withAuth, withRole } from '@/lib/auth';
import { ok } from '@/lib/response';
import { parseBody, parseQuery } from '@/lib/request';
import { UpsertEscalaSchema } from '@/schemas/academic.schema';
import { EscalaService } from '@/modules/academic/periodo.service';

export const dynamic = 'force-dynamic';

const Query = z.object({ periodoId: z.string().uuid('periodoId es obligatorio') });

export const GET = withAuth(async (req) => {
  const { periodoId } = parseQuery(req, Query);
  const data = await EscalaService.list(periodoId);
  return ok(data, 'Escala de calificaciones');
});

export const PUT = withRole(['Admin'], async (req) => {
  const input = await parseBody(req, UpsertEscalaSchema);
  const data = await EscalaService.upsert(input);
  return ok(data, 'Escala de calificaciones guardada');
});
