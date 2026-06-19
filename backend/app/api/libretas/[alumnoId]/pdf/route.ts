import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { errorResponse } from '@/lib/response';
import { LibretaService } from '@/modules/libretas/libreta.service';
// La libreta se exporta como Word EDITABLE (.docx) con el formato MINEDU,
// para que el personal complete lo que falte (conclusiones, asistencia, firmas).
import { buildLibretaDocx } from '@/word/libreta.docx.builder';

export function GET(req: NextRequest, { params }: { params: { alumnoId: string } }) {
  return withAuth(req, async (ctx) => {
    try {
      const { searchParams } = new URL(req.url);
      const bimestreId = searchParams.get('bimestreId') ?? undefined;
      const ip        = req.headers.get('x-forwarded-for') ?? req.ip ?? null;
      const userAgent = req.headers.get('user-agent') ?? null;

      const rows = await LibretaService.generarPdf(
        params.alumnoId,
        bimestreId,
        ctx.user,
        ip ?? undefined,
        userAgent ?? undefined,
      );

      const meta = await LibretaService.metaPdf(params.alumnoId);
      const docBuffer = await buildLibretaDocx(rows, meta);
      const alumnoNombre = rows[0]?.alumno_nombre ?? 'alumno';
      const safeName = alumnoNombre.replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ\s]/g, '').replace(/\s+/g, '_');
      const filename = `libreta_${safeName}.docx`;

      return new NextResponse(docBuffer, {
        status: 200,
        headers: {
          'Content-Type':        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length':      String(docBuffer.length),
        },
      });
    } catch (e) {
      return errorResponse(e);
    }
  });
}
