// ============================================================
//  word/libreta.docx.builder.ts
//  Genera la "BOLETA DE NOTAS" como documento Word (.docx) EDITABLE,
//  con el formato de la IEP Virgen del Carmen - Las Viñas
//  (referencia: resources/LIBRETANUEVA.pdf).
//
//  Lo usa Secretaría (exportación por lote). El personal abre el .docx
//  en Word y completa lo que queda en blanco: evaluación general,
//  evaluación del padre de familia, conclusiones descriptivas y firmas.
//
//  Consume el modelo único BoletaData (mismo que el PDF del alumno).
//  Requiere la dependencia `docx`.
// ============================================================
import type { BoletaData } from '@/modules/libretas/boleta.types';

/** Criterios de conducta que el tutor completa a mano en Word. */
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

export async function buildLibretaDocx(data: BoletaData): Promise<Buffer> {
  let docx: typeof import('docx');
  try {
    docx = await import('docx');
  } catch {
    throw new Error('La dependencia "docx" no está instalada. Ejecuta: npm install docx');
  }
  const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    WidthType, AlignmentType, BorderStyle, VerticalAlign, ShadingType, TableLayoutType,
  } = docx;

  // ── Paleta (hex sin #) ─────────────────────────────────────────
  const YELLOW = 'FFF200', HEADGRAY = 'D9D9D9', BLUEHDR = 'DDEBF7';
  const GREEN = 'E2EFDA', LABELBLUE = 'DDEBF7', INK = '000000', LINE = '808080';
  const FONT = 'Calibri';

  // A4, márgenes ~1.1 cm.
  const MARGIN = 620;
  const PAGE_W = 11906;
  const USABLE = PAGE_W - 2 * MARGIN; // ~10666

  const thin = { style: BorderStyle.SINGLE, size: 4, color: LINE };
  const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const allBorders = { top: thin, bottom: thin, left: thin, right: thin, insideHorizontal: thin, insideVertical: thin };
  const noBorders  = { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none };

  function para(text: string, o: { align?: any; bold?: boolean; size?: number; color?: string } = {}) {
    return new Paragraph({
      alignment: o.align,
      spacing: { before: 8, after: 8 },
      children: [new TextRun({ text: text ?? '', bold: o.bold, size: o.size ?? 18, color: o.color ?? INK, font: FONT })],
    });
  }
  function cell(text: string, o: {
    align?: any; bold?: boolean; size?: number; color?: string; fill?: string;
    colSpan?: number; rowSpan?: number; width?: number; vAlign?: any;
  } = {}) {
    return new TableCell({
      width: o.width ? { size: o.width, type: WidthType.DXA } : undefined,
      columnSpan: o.colSpan,
      rowSpan: o.rowSpan,
      verticalAlign: o.vAlign ?? VerticalAlign.CENTER,
      shading: o.fill ? { type: ShadingType.CLEAR, color: 'auto', fill: o.fill } : undefined,
      margins: { top: 20, bottom: 20, left: 70, right: 70 },
      children: [para(text, { align: o.align ?? AlignmentType.LEFT, bold: o.bold, size: o.size, color: o.color })],
    });
  }

  const children: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = [];

  // ── Encabezado institucional ───────────────────────────────────
  // Nombre limpio (sin prefijo "IEP ") para el título grande.
  const nombreLimpio = data.institucion.nombre.replace(/^IEP\s+/i, '').trim();
  children.push(para('INSTITUCIÓN EDUCATIVA PARTICULAR', { align: AlignmentType.CENTER, bold: true, size: 24, color: '1F3864' }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 20 },
    children: [new TextRun({ text: `"${nombreLimpio.toUpperCase()}"`, bold: true, size: 32, color: '1F3864', font: FONT })],
  }));
  children.push(para(data.institucion.niveles_texto, { align: AlignmentType.CENTER, size: 18, color: '404040' }));

  // Barra amarilla "BOLETA DE NOTAS - AÑO"
  children.push(new Table({
    width: { size: USABLE, type: WidthType.DXA },
    columnWidths: [USABLE],
    layout: TableLayoutType.FIXED,
    borders: allBorders,
    rows: [new TableRow({ children: [
      cell(`BOLETA DE NOTAS - ${data.anio}`, { align: AlignmentType.CENTER, bold: true, size: 30, fill: YELLOW }),
    ] })],
  }));
  children.push(para('', { size: 6 }));

  // ── Datos del estudiante ───────────────────────────────────────
  const lblW = Math.round(USABLE * 0.22);
  const midW = Math.round(USABLE * 0.16);
  const lbl = (t: string) => cell(t, { bold: true, fill: LABELBLUE, size: 18, width: lblW });
  children.push(new Table({
    width: { size: USABLE, type: WidthType.DXA },
    columnWidths: [lblW, USABLE - lblW - lblW - midW, lblW, midW],
    layout: TableLayoutType.FIXED,
    borders: allBorders,
    rows: [
      new TableRow({ children: [
        lbl('APELLIDOS Y NOMBRES:'),
        cell(data.alumno.nombre, { size: 18, colSpan: 3 }),
      ] }),
      new TableRow({ children: [
        lbl('SALÓN:'),
        cell(data.alumno.salon, { size: 18 }),
        lbl('NIVEL:'),
        cell(data.alumno.nivel, { size: 18 }),
      ] }),
      new TableRow({ children: [
        lbl('TUTOR(A):'),
        cell(data.tutor ?? '', { size: 18, colSpan: 3 }),
      ] }),
    ],
  }));
  children.push(para('', { size: 8 }));

  // ── Tabla de notas (ASIGNATURAS × BIMESTRE + PROMEDIO ANUAL) ────
  const cArea = 1950, cCurso = 3350, cBim = 640, cAnual = USABLE - cArea - cCurso - cBim * 4;
  const gradeCols = [cArea, cCurso, cBim, cBim, cBim, cBim, cAnual];
  const hcell = (text: string, o: { colSpan?: number; rowSpan?: number; fill?: string } = {}) =>
    cell(text, { ...o, bold: true, fill: o.fill ?? HEADGRAY, align: AlignmentType.CENTER, size: 17 });

  const gradeRows: InstanceType<typeof TableRow>[] = [
    new TableRow({ tableHeader: true, children: [
      hcell('ASIGNATURAS', { colSpan: 2, rowSpan: 2 }),
      hcell('BIMESTRE', { colSpan: 4, fill: BLUEHDR }),
      hcell('PROMEDIO ANUAL', { rowSpan: 2, fill: GREEN }),
    ] }),
    new TableRow({ tableHeader: true, children:
      data.bimestres.map((b) => hcell(ROMANOS[b] ?? String(b), { fill: BLUEHDR })),
    }),
  ];

  const gv = (v: string | null) => v ?? '';

  for (const area of data.areas) {
    if (!area.tienePromedioGeneral) {
      // Área de un solo curso → una fila.
      const unico = area.cursos[0];
      const mismoNombre = unico && unico.curso.toUpperCase() === area.area_nombre.toUpperCase();
      const gradeCells = [
        ...data.bimestres.map((b) => cell(gv(unico?.literalPorBim[b] ?? null), { align: AlignmentType.CENTER, bold: true, size: 18, width: cBim })),
        cell(gv(unico?.literalAnual ?? null), { align: AlignmentType.CENTER, bold: true, size: 18, fill: GREEN, width: cAnual }),
      ];
      gradeRows.push(new TableRow({ children: mismoNombre
        ? [cell(area.area_nombre, { colSpan: 2, bold: true, size: 18 }), ...gradeCells]
        : [cell(area.area_nombre, { bold: true, size: 18, width: cArea }), cell(unico?.curso ?? '', { size: 17, width: cCurso }), ...gradeCells],
      }));
      continue;
    }

    // Área con varios cursos → fila por curso + fila PROMEDIO GENERAL.
    area.cursos.forEach((curso, i) => {
      const cells: InstanceType<typeof TableCell>[] = [];
      if (i === 0) {
        cells.push(cell(area.area_nombre, { rowSpan: area.cursos.length, bold: true, size: 18, width: cArea, vAlign: VerticalAlign.CENTER }));
      }
      cells.push(cell(curso.curso, { size: 17, width: cCurso }));
      data.bimestres.forEach((b) => cells.push(cell(gv(curso.literalPorBim[b]), { align: AlignmentType.CENTER, bold: true, size: 18, width: cBim })));
      cells.push(cell(gv(curso.literalAnual), { align: AlignmentType.CENTER, bold: true, size: 18, fill: GREEN, width: cAnual }));
      gradeRows.push(new TableRow({ children: cells }));
    });

    gradeRows.push(new TableRow({ children: [
      cell('PROMEDIO GENERAL', { colSpan: 2, bold: true, align: AlignmentType.CENTER, size: 17, fill: HEADGRAY }),
      ...data.bimestres.map((b) => cell(gv(area.generalPorBim[b]), { align: AlignmentType.CENTER, bold: true, size: 18, fill: HEADGRAY, width: cBim })),
      cell(gv(area.generalAnual), { align: AlignmentType.CENTER, bold: true, size: 18, fill: GREEN, width: cAnual }),
    ] }));
  }

  children.push(new Table({
    width: { size: USABLE, type: WidthType.DXA },
    columnWidths: gradeCols,
    layout: TableLayoutType.FIXED,
    borders: allBorders,
    rows: gradeRows,
  }));
  children.push(para('', { size: 10 }));

  // ── ASISTENCIA Y PUNTUALIDAD (datos reales) ────────────────────
  const aLbl1 = 1900, aLbl2 = 3400, aBim = Math.round((USABLE - aLbl1 - aLbl2) / 4);
  const asisRows = [
    { et: 'TARDANZA', get: (b: number) => data.asistencia.find((x) => x.bimestre === b)?.tardanza ?? 0 },
    { et: 'FALTAS JUSTIFICADAS', get: (b: number) => data.asistencia.find((x) => x.bimestre === b)?.faltas_just ?? 0 },
    { et: 'FALTAS INJUSTIFICADAS', get: (b: number) => data.asistencia.find((x) => x.bimestre === b)?.faltas_injust ?? 0 },
  ];
  children.push(new Table({
    width: { size: USABLE, type: WidthType.DXA },
    columnWidths: [aLbl1, aLbl2, aBim, aBim, aBim, aBim],
    layout: TableLayoutType.FIXED,
    borders: allBorders,
    rows: [
      new TableRow({ children: [
        cell('', { colSpan: 2, fill: 'FFFFFF' }),
        hcell('BIMESTRE', { colSpan: 4, fill: BLUEHDR }),
      ] }),
      new TableRow({ children: [
        cell('', { colSpan: 2, fill: 'FFFFFF' }),
        ...data.bimestres.map((b) => hcell(ROMANOS[b] ?? String(b), { fill: BLUEHDR })),
      ] }),
      ...asisRows.map((r, idx) => new TableRow({ children: [
        idx === 0
          ? cell('ASISTENCIA Y PUNTUALIDAD', { rowSpan: 3, bold: true, fill: HEADGRAY, align: AlignmentType.CENTER, size: 16, width: aLbl1 })
          : (undefined as never),
        cell(r.et, { size: 16, width: aLbl2 }),
        ...data.bimestres.map((b) => cell(String(r.get(b)), { align: AlignmentType.CENTER, size: 17, width: aBim })),
      ].filter(Boolean) as InstanceType<typeof TableCell>[] })),
    ],
  }));
  children.push(para('', { size: 8 }));

  // ── EVALUACIÓN GENERAL (en blanco para llenar) ─────────────────
  pushCriteriosTable(children, docx, { USABLE, allBorders, HEADGRAY, BLUEHDR, ROMANOS }, {
    titulo: 'EVALUACIÓN GENERAL', primeraCol: '', criterios: CRITERIOS_GENERAL, bimestres: data.bimestres,
  });
  children.push(para('', { size: 8 }));

  // ── EVALUACIÓN DEL PADRE DE FAMILIA (en blanco) ────────────────
  pushCriteriosTable(children, docx, { USABLE, allBorders, HEADGRAY, BLUEHDR, ROMANOS }, {
    titulo: 'EVALUACIÓN DEL PADRE DE FAMILIA', primeraCol: 'CRITERIOS', criterios: CRITERIOS_PADRE, bimestres: data.bimestres,
  });
  children.push(para('', { size: 8 }));

  // ── CONCLUSIÓN DESCRIPTIVA POR PERIODO (en blanco) ─────────────
  const ccBim = 1500;
  children.push(new Table({
    width: { size: USABLE, type: WidthType.DXA },
    columnWidths: [ccBim, USABLE - ccBim],
    layout: TableLayoutType.FIXED,
    borders: allBorders,
    rows: [
      new TableRow({ tableHeader: true, children: [
        hcell('BIMESTRE', { fill: HEADGRAY }),
        hcell('CONCLUSIÓN DESCRIPTIVA POR PERIODO', { fill: HEADGRAY }),
      ] }),
      ...data.bimestres.map((b) => new TableRow({ children: [
        cell(ROMANOS[b] ?? String(b), { align: AlignmentType.CENTER, bold: true, fill: BLUEHDR, size: 18, width: ccBim }),
        cell('', { size: 18, width: USABLE - ccBim }),
      ] })),
    ],
  }));
  children.push(para('', { size: 20 }));

  // ── Firmas ─────────────────────────────────────────────────────
  const sigCol = Math.round(USABLE / 2) - 400;
  const firmaBox = (etiqueta: string) => new TableCell({
    width: { size: sigCol, type: WidthType.DXA },
    borders: allBorders,
    margins: { top: 40, bottom: 20, left: 70, right: 70 },
    children: [
      para('', { size: 40 }), para('', { size: 20 }),
      para(etiqueta, { align: AlignmentType.CENTER, bold: true, size: 16 }),
    ],
  });
  children.push(new Table({
    width: { size: USABLE, type: WidthType.DXA },
    columnWidths: [sigCol, USABLE - 2 * sigCol, sigCol],
    layout: TableLayoutType.FIXED,
    borders: noBorders,
    rows: [new TableRow({ children: [
      firmaBox('TUTOR (A)'),
      new TableCell({ width: { size: USABLE - 2 * sigCol, type: WidthType.DXA }, borders: noBorders, children: [para('')] }),
      firmaBox('FIRMA Y SELLO DE DIRECCIÓN'),
    ] })],
  }));

  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } } },
      children,
    }],
  });
  return Packer.toBuffer(doc);
}

/** Tabla de criterios (evaluación general / padre de familia) con celdas en blanco. */
function pushCriteriosTable(
  children: any[],
  docx: typeof import('docx'),
  cfg: { USABLE: number; allBorders: any; HEADGRAY: string; BLUEHDR: string; ROMANOS: Record<number, string> },
  opts: { titulo: string; primeraCol: string; criterios: string[]; bimestres: number[] },
) {
  const { Table, TableRow, TableCell, Paragraph, TextRun, WidthType, AlignmentType, ShadingType, VerticalAlign, TableLayoutType } = docx;
  const { USABLE, allBorders, HEADGRAY, BLUEHDR, ROMANOS } = cfg;
  const cCrit = Math.round(USABLE * 0.62), cBim = Math.round((USABLE - cCrit) / 4);

  const mk = (text: string, o: { bold?: boolean; fill?: string; align?: any; colSpan?: number; size?: number; width?: number } = {}) =>
    new TableCell({
      width: o.width ? { size: o.width, type: WidthType.DXA } : undefined,
      columnSpan: o.colSpan,
      verticalAlign: VerticalAlign.CENTER,
      shading: o.fill ? { type: ShadingType.CLEAR, color: 'auto', fill: o.fill } : undefined,
      margins: { top: 20, bottom: 20, left: 70, right: 70 },
      children: [new Paragraph({ alignment: o.align ?? AlignmentType.LEFT, spacing: { before: 8, after: 8 },
        children: [new TextRun({ text, bold: o.bold, size: o.size ?? 16, font: 'Calibri' })] })],
    });

  children.push(new Table({
    width: { size: USABLE, type: WidthType.DXA },
    columnWidths: [cCrit, cBim, cBim, cBim, cBim],
    layout: TableLayoutType.FIXED,
    borders: allBorders,
    rows: [
      new TableRow({ tableHeader: true, children: [
        mk(opts.titulo, { bold: true, fill: HEADGRAY, align: AlignmentType.CENTER, size: 17, width: cCrit }),
        mk('BIMESTRE', { colSpan: 4, bold: true, fill: BLUEHDR, align: AlignmentType.CENTER, size: 17 }),
      ] }),
      new TableRow({ tableHeader: true, children: [
        mk(opts.primeraCol, { bold: true, fill: HEADGRAY, align: AlignmentType.CENTER, width: cCrit }),
        ...opts.bimestres.map((b) => mk(ROMANOS[b] ?? String(b), { bold: true, fill: BLUEHDR, align: AlignmentType.CENTER, width: cBim })),
      ] }),
      ...opts.criterios.map((c) => new TableRow({ children: [
        mk(c, { width: cCrit }),
        ...opts.bimestres.map(() => mk('', { align: AlignmentType.CENTER, width: cBim })),
      ] })),
    ],
  }));
}
