// ============================================================
//  word/libreta.docx.builder.ts
//  Genera la libreta como documento Word (.docx) EDITABLE, con el
//  formato oficial MINEDU "Informe de Progreso del Aprendizaje del
//  Estudiante" (referencia: resources/boleta-2021.docx).
//
//  El personal puede abrirlo en Word y completar lo que falte
//  (conclusiones, asistencia, firmas).
//
//  Requiere la dependencia `docx`. Si no está instalada, el endpoint
//  devuelve un error claro (igual que pdfkit en el builder PDF).
// ============================================================
import type { LibretaRow } from '@/modules/libretas/libreta.repository';

/** Mismo contrato que el builder PDF: institución + estudiante + secciones. */
export interface LibretaDocxMeta {
  institucion?: {
    nombre?: string | null;
    codigo_modular?: string | null;
    codigo_ugel?: string | null;
    nombre_ugel?: string | null;
    departamento?: string | null;
    modalidad?: string | null;
  };
  nivel?: string | null;
  dni?: string | null;
  codigo_estudiante?: string | null;
  anio?: number | string | null;
  periodos?: number[];
  conclusiones?: { periodo: number; texto: string }[];
  asistencia?: {
    periodo: number;
    inasist_just: number;
    inasist_injust: number;
    tard_just: number;
    tard_injust: number;
  }[];
}

interface AreaGroup {
  area: string;
  competencias: {
    nombre: string;
    notas: Map<number, { vigesimal: number | null; literal: string | null }>;
  }[];
}

function agruparPorArea(rows: LibretaRow[]): AreaGroup[] {
  const map = new Map<string, AreaGroup>();
  for (const row of rows) {
    if (!map.has(row.curso)) map.set(row.curso, { area: row.curso, competencias: [] });
    const grupo = map.get(row.curso)!;
    let comp = grupo.competencias.find((c) => c.nombre === row.competencia);
    if (!comp) {
      comp = { nombre: row.competencia, notas: new Map() };
      grupo.competencias.push(comp);
    }
    comp.notas.set(row.bimestre, { vigesimal: row.nota_vigesimal, literal: row.nota_literal });
  }
  return Array.from(map.values());
}

function bimestresPresentes(rows: LibretaRow[]): number[] {
  return [...new Set(rows.map((r) => r.bimestre))].sort((a, b) => a - b);
}

function vigToLiteral(v: number): string {
  if (v >= 18) return 'AD';
  if (v >= 14) return 'A';
  if (v >= 11) return 'B';
  return 'C';
}

function areaCalif(comps: AreaGroup['competencias'], periodo: number): string {
  const vals = comps
    .map((c) => c.notas.get(periodo)?.vigesimal)
    .filter((v): v is number => v !== null && v !== undefined);
  if (vals.length === 0) return '';
  return vigToLiteral(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function areaCalifFinal(comps: AreaGroup['competencias'], periodos: number[]): string {
  const periodAvgs: number[] = [];
  for (const p of periodos) {
    const vals = comps
      .map((c) => c.notas.get(p)?.vigesimal)
      .filter((v): v is number => v !== null && v !== undefined);
    if (vals.length > 0) {
      periodAvgs.push(vals.reduce((a, b) => a + b, 0) / vals.length);
    }
  }
  if (periodAvgs.length === 0) return '';
  return vigToLiteral(periodAvgs.reduce((a, b) => a + b, 0) / periodAvgs.length);
}

export async function buildLibretaDocx(
  rows: LibretaRow[],
  meta: LibretaDocxMeta = {},
): Promise<Buffer> {
  // Import dinámico — no rompe el build si `docx` no está instalado.
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

  const info     = rows[0];
  const areas    = agruparPorArea(rows);
  const periodos = meta.periodos && meta.periodos.length ? meta.periodos : bimestresPresentes(rows);
  const inst     = meta.institucion ?? {};

  // ── Paleta y medidas (twips) ───────────────────────────────────
  const NAVY = '1E3A5F', AREABG = 'E2E8F0', LABELBG = 'F1F5F9', WHITE = 'FFFFFF', INK = '0F172A';
  const FONT = 'Arial';
  const LINE = '94A3B8';
  const PAGE_W = 11906, MARGIN = 567;       // A4, 1 cm
  const USABLE = PAGE_W - 2 * MARGIN;       // ~10772

  const thin = { style: BorderStyle.SINGLE, size: 4, color: LINE };
  const none = { style: BorderStyle.NONE, size: 0, color: WHITE };
  const allBorders   = { top: thin, bottom: thin, left: thin, right: thin, insideHorizontal: thin, insideVertical: thin };
  const noBorders    = { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none };

  // ── Helpers de celda/párrafo ───────────────────────────────────
  function para(text: string, o: { align?: any; bold?: boolean; size?: number; color?: string } = {}) {
    return new Paragraph({
      alignment: o.align,
      spacing: { before: 10, after: 10 },
      children: [new TextRun({ text: text ?? '', bold: o.bold, size: o.size ?? 15, color: o.color ?? INK, font: FONT })],
    });
  }
  function cell(text: string, o: {
    align?: any; bold?: boolean; size?: number; color?: string; fill?: string;
    colSpan?: number; rowSpan?: number; width?: number;
  } = {}) {
    return new TableCell({
      width: o.width ? { size: o.width, type: WidthType.DXA } : undefined,
      columnSpan: o.colSpan,
      rowSpan: o.rowSpan,
      verticalAlign: VerticalAlign.CENTER,
      shading: o.fill ? { type: ShadingType.CLEAR, color: 'auto', fill: o.fill } : undefined,
      margins: { top: 20, bottom: 20, left: 60, right: 60 },
      children: [para(text, { align: o.align, bold: o.bold, size: o.size, color: o.color })],
    });
  }
  const hcell = (text: string, o: { colSpan?: number; rowSpan?: number; width?: number } = {}) =>
    cell(text, { ...o, bold: true, color: WHITE, fill: NAVY, align: AlignmentType.CENTER, size: 14 });

  const children: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = [];

  // ── Encabezado ─────────────────────────────────────────────────
  children.push(para('MINISTERIO DE EDUCACIÓN', { align: AlignmentType.CENTER, color: '475569', size: 16 }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
    children: [new TextRun({
      text: `INFORME DE PROGRESO DEL APRENDIZAJE DEL ESTUDIANTE${meta.anio ? ` — ${meta.anio}` : ''}`,
      bold: true, size: 24, color: INK, font: FONT,
    })],
  }));

  // ── Grilla de datos (institución + estudiante) ─────────────────
  const lw = Math.round(USABLE * 0.20), vw = Math.round(USABLE * 0.30);
  const lbl = (t: string, span?: number) => cell(t, { bold: true, fill: LABELBG, size: 14, width: lw, colSpan: span });
  const val = (t: string, span?: number, width?: number) => cell(t, { size: 14, width: width ?? vw, colSpan: span });
  const infoTable = new Table({
    width: { size: USABLE, type: WidthType.DXA },
    columnWidths: [lw, vw, lw, vw],
    layout: TableLayoutType.FIXED,
    borders: allBorders,
    rows: [
      new TableRow({ children: [lbl('DRE'), val(inst.departamento ?? ''), lbl('UGEL'), val([inst.codigo_ugel, inst.nombre_ugel].filter(Boolean).join(' · '))] }),
      new TableRow({ children: [lbl('Nivel'), val(meta.nivel ?? 'SECUNDARIA'), lbl('Código Modular'), val(inst.codigo_modular ?? '')] }),
      new TableRow({ children: [lbl('Institución Educativa'), val(inst.nombre ?? '', 3, USABLE - lw)] }),
      new TableRow({ children: [lbl('Grado'), val(info?.grado ?? ''), lbl('Sección'), val(info?.seccion ?? '')] }),
      new TableRow({ children: [lbl('Apellidos y nombres del estudiante'), val(info?.alumno_nombre ?? '', 3, USABLE - lw)] }),
      new TableRow({ children: [lbl('Código del estudiante'), val(meta.codigo_estudiante ?? ''), lbl('DNI'), val(meta.dni ?? '')] }),
    ],
  });
  children.push(infoTable);
  children.push(para('', { size: 8 }));

  // ── Tabla de notas ─────────────────────────────────────────────
  const cArea = 1700, cFinal = 950, perW = 720;
  const compW = USABLE - cArea - cFinal - perW * periodos.length;
  const gradeCols = [cArea, compW, ...periodos.map(() => perW), cFinal];

  const gradeRows: InstanceType<typeof TableRow>[] = [
    new TableRow({
      tableHeader: true,
      children: [
        hcell('ÁREA CURRICULAR', { rowSpan: 2, width: cArea }),
        hcell('COMPETENCIAS', { rowSpan: 2, width: compW }),
        hcell('CALIFICATIVO POR PERIODO', { colSpan: periodos.length }),
        hcell('Calif. final del área', { rowSpan: 2, width: cFinal }),
      ],
    }),
    new TableRow({ tableHeader: true, children: periodos.map((p) => hcell(String(p), { width: perW })) }),
  ];

  let zebra = false;
  for (const grupo of areas) {
    const fill = zebra ? LABELBG : undefined;
    zebra = !zebra;
    const K = grupo.competencias.length;

    grupo.competencias.forEach((comp, idx) => {
      const cells: InstanceType<typeof TableCell>[] = [];
      if (idx === 0) {
        cells.push(cell(grupo.area, { rowSpan: K + 1, bold: true, color: NAVY, fill, width: cArea, align: AlignmentType.LEFT }));
      }
      cells.push(cell(comp.nombre, { size: 14, fill, width: compW, align: AlignmentType.LEFT }));
      periodos.forEach((p) => {
        const n = comp.notas.get(p);
        const txt = n?.literal ?? (n?.vigesimal != null ? String(Math.round(n.vigesimal)) : '');
        cells.push(cell(txt, { bold: true, size: 16, align: AlignmentType.CENTER, fill, width: perW }));
      });
      cells.push(cell('', { fill, width: cFinal }));
      gradeRows.push(new TableRow({ children: cells }));
    });

    // Fila CALIFICATIVO DE ÁREA (la celda de área queda fusionada arriba)
    gradeRows.push(new TableRow({
      children: [
        cell('CALIFICATIVO DE ÁREA', { bold: true, size: 13, align: AlignmentType.RIGHT, fill: AREABG, width: compW }),
        ...periodos.map((p) => cell(areaCalif(grupo.competencias, p), { bold: true, size: 16, align: AlignmentType.CENTER, fill: AREABG, width: perW })),
        cell(areaCalifFinal(grupo.competencias, periodos), { bold: true, size: 16, align: AlignmentType.CENTER, fill: AREABG, width: cFinal }),
      ],
    }));
  }

  children.push(new Table({
    width: { size: USABLE, type: WidthType.DXA },
    columnWidths: gradeCols,
    layout: TableLayoutType.FIXED,
    borders: allBorders,
    rows: gradeRows,
  }));
  children.push(para('', { size: 10 }));

  // ── Conclusiones descriptivas ──────────────────────────────────
  children.push(para('Conclusiones descriptivas', { bold: true, size: 18 }));
  const pcol = 1100, ccol = USABLE - pcol;
  children.push(new Table({
    width: { size: USABLE, type: WidthType.DXA },
    columnWidths: [pcol, ccol],
    layout: TableLayoutType.FIXED,
    borders: allBorders,
    rows: [
      new TableRow({ tableHeader: true, children: [hcell('Periodo', { width: pcol }), hcell('Conclusión descriptiva por periodo', { width: ccol })] }),
      ...periodos.map((p) => new TableRow({
        children: [
          cell(String(p), { align: AlignmentType.CENTER, width: pcol }),
          cell(meta.conclusiones?.find((c) => c.periodo === p)?.texto ?? '   ', { width: ccol, align: AlignmentType.LEFT }),
        ],
      })),
    ],
  }));
  children.push(para('', { size: 10 }));

  // ── Resumen de asistencia ──────────────────────────────────────
  children.push(para('Resumen de asistencia del estudiante', { bold: true, size: 18 }));
  const aP = 1100, aGrp = Math.round((USABLE - aP) / 2), aSub = Math.round(aGrp / 2);
  children.push(new Table({
    width: { size: USABLE, type: WidthType.DXA },
    columnWidths: [aP, aSub, aSub, aSub, aSub],
    layout: TableLayoutType.FIXED,
    borders: allBorders,
    rows: [
      new TableRow({ tableHeader: true, children: [
        hcell('Periodo', { rowSpan: 2, width: aP }),
        hcell('Inasistencias', { colSpan: 2 }),
        hcell('Tardanzas', { colSpan: 2 }),
      ] }),
      new TableRow({ tableHeader: true, children: [
        hcell('Justificadas', { width: aSub }), hcell('Injustificadas', { width: aSub }),
        hcell('Justificadas', { width: aSub }), hcell('Injustificadas', { width: aSub }),
      ] }),
      ...periodos.map((p) => {
        const a = meta.asistencia?.find((x) => x.periodo === p);
        const v = (n?: number) => (n != null ? String(n) : '   ');
        return new TableRow({ children: [
          cell(String(p), { align: AlignmentType.CENTER, width: aP }),
          cell(v(a?.inasist_just), { align: AlignmentType.CENTER, width: aSub }),
          cell(v(a?.inasist_injust), { align: AlignmentType.CENTER, width: aSub }),
          cell(v(a?.tard_just), { align: AlignmentType.CENTER, width: aSub }),
          cell(v(a?.tard_injust), { align: AlignmentType.CENTER, width: aSub }),
        ] });
      }),
    ],
  }));
  children.push(para('', { size: 16 }));

  // ── Firmas (tabla sin bordes) ──────────────────────────────────
  const sigCol = Math.round(USABLE / 2);
  const sigCell = (linea: string, etiqueta: string) =>
    new TableCell({
      width: { size: sigCol, type: WidthType.DXA },
      borders: noBorders,
      children: [
        para(linea, { align: AlignmentType.CENTER, color: '94A3B8' }),
        para(etiqueta, { align: AlignmentType.CENTER, size: 14, color: '475569' }),
      ],
    });
  children.push(new Table({
    width: { size: USABLE, type: WidthType.DXA },
    columnWidths: [sigCol, sigCol],
    layout: TableLayoutType.FIXED,
    borders: noBorders,
    rows: [new TableRow({ children: [
      sigCell('______________________________', 'Firma y sello del Docente o Tutor(a)'),
      sigCell('______________________________', 'Firma y sello del Director(a)'),
    ] })],
  }));

  // ── Escala + pie ───────────────────────────────────────────────
  children.push(para('Escala:  AD (18–20) Logro destacado  ·  A (14–17) Logro esperado  ·  B (11–13) En proceso  ·  C (00–10) En inicio',
    { size: 13, color: '475569' }));
  children.push(para(`Generado el ${new Date().toLocaleDateString('es-PE')} — SGEI`, { size: 13, color: '475569', align: AlignmentType.RIGHT }));

  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } } },
      children,
    }],
  });

  return Packer.toBuffer(doc);
}
