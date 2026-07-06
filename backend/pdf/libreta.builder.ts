// ============================================================
//  pdf/libreta.builder.ts
//  Genera la "BOLETA DE NOTAS" en PDF (solo lectura) para el alumno,
//  con el formato de la IEP Virgen del Carmen - Las Viñas
//  (referencia: resources/LIBRETANUEVA.pdf). Mismo modelo de datos
//  (BoletaData) que el .docx editable de Secretaría.
//
//  Requiere pdfkit. Si no está instalado, el endpoint devuelve 503.
// ============================================================
import type { BoletaData } from '@/modules/libretas/boleta.types';

const CRITERIOS_GENERAL = [
  'Asiste a la I.E. uniformado y aseado.',
  'Cumple con el llenado de agenda diariamente.',
  'Participa en las actividades que se realiza en la I.E.',
  'Respeta y cumple el Reglamento Interno.',
  'ORATORIA',
  'COMPORTAMIENTO',
];
const CRITERIOS_PADRE = [
  'Asistió a reuniones puntualmente organizadas por la Profesora.',
  'Cumple con el horario establecido de la I.E. al ingreso y salida de su hijo (a).',
  'Firma diariamente el cuaderno de control.',
  'Manda correctamente uniformado a la I.E.',
  'Apoya al estudiante en su proceso de aprendizaje.',
  'Respeta el Reglamento Interno de la I.E.',
];
const ROMANOS: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };

export async function buildLibretaPdf(data: BoletaData): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let PDFDocument: any;
  try {
    PDFDocument = (await import('pdfkit')).default;
  } catch {
    throw new Error('pdfkit no está instalado. Ejecuta: pnpm add pdfkit @types/pdfkit --filter backend');
  }

  // Paleta
  const NAVY = '#1F3864', YELLOW = '#FFF200', HEADGRAY = '#D9D9D9', BLUEHDR = '#DDEBF7';
  const GREEN = '#E2EFDA', LABELBLUE = '#DDEBF7', LINE = '#7F7F7F', INK = '#000000', GRAY = '#404040';

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const LEFT = 40;
    const W = doc.page.width - 80;          // usable width ≈ 515
    const RIGHT = LEFT + W;
    const PAGE_BOTTOM = doc.page.height - 50;

    // ── Helper: celda con borde + texto ──────────────────────────
    function box(x: number, y: number, w: number, h: number, text: string, o: {
      align?: 'left' | 'center' | 'right'; fill?: string; bold?: boolean; size?: number; color?: string; wrap?: boolean;
    } = {}) {
      if (o.fill) doc.rect(x, y, w, h).fillColor(o.fill).fill();
      doc.rect(x, y, w, h).strokeColor(LINE).lineWidth(0.5).stroke();
      const size = o.size ?? 8;
      doc.fillColor(o.color ?? INK).font(o.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size);
      if (o.wrap) {
        doc.text(text, x + 3, y + 3, { width: w - 6, align: o.align ?? 'left' });
      } else {
        doc.text(text, x + 3, y + (h - size) / 2 - 1, { width: w - 6, align: o.align ?? 'left', lineBreak: false, ellipsis: true });
      }
    }
    const gv = (v: string | null | undefined) => v ?? '';

    // ── Encabezado institucional ─────────────────────────────────
    const nombreLimpio = data.institucion.nombre.replace(/^IEP\s+/i, '').trim();
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(11)
       .text('INSTITUCIÓN EDUCATIVA PARTICULAR', LEFT, 42, { width: W, align: 'center' });
    doc.fontSize(16).text(`"${nombreLimpio.toUpperCase()}"`, LEFT, doc.y, { width: W, align: 'center' });
    doc.fillColor(GRAY).font('Helvetica').fontSize(9)
       .text(data.institucion.niveles_texto, LEFT, doc.y + 1, { width: W, align: 'center' });

    // Barra amarilla
    let y = doc.y + 6;
    box(LEFT, y, W, 22, `BOLETA DE NOTAS - ${data.anio}`, { align: 'center', fill: YELLOW, bold: true, size: 15 });
    y += 22 + 8;

    // ── Datos del estudiante ─────────────────────────────────────
    const lblW = Math.round(W * 0.22), midLbl = Math.round(W * 0.15);
    box(LEFT, y, lblW, 16, 'APELLIDOS Y NOMBRES:', { fill: LABELBLUE, bold: true, size: 8 });
    box(LEFT + lblW, y, W - lblW, 16, data.alumno.nombre, { size: 9, bold: true });
    y += 16;
    const salonValW = W - lblW - midLbl - (W - lblW - midLbl) / 2;
    box(LEFT, y, lblW, 16, 'SALÓN:', { fill: LABELBLUE, bold: true, size: 8 });
    box(LEFT + lblW, y, salonValW, 16, data.alumno.salon, { size: 9 });
    box(LEFT + lblW + salonValW, y, midLbl, 16, 'NIVEL:', { fill: LABELBLUE, bold: true, size: 8 });
    box(LEFT + lblW + salonValW + midLbl, y, W - lblW - salonValW - midLbl, 16, data.alumno.nivel, { size: 9 });
    y += 16;
    box(LEFT, y, lblW, 16, 'TUTOR(A):', { fill: LABELBLUE, bold: true, size: 8 });
    box(LEFT + lblW, y, W - lblW, 16, gv(data.tutor), { size: 9 });
    y += 16 + 8;

    // ── Tabla de notas ───────────────────────────────────────────
    const cArea = 92, cCurso = 150, cBim = 40, cAnual = W - cArea - cCurso - cBim * 4;
    const xArea = LEFT, xCurso = LEFT + cArea, xBim0 = xCurso + cCurso, xAnual = xBim0 + cBim * 4;
    const RH = 15;

    function drawGradeHeader(yy: number): number {
      box(xArea, yy, cArea + cCurso, RH, 'ASIGNATURAS', { align: 'center', fill: HEADGRAY, bold: true, size: 8 });
      box(xBim0, yy, cBim * 4, RH, 'BIMESTRE', { align: 'center', fill: BLUEHDR, bold: true, size: 8 });
      box(xAnual, yy, cAnual, RH * 2, 'PROMEDIO ANUAL', { align: 'center', fill: GREEN, bold: true, size: 7.5, wrap: true });
      const y2 = yy + RH;
      data.bimestres.forEach((b, i) => box(xBim0 + i * cBim, y2, cBim, RH, ROMANOS[b] ?? String(b), { align: 'center', fill: BLUEHDR, bold: true, size: 8 }));
      return y2 + RH;
    }
    y = drawGradeHeader(y);

    for (const area of data.areas) {
      const cursoRows = area.cursos.length;
      const blockH = area.tienePromedioGeneral ? (cursoRows + 1) * RH : cursoRows * RH;
      if (y + blockH > PAGE_BOTTOM) { doc.addPage(); y = 50; y = drawGradeHeader(y); }

      if (!area.tienePromedioGeneral) {
        const u = area.cursos[0];
        const mismo = u && u.curso.toUpperCase() === area.area_nombre.toUpperCase();
        if (mismo) {
          box(xArea, y, cArea + cCurso, RH, area.area_nombre, { bold: true, size: 8 });
        } else {
          box(xArea, y, cArea, RH, area.area_nombre, { bold: true, size: 8 });
          box(xCurso, y, cCurso, RH, u?.curso ?? '', { size: 8 });
        }
        data.bimestres.forEach((b, i) => box(xBim0 + i * cBim, y, cBim, RH, gv(u?.literalPorBim[b]), { align: 'center', bold: true, size: 9 }));
        box(xAnual, y, cAnual, RH, gv(u?.literalAnual), { align: 'center', bold: true, size: 9, fill: GREEN });
        y += RH;
        continue;
      }

      const areaTop = y;
      area.cursos.forEach((curso) => {
        box(xCurso, y, cCurso, RH, curso.curso, { size: 8 });
        data.bimestres.forEach((b, i) => box(xBim0 + i * cBim, y, cBim, RH, gv(curso.literalPorBim[b]), { align: 'center', bold: true, size: 9 }));
        box(xAnual, y, cAnual, RH, gv(curso.literalAnual), { align: 'center', bold: true, size: 9, fill: GREEN });
        y += RH;
      });
      // Etiqueta del área (rowspan sobre las filas de curso)
      box(xArea, areaTop, cArea, cursoRows * RH, area.area_nombre, { bold: true, size: 8, align: 'left' });
      // Fila PROMEDIO GENERAL
      box(xArea, y, cArea + cCurso, RH, 'PROMEDIO GENERAL', { align: 'center', fill: HEADGRAY, bold: true, size: 8 });
      data.bimestres.forEach((b, i) => box(xBim0 + i * cBim, y, cBim, RH, gv(area.generalPorBim[b]), { align: 'center', fill: HEADGRAY, bold: true, size: 9 }));
      box(xAnual, y, cAnual, RH, gv(area.generalAnual), { align: 'center', fill: GREEN, bold: true, size: 9 });
      y += RH;
    }
    y += 10;

    // ── ASISTENCIA Y PUNTUALIDAD (datos reales) ──────────────────
    if (y + RH * 5 > PAGE_BOTTOM) { doc.addPage(); y = 50; }
    const aLbl1 = 110, aLbl2 = 175, aBim = (W - aLbl1 - aLbl2) / 4;
    box(xArea, y, aLbl1 + aLbl2, RH, '', { fill: '#FFFFFF' });
    box(xArea + aLbl1 + aLbl2, y, aBim * 4, RH, 'BIMESTRE', { align: 'center', fill: BLUEHDR, bold: true, size: 8 });
    y += RH;
    box(xArea, y, aLbl1 + aLbl2, RH, '', { fill: '#FFFFFF' });
    data.bimestres.forEach((b, i) => box(xArea + aLbl1 + aLbl2 + i * aBim, y, aBim, RH, ROMANOS[b] ?? String(b), { align: 'center', fill: BLUEHDR, bold: true, size: 8 }));
    y += RH;
    const asisDefs = [
      { et: 'TARDANZA', get: (b: number) => data.asistencia.find((x) => x.bimestre === b)?.tardanza ?? 0 },
      { et: 'FALTAS JUSTIFICADAS', get: (b: number) => data.asistencia.find((x) => x.bimestre === b)?.faltas_just ?? 0 },
      { et: 'FALTAS INJUSTIFICADAS', get: (b: number) => data.asistencia.find((x) => x.bimestre === b)?.faltas_injust ?? 0 },
    ];
    box(xArea, y, aLbl1, RH * 3, 'ASISTENCIA Y PUNTUALIDAD', { align: 'center', fill: HEADGRAY, bold: true, size: 7.5, wrap: true });
    asisDefs.forEach((r) => {
      box(xArea + aLbl1, y, aLbl2, RH, r.et, { size: 8 });
      data.bimestres.forEach((b, i) => box(xArea + aLbl1 + aLbl2 + i * aBim, y, aBim, RH, String(r.get(b)), { align: 'center', size: 8 }));
      y += RH;
    });
    y += 10;

    // ── Tablas de criterios en blanco ────────────────────────────
    function criteriosTable(titulo: string, primeraCol: string, criterios: string[]) {
      const cCrit = Math.round(W * 0.62), cB = (W - cCrit) / 4, critH = 24;
      const needed = RH * 2 + criterios.length * critH;
      if (y + needed > PAGE_BOTTOM) { doc.addPage(); y = 50; }
      box(xArea, y, cCrit, RH, titulo, { align: 'center', fill: HEADGRAY, bold: true, size: 8 });
      box(xArea + cCrit, y, cB * 4, RH, 'BIMESTRE', { align: 'center', fill: BLUEHDR, bold: true, size: 8 });
      y += RH;
      box(xArea, y, cCrit, RH, primeraCol, { align: 'center', fill: HEADGRAY, bold: true, size: 8 });
      data.bimestres.forEach((b, i) => box(xArea + cCrit + i * cB, y, cB, RH, ROMANOS[b] ?? String(b), { align: 'center', fill: BLUEHDR, bold: true, size: 8 }));
      y += RH;
      criterios.forEach((c) => {
        box(xArea, y, cCrit, critH, c, { size: 8, wrap: true });
        data.bimestres.forEach((_, i) => box(xArea + cCrit + i * cB, y, cB, critH, '', {}));
        y += critH;
      });
      y += 8;
    }
    criteriosTable('EVALUACIÓN GENERAL', '', CRITERIOS_GENERAL);
    criteriosTable('EVALUACIÓN DEL PADRE DE FAMILIA', 'CRITERIOS', CRITERIOS_PADRE);

    // ── CONCLUSIÓN DESCRIPTIVA POR PERIODO ───────────────────────
    const concH = 26, cBimW = 90;
    if (y + RH + data.bimestres.length * concH > PAGE_BOTTOM) { doc.addPage(); y = 50; }
    box(xArea, y, cBimW, RH, 'BIMESTRE', { align: 'center', fill: HEADGRAY, bold: true, size: 8 });
    box(xArea + cBimW, y, W - cBimW, RH, 'CONCLUSIÓN DESCRIPTIVA POR PERIODO', { align: 'center', fill: HEADGRAY, bold: true, size: 8 });
    y += RH;
    data.bimestres.forEach((b) => {
      box(xArea, y, cBimW, concH, ROMANOS[b] ?? String(b), { align: 'center', fill: BLUEHDR, bold: true, size: 9 });
      box(xArea + cBimW, y, W - cBimW, concH, '', {});
      y += concH;
    });
    y += 24;

    // ── Firmas ───────────────────────────────────────────────────
    if (y + 60 > PAGE_BOTTOM) { doc.addPage(); y = 60; }
    const sigW = 170, sigH = 44;
    doc.rect(xArea, y, sigW, sigH).strokeColor(LINE).lineWidth(0.5).stroke();
    doc.rect(RIGHT - sigW, y, sigW, sigH).strokeColor(LINE).lineWidth(0.5).stroke();
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(8);
    doc.text('TUTOR (A)', xArea, y + sigH + 3, { width: sigW, align: 'center' });
    doc.text('FIRMA Y SELLO DE DIRECCIÓN', RIGHT - sigW, y + sigH + 3, { width: sigW, align: 'center' });

    doc.end();
  });
}
