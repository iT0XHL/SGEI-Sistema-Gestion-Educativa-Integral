// ============================================================
//  pdf/libreta.builder.ts
//  Genera el PDF de la libreta de notas usando pdfkit.
//
//  INSTALACIÓN REQUERIDA:
//    pnpm add pdfkit @types/pdfkit --filter backend
//
//  Si pdfkit no está instalado, el endpoint devuelve 503.
// ============================================================
import type { LibretaRow } from '@/modules/libretas/libreta.repository';

interface CursoGroup {
  curso:        string;
  competencias: {
    nombre:   string;
    notas:    Map<number, { vigesimal: number | null; literal: string | null }>;
  }[];
}

function agruparPorCurso(rows: LibretaRow[]): CursoGroup[] {
  const cursoMap = new Map<string, CursoGroup>();

  for (const row of rows) {
    if (!cursoMap.has(row.curso)) {
      cursoMap.set(row.curso, { curso: row.curso, competencias: [] });
    }
    const grupo = cursoMap.get(row.curso)!;

    let comp = grupo.competencias.find((c) => c.nombre === row.competencia);
    if (!comp) {
      comp = { nombre: row.competencia, notas: new Map() };
      grupo.competencias.push(comp);
    }
    comp.notas.set(row.bimestre, {
      vigesimal: row.nota_vigesimal,
      literal:   row.nota_literal,
    });
  }

  return Array.from(cursoMap.values());
}

function bimestresPresentes(rows: LibretaRow[]): number[] {
  return [...new Set(rows.map((r) => r.bimestre))].sort((a, b) => a - b);
}

export async function buildLibretaPdf(rows: LibretaRow[]): Promise<Buffer> {
  // Dynamic import — no rompe el build si pdfkit no está instalado
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let PDFDocument: any;
  try {
    PDFDocument = (await import('pdfkit')).default;
  } catch {
    throw new Error('pdfkit no está instalado. Ejecuta: pnpm add pdfkit @types/pdfkit --filter backend');
  }

  const meta     = rows[0];
  const cursos   = agruparPorCurso(rows);
  const bims     = bimestresPresentes(rows);

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W      = doc.page.width - 80;   // usable width
    const LEFT   = 40;
    const GRAY   = '#64748b';
    const BLUE   = '#1e40af';
    const HEADER = '#1e3a5f';

    // ── Encabezado ──────────────────────────────────────────────
    doc.fillColor(HEADER)
       .fontSize(13)
       .font('Helvetica-Bold')
       .text('I.E. SAN JOSÉ DE CALASANZ', LEFT, 40, { width: W, align: 'center' });

    doc.fillColor(GRAY)
       .fontSize(9)
       .font('Helvetica')
       .text('LIBRETA DE NOTAS — EDUCACIÓN SECUNDARIA', LEFT, 56, { width: W, align: 'center' });

    doc.moveDown(0.4);
    doc.moveTo(LEFT, doc.y).lineTo(LEFT + W, doc.y).strokeColor('#cbd5e1').lineWidth(0.5).stroke();
    doc.moveDown(0.4);

    // Datos del alumno
    const info = [
      `Alumno: ${meta?.alumno_nombre ?? '—'}`,
      `Grado:  ${meta?.grado ?? '—'}° Secundaria — Sección ${meta?.seccion ?? '—'}`,
    ];
    doc.fillColor('#1e293b').fontSize(9).font('Helvetica-Bold');
    info.forEach((line) => {
      doc.text(line, LEFT, doc.y, { width: W });
      doc.moveDown(0.2);
    });

    doc.moveDown(0.5);
    doc.moveTo(LEFT, doc.y).lineTo(LEFT + W, doc.y).strokeColor('#cbd5e1').lineWidth(0.5).stroke();
    doc.moveDown(0.6);

    // ── Tabla de notas ──────────────────────────────────────────
    const COL_CURSO  = 140;
    const COL_COMP   = 195;
    const COL_BIM    = Math.floor((W - COL_CURSO - COL_COMP) / (bims.length || 1));
    const ROW_H      = 16;
    const HEADER_H   = 20;

    // Cabecera de tabla
    const headerY = doc.y;
    doc.rect(LEFT, headerY, W, HEADER_H).fillColor('#1e3a5f').fill();
    doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
    doc.text('Área Curricular', LEFT + 4,     headerY + 5, { width: COL_CURSO - 4 });
    doc.text('Competencia',     LEFT + COL_CURSO + 4, headerY + 5, { width: COL_COMP - 4 });
    bims.forEach((b, i) => {
      const x = LEFT + COL_CURSO + COL_COMP + i * COL_BIM;
      doc.text(`Bim. ${b}`, x + 2, headerY + 5, { width: COL_BIM - 4, align: 'center' });
    });
    doc.y = headerY + HEADER_H;

    // Filas
    let rowBg = false;
    for (const grupo of cursos) {
      const startY = doc.y;
      const totalRows = grupo.competencias.length;
      const groupH = totalRows * ROW_H;

      // Nueva página si no cabe
      if (doc.y + groupH > doc.page.height - 80) {
        doc.addPage();
      }

      const groupStartY = doc.y;

      // Fondo alternado para el grupo
      if (rowBg) {
        doc.rect(LEFT, groupStartY, W, groupH).fillColor('#f8fafc').fill();
      }
      rowBg = !rowBg;

      // Nombre del área (lado izquierdo, centrado verticalmente)
      doc.fillColor(BLUE)
         .fontSize(8)
         .font('Helvetica-Bold')
         .text(grupo.curso, LEFT + 4, groupStartY + (groupH - 8) / 2, {
           width:     COL_CURSO - 8,
           lineBreak: false,
         });

      // Competencias
      grupo.competencias.forEach((comp, idx) => {
        const cy = groupStartY + idx * ROW_H;

        doc.fillColor('#334155')
           .fontSize(7.5)
           .font('Helvetica')
           .text(comp.nombre, LEFT + COL_CURSO + 4, cy + 4, {
             width:     COL_COMP - 8,
             lineBreak: false,
             ellipsis:  true,
           });

        bims.forEach((b, bi) => {
          const nota = comp.notas.get(b);
          const x    = LEFT + COL_CURSO + COL_COMP + bi * COL_BIM;
          const vstr = nota?.vigesimal !== null && nota?.vigesimal !== undefined
            ? nota.vigesimal.toFixed(1)
            : '—';
          const lstr = nota?.literal ?? '';

          doc.fillColor('#1e293b')
             .fontSize(7.5)
             .font('Helvetica-Bold')
             .text(`${vstr} ${lstr}`, x + 2, cy + 4, { width: COL_BIM - 4, align: 'center' });
        });
      });

      // Borde inferior del grupo
      doc.moveTo(LEFT, groupStartY + groupH)
         .lineTo(LEFT + W, groupStartY + groupH)
         .strokeColor('#e2e8f0')
         .lineWidth(0.5)
         .stroke();

      doc.y = groupStartY + groupH;
    }

    // ── Escala literal ──────────────────────────────────────────
    doc.moveDown(1);
    doc.fillColor(GRAY)
       .fontSize(7.5)
       .font('Helvetica')
       .text(
         'Escala literal:  AD (18–20) Logro destacado  ·  A (14–17) Logro esperado  ·  B (11–13) En proceso  ·  C (00–10) En inicio',
         LEFT,
         doc.y,
         { width: W },
       );

    // ── Pie de página ───────────────────────────────────────────
    const footerY = doc.page.height - 40;
    doc.moveTo(LEFT, footerY - 6)
       .lineTo(LEFT + W, footerY - 6)
       .strokeColor('#cbd5e1')
       .lineWidth(0.5)
       .stroke();
    doc.fillColor(GRAY)
       .fontSize(7)
       .text(
         `Generado el ${new Date().toLocaleDateString('es-PE')} — SGEI v2.1`,
         LEFT,
         footerY,
         { width: W, align: 'right' },
       );

    doc.end();
  });
}
