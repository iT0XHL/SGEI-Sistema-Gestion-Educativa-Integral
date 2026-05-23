import { withRole } from '@/lib/auth';
import { SiagieService } from '@/modules/siagie/siagie.service';
import { ok, errorResponse } from '@/lib/response';

export const POST = withRole(['Admin', 'Secretaria'], async (_req, { user }) => {
  try {
    const data = await SiagieService.refresh(user);
    return ok(data);
  } catch (e) {
    return errorResponse(e);
  }
});
