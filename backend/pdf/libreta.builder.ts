// ============================================================
//  pdf/libreta.builder.ts
//  Genera el PDF de la libreta con el formato oficial MINEDU
//  "Informe de Progreso del Aprendizaje del Estudiante".
//
//  Compatibilidad: buildLibretaPdf(rows) sigue funcionando; el
//  parámetro `meta` es OPCIONAL y enriquece la cabecera y las
//  secciones (institución, DNI/código, conclusiones, asistencia).
//
//  INSTALACIÓN REQUERIDA:  pnpm add pdfkit @types/pdfkit --filter backend
//  Si pdfkit no está instalado, el endpoint devuelve 503.
// ============================================================
import type { LibretaRow } from '@/modules/libretas/libreta.repository';

/** Datos contextuales (institución, estudiante, secciones) para la cabecera. */
export interface LibretaPdfMeta {
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
  /** Números de periodo (bimestre) a mostrar como columnas. */
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

/** Vigesimal → literal según la escala estándar MINEDU. */
function vigToLiteral(v: number): string {
  if (v >= 18) return 'AD';
  if (v >= 14) return 'A';
  if (v >= 11) return 'B';
  return 'C';
}

/** Calificativo de área en un periodo = literal del promedio de sus competencias. */
function areaCalif(comps: AreaGroup['competencias'], periodo: number): string {
  const vals = comps
    .map((c) => c.notas.get(periodo)?.vigesimal)
    .filter((v): v is number => v !== null && v !== undefined);
  if (vals.length === 0) return '';
  return vigToLiteral(vals.reduce((a, b) => a + b, 0) / vals.length);
}

/** Calificativo final del área = literal del promedio de todas sus notas. */
function areaCalifFinal(comps: AreaGroup['competencias'], periodos: number[]): string {
  const vals: number[] = [];
  for (const c of comps) {
    for (const p of periodos) {
      const v = c.notas.get(p)?.vigesimal;
      if (v !== null && v !== undefined) vals.push(v);
    }
  }
  if (vals.length === 0) return '';
  return vigToLiteral(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export async function buildLibretaPdf(
  rows: LibretaRow[],
  meta: LibretaPdfMeta = {},
): Promise<Buffer> {
  // Dynamic import — no rompe el build si pdfkit no está instalado.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let PDFDocument: any;
  try {
    PDFDocument = (await import('pdfkit')).default;
  } catch {
    throw new Error('pdfkit no está instalado. Ejecuta: npm install pdfkit');
  }

  const info     = rows[0];
  const areas    = agruparPorArea(rows);
  const periodos = meta.periodos && meta.periodos.length ? meta.periodos : bimestresPresentes(rows);
  const inst     = meta.institucion ?? {};

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 36, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const LEFT   = 36;
    const W      = doc.page.width - 72; // ~523
    const BOTTOM = doc.page.height - 40;

    const INK    = '#0f172a';
    const SUB    = '#475569';
    const LINE   = '#94a3b8';
    const HEADBG = '#1e3a5f';
    const ZEBRA  = '#f1f5f9';
    const AREABG = '#e2e8f0';
    const PAD    = 3;

    // ── Helpers de tabla ────────────────────────────────────────
    function cellHeight(text: string, w: number, font: string, size: number, minH: number): number {
      doc.font(font).fontSize(size);
      const h = doc.heightOfString(text || ' ', { width: w - 2 * PAD });
      return Math.max(minH, h + 2 * PAD);
    }

    function drawCell(
      x: number, y: number, w: number, h: number,
      opts: {
        text?: string; align?: 'left' | 'center' | 'right';
        font?: string; size?: number; color?: string;
        fill?: string; vcenter?: boolean;
      } = {},
    ) {
      if (opts.fill) doc.rect(x, y, w, h).fill(opts.fill);
      doc.rect(x, y, w, h).lineWidth(0.5).stroke(LINE);
      if (opts.text) {
        const font = opts.font ?? 'Helvetica';
        const size = opts.size ?? 7.5;
        doc.font(font).fontSize(size).fillColor(opts.color ?? INK);
        let ty = y + PAD;
        if (opts.vcenter) {
          const th = doc.heightOfString(opts.text, { width: w - 2 * PAD });
          ty = y + Math.max(PAD, (h - th) / 2);
        }
        doc.text(opts.text, x + PAD, ty, { width: w - 2 * PAD, align: opts.align ?? 'left' });
      }
    }

    function ensure(h: number) {
      if (doc.y + h > BOTTOM) {
        doc.addPage();
        doc.y = 36;
      }
    }

    // ── Encabezado oficial ──────────────────────────────────────
    doc.fillColor(SUB).font('Helvetica').fontSize(8)
       .text('MINISTERIO DE EDUCACIÓN', LEFT, 30, { width: W, align: 'center' });
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(12)
       .text(
         `INFORME DE PROGRESO DEL APRENDIZAJE DEL ESTUDIANTE${meta.anio ? ` — ${meta.anio}` : ''}`,
         LEFT, 44, { width: W, align: 'center' },
       );
    doc.moveDown(0.6);

    // Grilla de datos (label/valor)
    let y = doc.y;
    const q1 = W * 0.18, q2 = W * 0.32, q3 = W * 0.18, q4 = W * 0.32;
    const gh = 15;
    const lbl = { font: 'Helvetica-Bold', size: 7, fill: ZEBRA, vcenter: true } as const;
    const val = { size: 7, vcenter: true } as const;

    function pairRow(l1: string, v1: string, l2: string, v2: string) {
      const h = Math.max(
        cellHeight(l1, q1, 'Helvetica-Bold', 7, gh), cellHeight(v1, q2, 'Helvetica', 7, gh),
        cellHeight(l2, q3, 'Helvetica-Bold', 7, gh), cellHeight(v2, q4, 'Helvetica', 7, gh),
      );
      drawCell(LEFT,            y, q1, h, { text: l1, ...lbl });
      drawCell(LEFT + q1,       y, q2, h, { text: v1, ...val });
      drawCell(LEFT + q1 + q2,  y, q3, h, { text: l2, ...lbl });
      drawCell(LEFT + q1 + q2 + q3, y, q4, h, { text: v2, ...val });
      y += h;
    }
    function fullRow(l: string, v: string) {
      const h = Math.max(cellHeight(l, q1, 'Helvetica-Bold', 7, gh), cellHeight(v, W - q1, 'Helvetica', 7, gh));
      drawCell(LEFT,      y, q1, h, { text: l, ...lbl });
      drawCell(LEFT + q1, y, W - q1, h, { text: v, ...val });
      y += h;
    }

    pairRow('DRE', inst.departamento ?? '', 'UGEL', [inst.codigo_ugel, inst.nombre_ugel].filter(Boolean).join(' · '));
    pairRow('Nivel', meta.nivel ?? 'SECUNDARIA', 'Código Modular', inst.codigo_modular ?? '');
    fullRow('Institución Educativa', inst.nombre ?? '');
    pairRow('Grado', info?.grado ?? '', 'Sección', info?.seccion ?? '');
    fullRow('Apellidos y nombres del estudiante', info?.alumno_nombre ?? '');
    pairRow('Código del estudiante', meta.codigo_estudiante ?? '', 'DNI', meta.dni ?? '');
    doc.y = y + 10;

    // ── Tabla de notas (área / competencias / periodos) ─────────
    const cArea  = 92;
    const cFinal = 44;
    const perW   = periodos.length ? Math.max(24, Math.min(40, Math.floor((W * 0.28) / periodos.length))) : 30;
    const compW  = W - cArea - cFinal - perW * periodos.length;

    function gradesHeader() {
      const hy = doc.y;
      const h1 = 16, h2 = 12, hh = h1 + h2;
      drawCell(LEFT, hy, cArea, hh, { text: 'ÁREA CURRICULAR', font: 'Helvetica-Bold', size: 7, color: '#fff', fill: HEADBG, align: 'center', vcenter: true });
      drawCell(LEFT + cArea, hy, compW, hh, { text: 'COMPETENCIAS', font: 'Helvetica-Bold', size: 7, color: '#fff', fill: HEADBG, align: 'center', vcenter: true });
      const calX = LEFT + cArea + compW;
      drawCell(calX, hy, perW * periodos.length, h1, { text: 'CALIFICATIVO POR PERIODO', font: 'Helvetica-Bold', size: 6.5, color: '#fff', fill: HEADBG, align: 'center', vcenter: true });
      periodos.forEach((p, i) =>
        drawCell(calX + i * perW, hy + h1, perW, h2, { text: String(p), font: 'Helvetica-Bold', size: 7, color: '#fff', fill: HEADBG, align: 'center', vcenter: true }),
      );
      drawCell(calX + perW * periodos.length, hy, cFinal, hh, { text: 'Calif. final del área', font: 'Helvetica-Bold', size: 6, color: '#fff', fill: HEADBG, align: 'center', vcenter: true });
      doc.y = hy + hh;
    }
    gradesHeader();

    let zebra = false;
    for (const grupo of areas) {
      const compRows = grupo.competencias.map((c) => ({
        comp: c,
        h: cellHeight(c.nombre, compW, 'Helvetica', 7, 14),
      }));
      const areaRowH = 13;
      const groupH = compRows.reduce((a, r) => a + r.h, 0) + areaRowH;

      // Salto de página: si el grupo no cabe, nueva página + recabecera.
      if (doc.y + Math.min(groupH, 70) > BOTTOM) {
        doc.addPage();
        doc.y = 36;
        gradesHeader();
      }

      const gy = doc.y;
      const fill = zebra ? ZEBRA : undefined;
      zebra = !zebra;

      // Celda de área (abarca todas sus competencias)
      drawCell(LEFT, gy, cArea, groupH, { text: grupo.area, font: 'Helvetica-Bold', size: 7, color: HEADBG, fill, align: 'left', vcenter: true });

      let cy = gy;
      for (const { comp, h } of compRows) {
        drawCell(LEFT + cArea, cy, compW, h, { text: comp.nombre, size: 7, fill });
        const calX = LEFT + cArea + compW;
        periodos.forEach((p, i) => {
          const n = comp.notas.get(p);
          const txt = n?.literal ?? (n?.vigesimal != null ? n.vigesimal.toFixed(0) : '');
          drawCell(calX + i * perW, cy, perW, h, { text: txt, font: 'Helvetica-Bold', size: 8, align: 'center', vcenter: true, fill });
        });
        drawCell(calX + perW * periodos.length, cy, cFinal, h, { fill });
        cy += h;
      }

      // Fila "CALIFICATIVO DE ÁREA"
      const calX = LEFT + cArea + compW;
      drawCell(LEFT + cArea, cy, compW, areaRowH, { text: 'CALIFICATIVO DE ÁREA', font: 'Helvetica-Bold', size: 6.5, align: 'right', vcenter: true, fill: AREABG });
      periodos.forEach((p, i) =>
        drawCell(calX + i * perW, cy, perW, areaRowH, { text: areaCalif(grupo.competencias, p), font: 'Helvetica-Bold', size: 8, align: 'center', vcenter: true, fill: AREABG }),
      );
      drawCell(calX + perW * periodos.length, cy, cFinal, areaRowH, { text: areaCalifFinal(grupo.competencias, periodos), font: 'Helvetica-Bold', size: 8, align: 'center', vcenter: true, fill: AREABG });
      doc.y = cy + areaRowH;
    }

    // ── Conclusiones descriptivas ───────────────────────────────
    doc.y += 12;
    ensure(50);
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(8.5)
       .text('Conclusiones descriptivas', LEFT, doc.y);
    doc.y += 4;
    {
      const pW = 56;
      let cyc = doc.y;
      drawCell(LEFT, cyc, pW, 14, { text: 'Periodo', font: 'Helvetica-Bold', size: 7, color: '#fff', fill: HEADBG, align: 'center', vcenter: true });
      drawCell(LEFT + pW, cyc, W - pW, 14, { text: 'Conclusión descriptiva por periodo', font: 'Helvetica-Bold', size: 7, color: '#fff', fill: HEADBG, vcenter: true });
      cyc += 14;
      for (const p of periodos) {
        const txt = meta.conclusiones?.find((c) => c.periodo === p)?.texto ?? '';
        const h = cellHeight(txt, W - pW, 'Helvetica', 7, 18);
        if (cyc + h > BOTTOM) { doc.addPage(); doc.y = 36; cyc = doc.y; }
        drawCell(LEFT, cyc, pW, h, { text: String(p), size: 7, align: 'center', vcenter: true });
        drawCell(LEFT + pW, cyc, W - pW, h, { text: txt, size: 7 });
        cyc += h;
      }
      doc.y = cyc;
    }

    // ── Resumen de asistencia del estudiante ────────────────────
    doc.y += 12;
    ensure(70);
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(8.5)
       .text('Resumen de asistencia del estudiante', LEFT, doc.y);
    doc.y += 4;
    {
      const pW = 56;
      const grp = (W - pW) / 2;
      const sub = grp / 2;
      let ay = doc.y;
      drawCell(LEFT, ay, pW, 24, { text: 'Periodo', font: 'Helvetica-Bold', size: 7, color: '#fff', fill: HEADBG, align: 'center', vcenter: true });
      drawCell(LEFT + pW, ay, grp, 12, { text: 'Inasistencias', font: 'Helvetica-Bold', size: 7, color: '#fff', fill: HEADBG, align: 'center', vcenter: true });
      drawCell(LEFT + pW + grp, ay, grp, 12, { text: 'Tardanzas', font: 'Helvetica-Bold', size: 7, color: '#fff', fill: HEADBG, align: 'center', vcenter: true });
      ['Justificadas', 'Injustificadas', 'Justificadas', 'Injustificadas'].forEach((l, i) =>
        drawCell(LEFT + pW + i * sub, ay + 12, sub, 12, { text: l, font: 'Helvetica-Bold', size: 6, color: '#fff', fill: HEADBG, align: 'center', vcenter: true }),
      );
      ay += 24;
      for (const p of periodos) {
        const a = meta.asistencia?.find((x) => x.periodo === p);
        const vals = [a?.inasist_just, a?.inasist_injust, a?.tard_just, a?.tard_injust]
          .map((v) => (v != null ? String(v) : ''));
        drawCell(LEFT, ay, pW, 14, { text: String(p), size: 7, align: 'center', vcenter: true });
        vals.forEach((v, i) => drawCell(LEFT + pW + i * sub, ay, sub, 14, { text: v, size: 7, align: 'center', vcenter: true }));
        ay += 14;
      }
      doc.y = ay;
    }

    // ── Firmas ──────────────────────────────────────────────────
    doc.y += 30;
    ensure(40);
    {
      const fy = doc.y;
      const colW = W / 2;
      doc.strokeColor(LINE).lineWidth(0.5);
      doc.moveTo(LEFT + 24, fy).lineTo(LEFT + colW - 24, fy).stroke();
      doc.moveTo(LEFT + colW + 24, fy).lineTo(LEFT + W - 24, fy).stroke();
      doc.fillColor(SUB).font('Helvetica').fontSize(7);
      doc.text('Firma y sello del Docente o Tutor(a)', LEFT, fy + 4, { width: colW, align: 'center' });
      doc.text('Firma y sello del Director(a)', LEFT + colW, fy + 4, { width: colW, align: 'center' });
      doc.y = fy + 20;
    }

    // ── Escala literal + pie ────────────────────────────────────
    ensure(24);
    doc.fillColor(SUB).font('Helvetica').fontSize(6.5).text(
      'Escala:  AD (18–20) Logro destacado  ·  A (14–17) Logro esperado  ·  B (11–13) En proceso  ·  C (00–10) En inicio',
      LEFT, doc.y, { width: W },
    );
    doc.fillColor(SUB).fontSize(6.5).text(
      `Generado el ${new Date().toLocaleDateString('es-PE')} — SGEI`,
      LEFT, doc.y + 2, { width: W, align: 'right' },
    );

    doc.end();
  });
}
