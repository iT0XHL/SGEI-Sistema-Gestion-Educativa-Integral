import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth';
import { parseBody, parseQuery } from '@/lib/request';
import { ok, created, errorResponse } from '@/lib/response';
import { SfaService } from '@/modules/situacion-final/sfa.service';
import { UpsertSfaSchema, ListarSfaQuery } from '@/modules/situacion-final/sfa.schema';

export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const filters = parseQuery(req, ListarSfaQuery);
    const data    = await SfaService.listar(filters, user);
    return ok(data, 'Situaciones finales obtenidas.');
  } catch (e) {
    return errorResponse(e);
  }
});

export const POST = withAuth(async (req: NextRequest, { user }) => {
  try {
    const input = await parseBody(req, UpsertSfaSchema);
    const data  = await SfaService.upsert(input, user);
    return created(data, 'Situación final registrada.');
  } catch (e) {
    return errorResponse(e);
  }
});
