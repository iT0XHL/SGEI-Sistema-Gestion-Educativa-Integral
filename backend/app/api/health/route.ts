// ============================================================
//  GET /api/health — Health check del backend.
//  Verifica que el servicio responde y que la conexión a la
//  base de datos PostgreSQL está operativa.
//  Usado por Railway como health check de despliegue.
// ============================================================
import { prisma } from '@/lib/prisma';
import { ok, okCached, errorResponse } from '@/lib/response';
import { AppError } from '@/errors/http-errors';

// Health check siempre dinámico: nunca cachear.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let database: 'up' | 'down' = 'down';
    try {
      await prisma.$queryRaw`SELECT 1`;
      database = 'up';
    } catch (dbError) {
      console.error('[SGEI health] DB no disponible:', dbError);
    }

    const payload = {
      status: 'ok' as const,
      service: 'sgei-backend',
      database,
      timestamp: new Date().toISOString(),
    };

    if (database === 'down') {
      throw new AppError(
        'DB_UNAVAILABLE',
        'El servicio responde pero la base de datos no está disponible',
        503,
        payload,
      );
    }

    return okCached(payload, 'Servicio operativo');
  } catch (error) {
    return errorResponse(error);
  }
}
