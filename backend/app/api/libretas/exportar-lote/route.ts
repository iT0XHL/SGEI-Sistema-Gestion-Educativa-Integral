import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { parseQuery } from '@/lib/request';
import { getClientIp, getUserAgent } from '@/lib/request';
import { errorResponse } from '@/lib/response';
import { ForbiddenError } from '@/errors/http-errors';
import { LibretaRepository } from '@/modules/libretas/libreta.repository';
import { AuditService } from '@/modules/auditoria/audit.service';
import { ExportarLoteQuery } from '@/modules/libretas/libreta.schema';
// El lote exporta libretas Word EDITABLES (.docx) comprimidas en un ZIP.
import { buildLibretaDocx } from '@/word/libreta.docx.builder';

export function GET(req: NextRequest) {
  return withAuth(req, async (ctx) => {
    try {
      if (ctx.user.rol !== 'Admin' && ctx.user.rol !== 'Secretaria') {
        throw new ForbiddenError('INSUFFICIENT_ROLE', 'Solo Admin/Secretaria pueden exportar libretas en lote.');
      }

      const query = parseQuery(req, ExportarLoteQuery);
      const { seccionId, bimestreId } = query;

      const alumnos = await LibretaRepository.resumenSeccion(seccionId, bimestreId);
      if (alumnos.length === 0) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: 'No hay alumnos en esta sección.' } },
          { status: 404 },
        );
      }

      const pdfBuffers: { nombre: string; buffer: Buffer }[] = [];

      for (const alumno of alumnos) {
        try {
          // §24: la descarga interna de secretaría/admin se permite aun con deuda
          // del alumno (queda auditada); no se omiten los bloqueados en el lote.
          const data = await LibretaRepository.boletaData(alumno.alumno_id);
          if (data.areas.length === 0) continue;
          const docBuffer = await buildLibretaDocx(data);
          const nombre = `${alumno.alumno_nombre.replace(/\s+/g, '_')}.docx`;
          pdfBuffers.push({ nombre, buffer: docBuffer });

          // Solo auditoría por cada descarga (§22); sin notificación masiva
          // a los alumnos para evitar spam en la exportación por sección.
          await AuditService.log({
            usuarioId:       ctx.user.perfilId,
            tipo:            'READ_SENSITIVE',
            modulo:          'libretas',
            entidadAfectada: 'mv_libreta_alumno',
            entidadId:       alumno.alumno_id,
            ip:              getClientIp(req),
            userAgent:       getUserAgent(req),
          });
        } catch (err) {
          console.error(`[exportar-lote] Error generando PDF para ${alumno.alumno_id}:`, err);
          continue;
        }
      }

      if (pdfBuffers.length === 0) {
        return NextResponse.json(
          { success: false, error: { code: 'NO_DATA', message: 'No se pudieron generar libretas.' } },
          { status: 422 },
        );
      }

      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      pdfBuffers.forEach(({ nombre, buffer }) => {
        zip.file(nombre, buffer);
      });

      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
      const filename = `libretas_${seccionId.slice(0, 8)}_Bimestre${bimestreId.slice(0, 8)}.zip`;

      return new NextResponse(zipBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    } catch (e) {
      return errorResponse(e);
    }
  });
}
