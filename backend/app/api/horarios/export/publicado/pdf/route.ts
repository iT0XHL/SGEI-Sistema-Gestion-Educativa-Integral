// ============================================================
//  GET /api/horarios/export/publicado/pdf?tipo=docente|alumno&id&periodoId
//  Exporta a PDF el horario ya PUBLICADO (nunca el borrador) — es el
//  export que usan Docente y Alumno desde su propio portal para
//  descargar "Mi Horario". Admin también puede usarlo para un tercero.
//  El control de acceso (self-only vs. Admin) vive en
//  HorarioPublicacionService.horarioPublicadoDe{Docente,Alumno}, igual
//  que en GET /api/docentes/:id/horario y /api/alumnos/:id/horario.
// ============================================================
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { errorResponse } from '@/lib/response';
import { parseQuery } from '@/lib/request';
import { NotFoundError } from '@/errors/http-errors';
import { HorarioExportPublicadoQuery } from '@/modules/horarios/horario-publicacion.schema';
import { HorarioPublicacionService } from '@/modules/horarios/horario-publicacion.service';
import { PeriodoService } from '@/modules/periodo/periodo.service';
import { BusinessRuleError } from '@/errors/http-errors';
import { prisma } from '@/lib/prisma';
import { buildHorarioDocentePdf, buildHorarioSeccionPdf } from '@/pdf/horario.builder';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (req, { user }) => {
  try {
    const { periodoId: periodoIdInput, tipo, id } = parseQuery(req, HorarioExportPublicadoQuery);

    let periodoId = periodoIdInput;
    if (!periodoId) {
      const { periodo } = await PeriodoService.getActivo();
      if (!periodo) throw new BusinessRuleError('SIN_PERIODO_ACTIVO', 'No hay un período académico activo configurado.');
      periodoId = periodo.id;
    }

    let pdfBuffer: Buffer;
    let filename: string;

    if (tipo === 'docente') {
      const data = await HorarioPublicacionService.horarioPublicadoDeDocente(id, periodoId, user);
      const docente = await prisma.docente.findUnique({ where: { id }, select: { nombres: true, apellido_paterno: true } });
      if (!docente) throw new NotFoundError('Docente');
      const nombre = `${docente.nombres} ${docente.apellido_paterno}`;
      pdfBuffer = await buildHorarioDocentePdf(data.bloques, nombre, data.descansos);
      filename = `horario_${nombre.replace(/\s+/g, '_')}.pdf`;
    } else {
      const data = await HorarioPublicacionService.horarioPublicadoDeAlumno(id, periodoId, user);
      const alumno = await prisma.alumno.findUnique({
        where: { id },
        select: { seccion: { select: { nombre: true, grado: { select: { nombre: true, nivel: { select: { nombre: true } } } } } } },
      });
      if (!alumno) throw new NotFoundError('Alumno');
      const nombre = `${alumno.seccion.grado.nombre} "${alumno.seccion.nombre}" — ${alumno.seccion.grado.nivel.nombre}`;
      pdfBuffer = await buildHorarioSeccionPdf(data.bloques, nombre, data.descansos);
      filename = `horario_${alumno.seccion.grado.nombre}_${alumno.seccion.nombre}.pdf`.replace(/\s+/g, '_');
    }

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.length),
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
});
