// ============================================================
//  POST /api/simulacros/activo/preguntas/imagen  (Docente)
//  Sube una imagen (pegada con Ctrl+V o seleccionada) para un
//  enunciado. Guarda en /public/uploads/simulacros y devuelve la
//  URL absoluta. No usa Supabase (no configurado en este entorno).
// ============================================================
import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { withRole } from '@/lib/auth';
import { ok, errorResponse } from '@/lib/response';
import { ValidationError } from '@/errors/http-errors';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const MIN_PX = 8;                  // descarta imágenes degeneradas (1x1) que cuelgan pdfkit
const EXT_BY_MIME: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

/** Extrae ancho/alto de PNG, JPEG, GIF o WEBP leyendo la cabecera. null si no se puede. */
function imageSize(buf: Buffer): { w: number; h: number } | null {
  // PNG: firma + IHDR
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) {
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  }
  // GIF: width/height little-endian en offset 6
  if (buf.length > 10 && buf.toString('ascii', 0, 3) === 'GIF') {
    return { w: buf.readUInt16LE(6), h: buf.readUInt16LE(8) };
  }
  // WEBP (VP8X/VP8 /VP8L) — RIFF....WEBP
  if (buf.length > 30 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const fmt = buf.toString('ascii', 12, 16);
    if (fmt === 'VP8X') return { w: (buf.readUIntLE(24, 3) & 0xffffff) + 1, h: (buf.readUIntLE(27, 3) & 0xffffff) + 1 };
    return { w: 16, h: 16 }; // VP8/VP8L: aceptamos sin medir con precisión
  }
  // JPEG: recorrer marcadores SOF
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let o = 2;
    while (o + 9 < buf.length) {
      if (buf[o] !== 0xff) { o++; continue; }
      const marker = buf[o + 1];
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { h: buf.readUInt16BE(o + 5), w: buf.readUInt16BE(o + 7) };
      }
      o += 2 + buf.readUInt16BE(o + 2);
    }
  }
  return null;
}

export const POST = withRole(['Docente'], async (req) => {
  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      throw new ValidationError({ file: 'requerido' }, 'No se recibió ninguna imagen.');
    }
    const ext = EXT_BY_MIME[file.type];
    if (!ext) {
      throw new ValidationError({ file: file.type }, 'Formato no permitido. Usa PNG, JPG, WEBP o GIF.');
    }
    if (file.size > MAX_BYTES) {
      throw new ValidationError({ size: file.size }, 'La imagen supera el tamaño máximo (5 MB).');
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Validar que sea una imagen real y con dimensiones razonables.
    const size = imageSize(buffer);
    if (!size || size.w < MIN_PX || size.h < MIN_PX) {
      throw new ValidationError({ size }, 'La imagen está dañada o es demasiado pequeña.');
    }

    const dir = path.join(process.cwd(), 'public', 'uploads', 'simulacros');
    await mkdir(dir, { recursive: true });
    const filename = `${randomUUID()}${ext}`;
    await writeFile(path.join(dir, filename), buffer);

    // URL absoluta hacia el propio backend (sirve /public en la raíz).
    const host = req.headers.get('host') ?? 'localhost:3001';
    const proto = req.headers.get('x-forwarded-proto') ?? 'http';
    const url = `${proto}://${host}/uploads/simulacros/${filename}`;

    return ok({ url }, 'Imagen subida');
  } catch (e) {
    return errorResponse(e);
  }
});
