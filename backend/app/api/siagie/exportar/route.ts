import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { SiagieService } from '@/modules/siagie/siagie.service';
import { buildSiagieExcel } from '@/excel/siagie.builder';
import { errorResponse } from '@/lib/response';
import { getClientIp, getUserAgent } from '@/lib/request';

export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const periodoId = req.nextUrl.searchParams.get('periodoId') ?? undefined;
    const { detalle, notasFinales } = await SiagieService.exportar(
      periodoId, user, getClientIp(req), getUserAgent(req),
    );

    if (detalle.length === 0 && notasFinales.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code:    'NO_DATA',
            message: 'No hay notas registradas en la base de datos para este período. Los docentes deben ingresar notas primero desde "Ingreso de Notas".',
          },
        },
        { status: 404 },
      );
    }

    const buffer   = await buildSiagieExcel({ detalle, notasFinales });
    const anio     = notasFinales[0]?.anio_escolar ?? detalle[0]?.anio_escolar ?? new Date().getFullYear();
    const filename = `Acta_Consolidada_SIAGIE_${anio}.xlsx`;

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
