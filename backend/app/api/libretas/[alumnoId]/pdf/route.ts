import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { errorResponse } from '@/lib/response';
import { LibretaService } from '@/modules/libretas/libreta.service';
import { buildLibretaPdf } from '@/pdf/libreta.builder';

export function GET(req: NextRequest, { params }: { params: { alumnoId: string } }) {
  return withAuth(req, async (ctx) => {
    try {
      const { searchParams } = new URL(req.url);
      const bimestreId = searchParams.get('bimestreId') ?? undefined;
      const ip        = req.headers.get('x-forwarded-for') ?? req.ip ?? null;
      const userAgent = req.headers.get('user-agent') ?? null;

      const data = await LibretaService.generarBoleta(
        params.alumnoId,
        bimestreId,
        ctx.user,
        ip ?? undefined,
        userAgent ?? undefined,
      );

      const pdfBuffer = await buildLibretaPdf(data);
      const alumnoNombre = data.alumno.nombre || 'alumno';
      const filename = `boleta_${alumnoNombre.replace(/\s+/g, '_')}.pdf`;

      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type':        'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length':      String(pdfBuffer.length),
        },
      });
    } catch (e) {
      return errorResponse(e);
    }
  });
}
