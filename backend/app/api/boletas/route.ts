import { type NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth';
import { parseQuery } from '@/lib/request';
import { ok, created, errorResponse } from '@/lib/response';
import { BoletaService } from '@/modules/boletas/boleta.service';
import { SubirBoletaSchema, ListarBoletasQuery } from '@/modules/boletas/boleta.schema';
import { ValidationError } from '@/errors/http-errors';

export function GET(req: NextRequest) {
  return withAuth(req, async (ctx) => {
    try {
      const query   = await parseQuery(req, ListarBoletasQuery);
      const boletas = await BoletaService.listar(query, ctx.user);
      return ok(boletas, 'Boletas obtenidas.');
    } catch (e) {
      return errorResponse(e);
    }
  });
}

export function POST(req: NextRequest) {
  return withAuth(req, async (ctx) => {
    try {
      const formData = await req.formData();
      const archivo  = formData.get('archivo');
      if (!(archivo instanceof File)) {
        throw new ValidationError([{ path: ['archivo'], message: 'Se requiere un archivo.' }]);
      }

      const rawFields = {
        pago_id:          formData.get('pago_id'),
        banco:            formData.get('banco')            ?? undefined,
        numero_operacion: formData.get('numero_operacion') ?? undefined,
      };

      const parsed = SubirBoletaSchema.safeParse(rawFields);
      if (!parsed.success) {
        throw new ValidationError(
          parsed.error.errors.map((e) => ({ path: e.path.map(String), message: e.message })),
        );
      }

      const boleta = await BoletaService.subir(parsed.data, archivo, ctx.user);
      return created(boleta, 'Boleta de pago subida.');
    } catch (e) {
      return errorResponse(e);
    }
  });
}
