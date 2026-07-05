// ============================================================
//  pdf/libreta.builder.ts
//  Genera el PDF de la libreta de notas usando pdfkit.
//
//  INSTALACIÓN REQUERIDA:
//    pnpm add pdfkit @types/pdfkit --filter backend
//
//  Si pdfkit no está instalado, el endpoint devuelve 503.
// ============================================================
import type { LibretaRowDetallada } from '@/modules/libretas/libreta.repository';

interface CursoGroup {
  curso:        string;
  competencias: {
    nombre:   string;
    notas:    Map<number, { vigesimal: number | null; literal: string | null }>;
  }[];
}

interface AreaGroup {
  area:   string;
  cursos: CursoGroup[];
}

/** Agrupa área → curso → competencia. Cursos sin área asignada se
 *  renderizan como su propia banda (usando su propio nombre). */
function agruparPorArea(rows: LibretaRowDetallada[]): AreaGroup[] {
  const areaMap = new Map<string, AreaGroup>();

  for (const row of rows) {
    const areaKey    = row.area_id ?? `__curso_${row.curso_id}`;
    const areaNombre = row.area_nombre ?? row.curso;
    if (!areaMap.has(areaKey)) areaMap.set(areaKey, { area: areaNombre, cursos: [] });
    const area = areaMap.get(areaKey)!;

    let curso = area.cursos.find((c) => c.curso === row.curso);
    if (!curso) {
      curso = { curso: row.curso, competencias: [] };
      area.cursos.push(curso);
    }

    let comp = curso.competencias.find((c) => c.nombre === row.competencia);
    if (!comp) {
      comp = { nombre: row.competencia, notas: new Map() };
      curso.competencias.push(comp);
    }
    comp.notas.set(row.bimestre, {
      vigesimal: row.nota_vigesimal,
      literal:   row.nota_literal,
    });
  }

  return Array.from(areaMap.values());
}

function bimestresPresentes(rows: LibretaRowDetallada[]): number[] {
  return [...new Set(rows.map((r) => r.bimestre))].sort((a, b) => a - b);
}

/** Convierte un promedio vigesimal a literal usando la escala estándar (AD/A/B/C) mostrada en el pie del documento. */
function literalDeVigesimal(valor: number | null): string {
  if (valor === null) return '—';
  if (valor >= 18) return 'AD';
  if (valor >= 14) return 'A';
  if (valor >= 11) return 'B';
  return 'C';
}

export async function buildLibretaPdf(
  rows: LibretaRowDetallada[],
  opciones: { soloLiteral?: boolean } = {},
): Promise<Buffer> {
  const soloLiteral = opciones.soloLiteral ?? false;
  // Dynamic import — no rompe el build si pdfkit no está instalado
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let PDFDocument: any;
  try {
    PDFDocument = (await import('pdfkit')).default;
  } catch {
    throw new Error('pdfkit no está instalado. Ejecuta: pnpm add pdfkit @types/pdfkit --filter backend');
  }

  const meta   = rows[0];
  const areas  = agruparPorArea(rows);
  const bims   = bimestresPresentes(rows);

  // Peso por (curso, competencia, bimestre) — para el promedio ponderado real.
  const pesoPorCompetencia = new Map<string, number>();
  for (const r of rows) pesoPorCompetencia.set(`${r.curso}::${r.competencia}`, r.peso);

  function promedioPonderadoCurso(curso: CursoGroup, bimestre: number): number | null {
    let sumPonderada = 0;
    let sumPeso = 0;
    for (const comp of curso.competencias) {
      const n = comp.notas.get(bimestre);
      if (n?.vigesimal != null) {
        const peso = pesoPorCompetencia.get(`${curso.curso}::${comp.nombre}`) ?? 100;
        sumPonderada += n.vigesimal * peso;
        sumPeso += peso;
      }
    }
    return sumPeso > 0 ? sumPonderada / sumPeso : null;
  }

  function promedioAreaEnBimestre(area: AreaGroup, bimestre: number): number | null {
    const proms = area.cursos.map((c) => promedioPonderadoCurso(c, bimestre)).filter((n): n is number => n !== null);
    return proms.length > 0 ? proms.reduce((a, b) => a + b, 0) / proms.length : null;
  }

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

    // Filas: área → curso → competencia, + fila "PROMEDIO GENERAL" por área
    let rowBg = false;
    for (const area of areas) {
      const totalCompRows = area.cursos.reduce((acc, c) => acc + c.competencias.length, 0);
      const totalRows = totalCompRows + area.cursos.length; // + 1 fila "Promedio del curso" cada uno
      const groupH = totalRows * ROW_H;

      if (doc.y + groupH > doc.page.height - 80) {
        doc.addPage();
      }

      const groupStartY = doc.y;

      if (rowBg) {
        doc.rect(LEFT, groupStartY, W, groupH).fillColor('#f8fafc').fill();
      }
      rowBg = !rowBg;

      // Nombre del área (lado izquierdo, centrado verticalmente sobre todo el bloque)
      doc.fillColor(BLUE)
         .fontSize(8)
         .font('Helvetica-Bold')
         .text(area.area, LEFT + 4, groupStartY + (groupH - 8) / 2, {
           width:     COL_CURSO - 8,
           lineBreak: false,
         });

      let cy = groupStartY;
      for (const curso of area.cursos) {
        curso.competencias.forEach((comp) => {
          doc.fillColor('#334155')
             .fontSize(7.5)
             .font('Helvetica')
             .text(`${curso.curso} — ${comp.nombre}`, LEFT + COL_CURSO + 4, cy + 4, {
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
            const texto = soloLiteral ? (lstr || '—') : `${vstr} ${lstr}`;

            doc.fillColor('#1e293b')
               .fontSize(7.5)
               .font('Helvetica-Bold')
               .text(texto, x + 2, cy + 4, { width: COL_BIM - 4, align: 'center' });
          });

          cy += ROW_H;
        });

        // Fila "Promedio del curso" (ponderado por peso de sus criterios)
        doc.fillColor('#475569')
           .fontSize(7)
           .font('Helvetica-Bold')
           .text(`Promedio: ${curso.curso}`, LEFT + COL_CURSO + 4, cy + 4, {
             width:     COL_COMP - 8,
             lineBreak: false,
           });
        bims.forEach((b, bi) => {
          const prom = promedioPonderadoCurso(curso, b);
          const x    = LEFT + COL_CURSO + COL_COMP + bi * COL_BIM;
          const textoProm = soloLiteral ? literalDeVigesimal(prom) : (prom !== null ? prom.toFixed(1) : '—');
          doc.fillColor('#1e293b')
             .fontSize(7)
             .font('Helvetica-Bold')
             .text(textoProm, x + 2, cy + 4, { width: COL_BIM - 4, align: 'center' });
        });
        cy += ROW_H;
      }

      // Borde inferior del grupo
      doc.moveTo(LEFT, groupStartY + groupH)
         .lineTo(LEFT + W, groupStartY + groupH)
         .strokeColor('#e2e8f0')
         .lineWidth(0.5)
         .stroke();

      doc.y = groupStartY + groupH;

      // Fila "PROMEDIO GENERAL" del área (promedio simple de sus cursos)
      const genY = doc.y;
      doc.rect(LEFT, genY, W, ROW_H).fillColor('#dbeafe').fill();
      doc.fillColor(BLUE)
         .fontSize(7.5)
         .font('Helvetica-Bold')
         .text('PROMEDIO GENERAL', LEFT + COL_CURSO + 4, genY + 4, { width: COL_COMP - 8 });
      bims.forEach((b, bi) => {
        const prom = promedioAreaEnBimestre(area, b);
        const x = LEFT + COL_CURSO + COL_COMP + bi * COL_BIM;
        const textoProm = soloLiteral ? literalDeVigesimal(prom) : (prom !== null ? prom.toFixed(1) : '—');
        doc.fillColor(BLUE)
           .fontSize(7.5)
           .font('Helvetica-Bold')
           .text(textoProm, x + 2, genY + 4, { width: COL_BIM - 4, align: 'center' });
      });
      doc.y = genY + ROW_H;
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
