// ============================================================
//  pdf/simulacro.builder.ts
//  Genera los PDFs del Simulacro de Admisión con pdfkit:
//   - Cuestionario A4 a 2 columnas (sin respuestas).
//   - Balotario (clave de respuestas) con numeración global.
// ============================================================
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { ExamenPdfData } from '@/modules/simulacros/simulacro.service';

const LETRAS = ['A', 'B', 'C', 'D', 'E'];

// A4 (pt). pdfkit usa 595.28 x 841.89.
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 40;
const GUTTER = 22;
const COL_W = (PAGE_W - MARGIN * 2 - GUTTER) / 2;
const BOTTOM = PAGE_H - MARGIN;

const NAVY = '#1e3a5f';
const GRAY = '#64748b';
const DARK = '#1e293b';

async function loadPdfKit(): Promise<any> {
  try {
    return (await import('pdfkit')).default;
  } catch {
    throw new Error('pdfkit no está instalado en el backend.');
  }
}

/** Descarga imágenes de los enunciados (con timeout) para embeberlas. */
async function prefetchImages(data: ExamenPdfData): Promise<Map<string, Buffer>> {
  const urls = new Set<string>();
  for (const c of data.cursos) for (const p of c.preguntas) if (p.imagen_url) urls.add(p.imagen_url);

  const map = new Map<string, Buffer>();
  await Promise.all(
    [...urls].map(async (url) => {
      try {
        let buf: Buffer | null = null;
        const pathname = (() => { try { return new URL(url).pathname; } catch { return url; } })();

        if (pathname.startsWith('/uploads/')) {
          // Imagen subida localmente: leer del disco (evita un self-request
          // al propio servidor, que en dev se bloquea).
          buf = await readFile(path.join(process.cwd(), 'public', pathname));
        } else {
          // Imagen remota (http/https): descargar con timeout.
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 4000);
          const res = await fetch(url, { signal: ctrl.signal });
          clearTimeout(t);
          if (!res.ok) return;
          const ct = res.headers.get('content-type') ?? '';
          if (!ct.startsWith('image/')) return;
          buf = Buffer.from(await res.arrayBuffer());
        }
        if (buf && buf.length > 0 && buf.length < 5_000_000) map.set(url, buf);
      } catch {
        /* imagen omitida si falla la carga */
      }
    }),
  );
  return map;
}

function pageHeader(doc: any, data: ExamenPdfData, subtitulo: string) {
  doc.rect(MARGIN, MARGIN, PAGE_W - MARGIN * 2, 46).fillColor(NAVY).fill();
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(13)
    .text(data.simulacro, MARGIN + 12, MARGIN + 8, { width: PAGE_W - MARGIN * 2 - 24 });
  doc.font('Helvetica').fontSize(9)
    .text(`${data.nivel} · ${data.grado}  —  ${subtitulo}`, MARGIN + 12, MARGIN + 28);
  return MARGIN + 46 + 14;
}

// ── Cuestionario (2 columnas) ──────────────────────────────────────
export async function buildCuestionarioPdf(data: ExamenPdfData): Promise<Buffer> {
  const PDFDocument = await loadPdfKit();
  const images = await prefetchImages(data);

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: MARGIN, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    let colTop = pageHeader(doc, data, 'Cuestionario');
    const colX = [MARGIN, MARGIN + COL_W + GUTTER];
    let col = 0;
    let y = colTop;

    const nextColumn = () => {
      if (col === 0) { col = 1; y = colTop; }
      else { doc.addPage(); colTop = MARGIN; col = 0; y = colTop; }
    };

    const measureBlock = (curso: string | null, q?: ExamenPdfData['cursos'][number]['preguntas'][number]) => {
      let h = 0;
      if (curso) { doc.font('Helvetica-Bold').fontSize(10); h += doc.heightOfString(curso, { width: COL_W }) + 6; }
      if (q) {
        doc.font('Helvetica-Bold').fontSize(9);
        h += doc.heightOfString(`${q.numero}. ${q.enunciado}`, { width: COL_W }) + 4;
        if (q.imagen_url && images.has(q.imagen_url)) h += 96 + 4;
        doc.font('Helvetica').fontSize(9);
        for (let i = 0; i < 5; i++) h += doc.heightOfString(`${LETRAS[i]}) ${q.alternativas[i]}`, { width: COL_W - 10 }) + 2;
        h += 8;
      }
      return h;
    };

    for (const curso of data.cursos) {
      // Encabezado de curso
      const ch = measureBlock(curso.nombre);
      if (y + ch > BOTTOM) nextColumn();
      doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(10)
        .text(curso.nombre.toUpperCase(), colX[col], y, { width: COL_W });
      y += ch;

      for (const q of curso.preguntas) {
        const bh = measureBlock(null, q);
        if (y + bh > BOTTOM) nextColumn();
        const x = colX[col];

        doc.fillColor(DARK).font('Helvetica-Bold').fontSize(9)
          .text(`${q.numero}. ${q.enunciado}`, x, y, { width: COL_W });
        y = doc.y + 4;

        if (q.imagen_url && images.has(q.imagen_url)) {
          try {
            doc.image(images.get(q.imagen_url)!, x, y, { fit: [COL_W, 92], align: 'center' });
          } catch { /* ignora imagen que pdfkit no pueda decodificar */ }
          y += 96;
        }

        doc.font('Helvetica').fontSize(9).fillColor('#334155');
        for (let i = 0; i < 5; i++) {
          doc.text(`${LETRAS[i]}) ${q.alternativas[i]}`, x + 8, y, { width: COL_W - 10 });
          y = doc.y + 2;
        }
        y += 8;
      }
    }

    doc.end();
  });
}

// ── Balotario (clave de respuestas) ────────────────────────────────
export async function buildBalotarioPdf(data: ExamenPdfData): Promise<Buffer> {
  const PDFDocument = await loadPdfKit();

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: MARGIN, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    let y = pageHeader(doc, data, 'Balotario (clave de respuestas)');
    const W = PAGE_W - MARGIN * 2;

    for (const curso of data.cursos) {
      if (y + 40 > BOTTOM) { doc.addPage(); y = MARGIN; }
      // Encabezado de curso con su rango global
      doc.rect(MARGIN, y, W, 20).fillColor('#f1f5f9').fill();
      doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(10)
        .text(`${curso.nombre}  (preguntas ${curso.desde}–${curso.hasta})`, MARGIN + 6, y + 5);
      y += 26;

      // Respuestas en 5 columnas
      const cellW = W / 5;
      doc.font('Helvetica-Bold').fontSize(11);
      curso.preguntas.forEach((q, i) => {
        const cx = MARGIN + (i % 5) * cellW;
        doc.fillColor(DARK).text(`${q.numero}.`, cx, y, { continued: true })
          .fillColor('#059669').text(` ${q.respuesta}`);
      });
      y += 22;
      doc.moveDown(0.2);
    }

    doc.fillColor(GRAY).font('Helvetica').fontSize(8)
      .text(`Total de preguntas: ${data.total}`, MARGIN, BOTTOM - 14);

    doc.end();
  });
}
