import { type NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth';
import { parseBody } from '@/lib/request';
import { ok, errorResponse } from '@/lib/response';
import { GenerarLoteSchema } from '@/modules/libretas/libreta.schema';
import { LibretaService } from '@/modules/libretas/libreta.service';
import { LibretaRepository } from '@/modules/libretas/libreta.repository';

export function POST(req: NextRequest) {
  return withAuth(req, async (ctx) => {
    try {
      const body = await parseBody(req, GenerarLoteSchema);
      const alumnos = await LibretaRepository.resumenSeccion(body.seccionId, body.bimestreId);
      const results: { alumno_id: string; exito: boolean; error?: string }[] = [];

      for (const alumno of alumnos) {
        try {
          await LibretaService.generar(alumno.alumno_id, body.bimestreId, ctx.user);
          results.push({ alumno_id: alumno.alumno_id, exito: true });
        } catch (err) {
          results.push({
            alumno_id: alumno.alumno_id,
            exito: false,
            error: err instanceof Error ? err.message : 'Error al generar',
          });
        }
      }

      return ok(results, `${results.filter(r => r.exito).length} libreta(s) generada(s).`);
    } catch (e) {
      return errorResponse(e);
    }
  });
}
