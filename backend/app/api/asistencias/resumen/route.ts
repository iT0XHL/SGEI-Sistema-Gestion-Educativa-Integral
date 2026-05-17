// ============================================================
//  /api/asistencias/resumen?seccionId=
//   GET — resumen desde la vista v_resumen_asistencia (Docente, Admin)
// ============================================================
import { withAuth } from '@/lib/auth';
import { ok, errorResponse } from '@/lib/response';
import { z } from 'zod';
import { parseQuery } from '@/lib/request';
import { AsistenciaAlumnosService } from '@/modules/asistencias/asistencia-alumnos.service';

export const dynamic = 'force-dynamic';

const ResumenQuery = z.object({
  seccionId: z.string().uuid('seccionId debe ser UUID'),
});

export const GET = withAuth(async (req, { user }) => {
  try {
    const { seccionId } = parseQuery(req, ResumenQuery);
    const data = await AsistenciaAlumnosService.resumen(seccionId, user);
    return ok(data, 'Resumen de asistencia');
  } catch (error) {
    return errorResponse(error);
  }
});
