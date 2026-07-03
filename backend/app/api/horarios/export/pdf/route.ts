// ============================================================
//  GET /api/horarios/export/pdf?tipo=docente|seccion|completo|docentes|secciones&id&periodoId
//   Exporta a PDF los bloques de horario VIVOS/borrador (no el
//   snapshot publicado) — utilidad de impresión para el Admin sobre
//   lo que está trabajando, independiente del estado de publicación.
//   "docentes"/"secciones" (plural) son un export masivo: un único PDF
//   con una hoja por cada docente/sección del período — opción
//   secundaria para imprimir todos los horarios de una vez.
//                                                            (Admin)
// ============================================================
import { NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import { errorResponse } from '@/lib/response';
import { parseQuery } from '@/lib/request';
import { NotFoundError, BusinessRuleError } from '@/errors/http-errors';
import { HorarioExportQuery } from '@/modules/horarios/horario-publicacion.schema';
import { HorarioService } from '@/modules/academic/asignacion.service';
import { PeriodoService } from '@/modules/periodo/periodo.service';
import { prisma } from '@/lib/prisma';
import { HorarioDescansoRepository } from '@/modules/horarios/horario-descanso.repository';
import {
  buildHorarioDocentePdf, buildHorarioSeccionPdf, buildHorarioCompletoPdf, buildHorarioMultiplePdf,
  type HorarioPdfEntrada,
} from '@/pdf/horario.builder';

export const dynamic = 'force-dynamic';

export const GET = withRole(['Admin'], async (req) => {
  try {
    const { periodoId: periodoIdInput, tipo, id } = parseQuery(req, HorarioExportQuery);

    let periodoId = periodoIdInput;
    if (!periodoId) {
      const { periodo } = await PeriodoService.getActivo();
      if (!periodo) throw new BusinessRuleError('SIN_PERIODO_ACTIVO', 'No hay un período académico activo configurado.');
      periodoId = periodo.id;
    }

    let pdfBuffer: Buffer;
    let filename: string;

    if (tipo === 'docente') {
      const docente = await prisma.docente.findUnique({ where: { id }, select: { nombres: true, apellido_paterno: true } });
      if (!docente) throw new NotFoundError('Docente');
      const nombre = `${docente.nombres} ${docente.apellido_paterno}`;
      const rows = await HorarioService.list({ periodoId, docenteId: id });

      const asignaciones = await prisma.asignacionDocente.findMany({
        where: { docente_id: id, periodo_id: periodoId, activo: true },
        select: { seccion: { select: { grado: { select: { nivel_id: true } } } } },
      });
      const nivelIds = [...new Set(asignaciones.map((a) => a.seccion.grado.nivel_id))];
      const descansos = nivelIds.length ? await HorarioDescansoRepository.listarPorNiveles(nivelIds, periodoId) : [];

      pdfBuffer = await buildHorarioDocentePdf(rows, nombre, descansos);
      filename = `horario_${nombre.replace(/\s+/g, '_')}.pdf`;
    } else if (tipo === 'seccion') {
      const seccion = await prisma.seccion.findUnique({
        where: { id },
        select: { nombre: true, grado: { select: { nombre: true, nivel_id: true, nivel: { select: { nombre: true } } } } },
      });
      if (!seccion) throw new NotFoundError('Sección');
      const nombre = `${seccion.grado.nombre} "${seccion.nombre}" — ${seccion.grado.nivel.nombre}`;
      const rows = await HorarioService.list({ periodoId, seccionId: id });
      const descansos = await HorarioDescansoRepository.listarPorNiveles([seccion.grado.nivel_id], periodoId);

      pdfBuffer = await buildHorarioSeccionPdf(rows, nombre, descansos);
      filename = `horario_${seccion.grado.nombre}_${seccion.nombre}.pdf`.replace(/\s+/g, '_');
    } else if (tipo === 'docentes') {
      const docentes = await prisma.docente.findMany({
        where: { asignaciones: { some: { periodo_id: periodoId, activo: true } } },
        select: { id: true, nombres: true, apellido_paterno: true },
        orderBy: [{ apellido_paterno: 'asc' }, { nombres: 'asc' }],
      });

      const entradas: HorarioPdfEntrada[] = [];
      for (const d of docentes) {
        const rows = await HorarioService.list({ periodoId, docenteId: d.id });
        const asignaciones = await prisma.asignacionDocente.findMany({
          where: { docente_id: d.id, periodo_id: periodoId, activo: true },
          select: { seccion: { select: { grado: { select: { nivel_id: true } } } } },
        });
        const nivelIds = [...new Set(asignaciones.map((a) => a.seccion.grado.nivel_id))];
        const descansos = nivelIds.length ? await HorarioDescansoRepository.listarPorNiveles(nivelIds, periodoId) : [];
        entradas.push({
          titulo: 'Horario del Docente',
          subtitulo: `${d.nombres} ${d.apellido_paterno}`,
          bloques: rows,
          descansos,
          variante: 'docente',
        });
      }

      pdfBuffer = await buildHorarioMultiplePdf(entradas);
      filename = 'horarios_docentes.pdf';
    } else if (tipo === 'secciones') {
      const secciones = await prisma.seccion.findMany({
        where: { periodo_id: periodoId },
        select: { id: true, nombre: true, grado: { select: { nombre: true, nivel_id: true, nivel: { select: { nombre: true } }, orden: true } } },
        orderBy: [{ grado: { orden: 'asc' } }, { nombre: 'asc' }],
      });

      const entradas: HorarioPdfEntrada[] = [];
      for (const s of secciones) {
        const rows = await HorarioService.list({ periodoId, seccionId: s.id });
        const descansos = await HorarioDescansoRepository.listarPorNiveles([s.grado.nivel_id], periodoId);
        entradas.push({
          titulo: 'Horario de Sección',
          subtitulo: `${s.grado.nombre} "${s.nombre}" — ${s.grado.nivel.nombre}`,
          bloques: rows,
          descansos,
          variante: 'seccion',
        });
      }

      pdfBuffer = await buildHorarioMultiplePdf(entradas);
      filename = 'horarios_secciones.pdf';
    } else {
      const periodo = await prisma.periodoAcademico.findUnique({ where: { id: periodoId }, select: { nombre: true, anio: true } });
      const nombre = periodo ? `${periodo.nombre} ${periodo.anio}` : '';
      const rows = await HorarioService.list({ periodoId });
      pdfBuffer = await buildHorarioCompletoPdf(rows, nombre);
      filename = `horario_general_${periodo?.anio ?? ''}.pdf`;
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
