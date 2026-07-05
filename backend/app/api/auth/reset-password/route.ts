// ============================================================
//  POST /api/auth/reset-password — Consume el token de
//  recuperación y establece la nueva contraseña.
// ============================================================
import { NextRequest } from 'next/server';
import { ok, errorResponse } from '@/lib/response';
import { parseBody } from '@/lib/request';
import { ResetPasswordSchema } from '@/schemas/auth.schema';
import { AuthService } from '@/modules/auth/auth.service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const input = await parseBody(req, ResetPasswordSchema);
    await AuthService.resetPassword(input);
    return ok({ actualizada: true }, 'Contraseña actualizada. Ya puedes iniciar sesión.');
  } catch (error) {
    return errorResponse(error);
  }
}
