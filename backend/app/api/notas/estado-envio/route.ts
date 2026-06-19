import { type NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth';
import { ok, errorResponse } from '@/lib/response';
import { z } from 'zod';
import { parseQuery } from '@/lib/request';
import { prisma } from '@/lib/prisma';

const EstadoEnvioQuery = z.object({
  docenteId: z.string().uuid().optional(),
  bimestreId: z.string().uuid().optional(),
  seccionId: z.string().uuid().optional(),
});

export const GET = withAuth(async (req, ctx) => {
  try {
    const query = parseQuery(req, EstadoEnvioQuery);

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (query.docenteId) {
      conditions.push(`n.docente_id = $${idx}::uuid`);
      params.push(query.docenteId);
      idx++;
    }
    if (query.bimestreId) {
      conditions.push(`n.bimestre_id = $${idx}::uuid`);
      params.push(query.bimestreId);
      idx++;
    }
    if (query.seccionId) {
      conditions.push(`a.seccion_id = $${idx}::uuid`);
      params.push(query.seccionId);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await prisma.$queryRawUnsafe<{
      docente_id: string;
      bimestre_id: string;
      total: number;
      cerradas: number;
    }[]>(`
      SELECT
        n.docente_id,
        n.bimestre_id,
        COUNT(*)::integer AS total,
        COUNT(*) FILTER (WHERE n.cerrada = true)::integer AS cerradas
      FROM academic_schema.nota n
      JOIN academic_schema.alumno a ON a.id = n.alumno_id
      ${whereClause}
      GROUP BY n.docente_id, n.bimestre_id
    `, ...params);

    return ok(rows, 'Estado de envío obtenido.');
  } catch (e) {
    return errorResponse(e);
  }
});
