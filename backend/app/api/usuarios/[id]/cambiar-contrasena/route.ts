// ============================================================
//  /api/usuarios/:id/cambiar-contrasena
//  POST — usuario cambia su propia contraseña
// ============================================================
import { type NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth';
import { ok, errorResponse } from '@/lib/response';
import { parseBody } from '@/lib/request';
import { revokeUserTokens } from '@/lib/token-blacklist';
import { ChangePasswordSchema } from '@/schemas/usuarios.schema';
import { UsersService } from '@/modules/users/users.service';
import { ForbiddenError } from '@/errors/http-errors';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(req, async (ctx) => {
    try {
      // Solo puede cambiar su propia contraseña
      if (ctx.user.perfilId !== params.id) {
        return errorResponse(new ForbiddenError('FORBIDDEN', 'No tienes permisos para cambiar esta contraseña'));
      }

      const input = await parseBody(req, ChangePasswordSchema);
      await UsersService.changePassword(params.id, input);
      revokeUserTokens(params.id);
      return ok(null, 'Contraseña actualizada correctamente');
    } catch (e) {
      return errorResponse(e);
    }
  });
}
