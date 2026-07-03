// ============================================================
//  pdf/horario.builder.ts
//  Genera el PDF de horarios (por docente, por sección o completo)
//  usando pdfkit, igual que pdf/libreta.builder.ts.
//
//  Los export "por docente" y "por sección" replican tal cual la
//  grilla hora×día que ve el usuario en pantalla (mismo componente
//  visual que frontend/src/app/components/horarios/HorarioSemanalGrid.tsx):
//  franjas horarias fijas como filas, Lunes–Viernes como columnas,
//  casillas vacías en blanco, y una banda de Recreo/Refrigerio a todo
//  el ancho cuando aplica.
//
//  INSTALACIÓN REQUERIDA:
//    pnpm add pdfkit @types/pdfkit --filter backend
//
//  Si pdfkit no está instalado, el endpoint devuelve 503.
// ============================================================

// Forma mínima común entre un bloque "borrador" (HorarioRow de
// academic.repository) y un bloque "publicado" (snapshot de
// horario_publicacion_bloque) — el builder no necesita saber cuál es.
export interface HorarioPdfBloque {
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  aula: string | null;
  curso: string;
  docente: string;
  seccion: string;
  grado: string;
  nivel: string;
}

export interface HorarioPdfDescanso {
  tipo: 'RECREO' | 'REFRIGERIO';
  hora_inicio: string;
  hora_fin: string;
}

const DIA_LABEL: Record<number, string> = {
  1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado',
};

// Mismas franjas que frontend/src/app/components/horarios/horarioConstants.ts —
// necesario para que el PDF calce en una sola hoja y coincida con la UI.
const HOURS = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];
const DAYS = [1, 2, 3, 4, 5];
const DAY_LABEL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

const CURSO_PALETTE = [
  { bg: '#eff6ff', text: '#1d4ed8' }, // blue
  { bg: '#ecfdf5', text: '#047857' }, // emerald
  { bg: '#fffbeb', text: '#b45309' }, // amber
  { bg: '#faf5ff', text: '#7e22ce' }, // purple
  { bg: '#eef2ff', text: '#4338ca' }, // indigo
  { bg: '#fef2f2', text: '#b91c1c' }, // red
  { bg: '#fdf2f8', text: '#be185d' }, // pink
  { bg: '#f0fdfa', text: '#0f766e' }, // teal
];

const DESCANSO_STYLE: Record<HorarioPdfDescanso['tipo'], { bg: string; text: string; label: string }> = {
  RECREO: { bg: '#fffbeb', text: '#b45309', label: 'Recreo' },
  REFRIGERIO: { bg: '#fff7ed', text: '#c2410c', label: 'Refrigerio / Almuerzo' },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadPdfKit(): Promise<any> {
  try {
    return (await import('pdfkit')).default;
  } catch {
    throw new Error('pdfkit no está instalado. Ejecuta: pnpm add pdfkit @types/pdfkit --filter backend');
  }
}

function seSolapan(aInicio: string, aFin: string, bInicio: string, bFin: string): boolean {
  return aInicio < bFin && bInicio < aFin;
}

/**
 * Grilla hora×día — usada por "por docente" y "por sección", que son
 * exportes de una sola entidad y por lo tanto caben en una única grilla,
 * igual que en pantalla.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dibujarGrid(
  doc: any,
  titulo: string,
  subtitulo: string,
  bloques: HorarioPdfBloque[],
  descansos: HorarioPdfDescanso[],
  variante: 'docente' | 'seccion',
) {
  const LEFT = 40;
  const W = doc.page.width - 80;
  const COL_HORA = 55;
  const COL_DAY = (W - COL_HORA) / DAYS.length;
  const HEADER_H = 24;
  const ROW_H = 46;

  doc.fillColor('#1e3a5f').fontSize(14).font('Helvetica-Bold')
    .text(titulo, LEFT, 40, { width: W, align: 'center' });
  doc.fillColor('#64748b').fontSize(9).font('Helvetica')
    .text(subtitulo, LEFT, 60, { width: W, align: 'center' });

  let y = 88;

  const cursoColor = new Map<string, typeof CURSO_PALETTE[number]>();
  let colorIdx = 0;
  function colorDe(curso: string) {
    if (!cursoColor.has(curso)) {
      cursoColor.set(curso, CURSO_PALETTE[colorIdx % CURSO_PALETTE.length]!);
      colorIdx += 1;
    }
    return cursoColor.get(curso)!;
  }

  function dibujarEncabezado() {
    doc.rect(LEFT, y, COL_HORA, HEADER_H).fillColor('#f1f5f9').fill();
    doc.rect(LEFT, y, COL_HORA, HEADER_H).strokeColor('#cbd5e1').lineWidth(0.5).stroke();
    DAY_LABEL.forEach((label, i) => {
      const x = LEFT + COL_HORA + i * COL_DAY;
      doc.rect(x, y, COL_DAY, HEADER_H).fillColor('#1e3a5f').fill();
      doc.rect(x, y, COL_DAY, HEADER_H).strokeColor('#1e3a5f').lineWidth(0.5).stroke();
      doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold')
        .text(label.toUpperCase(), x, y + 8, { width: COL_DAY, align: 'center' });
    });
    y += HEADER_H;
  }

  dibujarEncabezado();

  const slots = HOURS.slice(0, -1).map((h, i) => ({ inicio: h, fin: HOURS[i + 1]! }));

  for (const slot of slots) {
    if (y + ROW_H > doc.page.height - 40) {
      doc.addPage();
      y = 40;
      dibujarEncabezado();
    }

    doc.rect(LEFT, y, COL_HORA, ROW_H).fillColor('#f8fafc').fill();
    doc.rect(LEFT, y, COL_HORA, ROW_H).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
    doc.fillColor('#94a3b8').fontSize(7).font('Helvetica')
      .text(slot.inicio, LEFT, y + ROW_H / 2 - 4, { width: COL_HORA, align: 'center' });

    const descanso = descansos.find((d) => seSolapan(slot.inicio, slot.fin, d.hora_inicio, d.hora_fin));

    if (descanso) {
      const style = DESCANSO_STYLE[descanso.tipo];
      const x = LEFT + COL_HORA;
      const w = W - COL_HORA;
      doc.rect(x, y, w, ROW_H).fillColor(style.bg).fill();
      doc.rect(x, y, w, ROW_H).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
      doc.fillColor(style.text).fontSize(8.5).font('Helvetica-Bold')
        .text(`${style.label} · ${descanso.hora_inicio}–${descanso.hora_fin}`, x, y + ROW_H / 2 - 5, { width: w, align: 'center' });
    } else {
      for (let i = 0; i < DAYS.length; i++) {
        const dia = DAYS[i]!;
        const x = LEFT + COL_HORA + i * COL_DAY;
        const item = bloques.find((b) => b.dia_semana === dia && seSolapan(slot.inicio, slot.fin, b.hora_inicio, b.hora_fin));

        if (!item) {
          doc.rect(x, y, COL_DAY, ROW_H).fillColor('#ffffff').fill();
          doc.rect(x, y, COL_DAY, ROW_H).strokeColor('#f1f5f9').lineWidth(0.5).stroke();
          doc.fillColor('#cbd5e1').fontSize(8).font('Helvetica')
            .text('—', x, y + ROW_H / 2 - 4, { width: COL_DAY, align: 'center' });
          continue;
        }

        const c = colorDe(item.curso);
        doc.rect(x, y, COL_DAY, ROW_H).fillColor(c.bg).fill();
        doc.rect(x, y, COL_DAY, ROW_H).strokeColor('#e2e8f0').lineWidth(0.5).stroke();

        const pad = 4;
        let ty = y + 4;
        doc.fillColor(c.text).fontSize(7.5).font('Helvetica-Bold')
          .text(item.curso, x + pad, ty, { width: COL_DAY - pad * 2, ellipsis: true });
        ty += 10;

        const etiqueta = variante === 'docente' ? `${item.grado} ${item.seccion}` : item.docente;
        doc.fillColor('#475569').fontSize(6.5).font('Helvetica')
          .text(etiqueta, x + pad, ty, { width: COL_DAY - pad * 2, ellipsis: true });
        ty += 9;

        if (item.aula) {
          doc.fillColor('#94a3b8').fontSize(6.5).font('Helvetica')
            .text(item.aula, x + pad, ty, { width: COL_DAY - pad * 2, ellipsis: true });
        }
      }
    }

    y += ROW_H;
  }

  if (bloques.length === 0 && descansos.length === 0) {
    doc.fillColor('#64748b').fontSize(9).font('Helvetica').text('Sin bloques de horario registrados.', LEFT, y + 10);
  }
}

/**
 * Tabla común "Día — Hora — Curso — [columna variable] — Aula" — usada
 * únicamente por el export "completo" (todo el colegio, todas las
 * secciones/docentes a la vez), donde una única grilla no aplica porque
 * mezcla muchas entidades con distinto recreo/refrigerio por nivel.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dibujarTabla(doc: any, titulo: string, subtitulo: string, rows: HorarioPdfBloque[]) {
  const W = doc.page.width - 80;
  const LEFT = 40;
  const HEADER = '#1e3a5f';
  const GRAY = '#64748b';

  doc.fillColor(HEADER).fontSize(13).font('Helvetica-Bold')
    .text(titulo, LEFT, 40, { width: W, align: 'center' });
  doc.fillColor(GRAY).fontSize(9).font('Helvetica')
    .text(subtitulo, LEFT, 58, { width: W, align: 'center' });

  doc.moveDown(1.2);
  doc.moveTo(LEFT, doc.y).lineTo(LEFT + W, doc.y).strokeColor('#cbd5e1').lineWidth(0.5).stroke();
  doc.moveDown(0.6);

  const porDia = new Map<number, HorarioPdfBloque[]>();
  for (const row of rows) {
    if (!porDia.has(row.dia_semana)) porDia.set(row.dia_semana, []);
    porDia.get(row.dia_semana)!.push(row);
  }
  for (const bloquesDia of porDia.values()) {
    bloquesDia.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
  }
  const dias = [1, 2, 3, 4, 5, 6].filter((d) => porDia.has(d));

  const COL_HORA = 80;
  const COL_CURSO = 140;
  const COL_VAR1 = 130;
  const COL_VAR2 = W - COL_HORA - COL_CURSO - COL_VAR1 - 70;
  const COL_AULA = 70;
  const ROW_H = 16;
  const HEADER_H = 18;

  for (const dia of dias) {
    const bloques = porDia.get(dia)!;
    const groupH = bloques.length * ROW_H + HEADER_H;
    if (doc.y + groupH > doc.page.height - 60) doc.addPage();

    const startY = doc.y;
    doc.rect(LEFT, startY, W, HEADER_H).fillColor('#1e3a5f').fill();
    doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold')
      .text(DIA_LABEL[dia] ?? `Día ${dia}`, LEFT + 4, startY + 4, { width: W - 8 });
    doc.y = startY + HEADER_H;

    let rowBg = false;
    for (const b of bloques) {
      const rowY = doc.y;
      if (rowBg) doc.rect(LEFT, rowY, W, ROW_H).fillColor('#f8fafc').fill();
      rowBg = !rowBg;

      let x = LEFT;
      doc.fillColor('#1e293b').fontSize(7.5).font('Helvetica-Bold')
        .text(`${b.hora_inicio}–${b.hora_fin}`, x + 4, rowY + 4, { width: COL_HORA - 4 });
      x += COL_HORA;

      doc.fillColor('#334155').fontSize(7.5).font('Helvetica')
        .text(b.curso, x + 4, rowY + 4, { width: COL_CURSO - 8, ellipsis: true });
      x += COL_CURSO;

      doc.text(`${b.grado} ${b.seccion}`, x + 4, rowY + 4, { width: COL_VAR1 - 8, ellipsis: true });
      x += COL_VAR1;
      doc.text(b.docente, x + 4, rowY + 4, { width: COL_VAR2 - 8, ellipsis: true });
      x += COL_VAR2;

      doc.text(b.aula ?? '—', x + 4, rowY + 4, { width: COL_AULA - 4 });

      doc.y = rowY + ROW_H;
    }

    doc.moveTo(LEFT, doc.y).lineTo(LEFT + W, doc.y).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
    doc.moveDown(0.5);
  }

  if (dias.length === 0) {
    doc.fillColor(GRAY).fontSize(9).font('Helvetica').text('Sin bloques de horario registrados.', LEFT, doc.y);
  }
}

export async function buildHorarioDocentePdf(
  bloques: HorarioPdfBloque[],
  docenteNombre: string,
  descansos: HorarioPdfDescanso[] = [],
): Promise<Buffer> {
  const PDFDocument = await loadPdfKit();
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    dibujarGrid(doc, 'Horario del Docente', docenteNombre, bloques, descansos, 'docente');
    doc.end();
  });
}

export async function buildHorarioSeccionPdf(
  bloques: HorarioPdfBloque[],
  seccionNombre: string,
  descansos: HorarioPdfDescanso[] = [],
): Promise<Buffer> {
  const PDFDocument = await loadPdfKit();
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    dibujarGrid(doc, 'Horario de Sección', seccionNombre, bloques, descansos, 'seccion');
    doc.end();
  });
}

export async function buildHorarioCompletoPdf(rows: HorarioPdfBloque[], periodoNombre: string): Promise<Buffer> {
  const PDFDocument = await loadPdfKit();
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    dibujarTabla(doc, 'Horario General', periodoNombre, rows);
    doc.end();
  });
}

export interface HorarioPdfEntrada {
  titulo: string;
  subtitulo: string;
  bloques: HorarioPdfBloque[];
  descansos: HorarioPdfDescanso[];
  variante: 'docente' | 'seccion';
}

/**
 * Export masivo (opción secundaria del Admin): un único PDF con una
 * grilla por página — una hoja por docente, o una hoja por sección —
 * reutilizando exactamente el mismo `dibujarGrid` de los exports
 * individuales.
 */
export async function buildHorarioMultiplePdf(entradas: HorarioPdfEntrada[]): Promise<Buffer> {
  const PDFDocument = await loadPdfKit();
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    if (entradas.length === 0) {
      doc.fillColor('#64748b').fontSize(11).font('Helvetica').text('No hay horarios registrados para exportar.', 40, 40);
    } else {
      entradas.forEach((entrada, i) => {
        if (i > 0) doc.addPage();
        dibujarGrid(doc, entrada.titulo, entrada.subtitulo, entrada.bloques, entrada.descansos, entrada.variante);
      });
    }

    doc.end();
  });
}
