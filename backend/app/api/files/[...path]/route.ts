import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { errorResponse } from '@/lib/response';
import { StorageService } from '@/services/storage.service';
import { BUCKETS, type BucketName } from '@/storage/buckets';
import { ForbiddenError, NotFoundError } from '@/errors/http-errors';
import fs from 'node:fs';
import path from 'node:path';

export const dynamic = 'force-dynamic';

const BUCKET_LIST: BucketName[] = Object.values(BUCKETS);

const MIME_MAP: Record<string, string> = {
  '.pdf':   'application/pdf',
  '.docx':  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.pptx':  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.xlsx':  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.jpg':   'image/jpeg',
  '.jpeg':  'image/jpeg',
  '.png':   'image/png',
  '.webp':  'image/webp',
  '.zip':   'application/zip',
  '.doc':   'application/msword',
  '.xls':   'application/vnd.ms-excel',
  '.ppt':   'application/vnd.ms-powerpoint',
  '.gif':   'image/gif',
  '.txt':   'text/plain',
  '.rar':   'application/x-rar-compressed',
};

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_MAP[ext] ?? 'application/octet-stream';
}

export const GET = withAuth(async (req, { user, params }) => {
  try {
    const segments = params.path; // Next.js catch-all: string | string[]
    const objectPath = Array.isArray(segments) ? segments.join('/') : segments;
    if (!objectPath) {
      return errorResponse(new NotFoundError('Archivo'));
    }

    const bucket = objectPath.split('/')[0] as string;
    if (!BUCKET_LIST.includes(bucket as BucketName)) {
      return errorResponse(new NotFoundError('Archivo'));
    }

    if (bucket === BUCKETS.BOLETAS_PAGOS && user.rol !== 'Alumno' && user.rol !== 'Admin' && user.rol !== 'Secretaria') {
      return errorResponse(new ForbiddenError('ACCESS_DENIED', 'No tienes permiso para acceder a este archivo.'));
    }

    const fullPath = StorageService.getFilePath(objectPath);

    if (!fs.existsSync(fullPath)) {
      return errorResponse(new NotFoundError('Archivo'));
    }

    const stat = fs.statSync(fullPath);
    const mimeType = getMimeType(fullPath);
    const fileBuffer = fs.readFileSync(fullPath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(stat.size),
        'Cache-Control': 'private, max-age=300',
        'Content-Disposition': `inline; filename="${path.basename(objectPath)}"`,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
});
