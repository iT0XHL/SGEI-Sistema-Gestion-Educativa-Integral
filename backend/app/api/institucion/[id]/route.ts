// ============================================================
//  PUT /api/institucion/:id — Actualiza la institución (Admin).
// ============================================================
import { withRole } from '@/lib/auth';
import { ok } from '@/lib/response';
import { parseBody } from '@/lib/request';
import { UpdateInstitucionSchema } from '@/schemas/academic.schema';
import { InstitucionService } from '@/modules/academic/estructura.service';

export const dynamic = 'force-dynamic';

export const PUT = withRole(['Admin'], async (req, { params }) => {
  const input = await parseBody(req, UpdateInstitucionSchema);
  const ie = await InstitucionService.update(params.id, input);
  return ok(ie, 'Institución actualizada');
});
