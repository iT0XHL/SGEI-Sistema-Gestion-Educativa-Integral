// ============================================================
//  POST /api/auth/forgot-password — Solicita el envío de un
//  enlace de recuperación de contraseña. Siempre responde éxito
//  (no revela si el correo existe) y aplica rate limiting.
// ============================================================
import { NextRequest } from 'next/server';
import { ok, errorResponse } from '@/lib/response';
import { parseBody } from '@/lib/request';
import { ForgotPasswordSchema } from '@/schemas/auth.schema';
import { AuthService } from '@/modules/auth/auth.service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const input = await parseBody(req, ForgotPasswordSchema);
    await AuthService.forgotPassword(input);
    return ok({ enviado: true }, 'Si el correo existe, se envió un enlace de recuperación.');
  } catch (error) {
    return errorResponse(error);
  }
}
