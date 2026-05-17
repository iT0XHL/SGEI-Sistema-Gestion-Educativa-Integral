import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { SiagieService } from '@/modules/siagie/siagie.service';
import { buildSiagieExcel } from '@/excel/siagie.builder';
import { errorResponse } from '@/lib/response';
import { getClientIp, getUserAgent } from '@/lib/request';

export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const periodoId = req.nextUrl.searchParams.get('periodoId') ?? undefined;
    const rows      = await SiagieService.exportar(periodoId, user, getClientIp(req), getUserAgent(req));

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_DATA', message: 'No hay registros en el período seleccionado.' } },
        { status: 404 },
      );
    }

    const buffer   = await buildSiagieExcel(rows);
    const anio     = rows[0]?.anio_escolar ?? new Date().getFullYear();
    const filename = `SIAGIE_${anio}${periodoId ? '_' + periodoId.slice(0, 8) : ''}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length':      String(buffer.length),
        'Cache-Control':       'no-store',
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
});
