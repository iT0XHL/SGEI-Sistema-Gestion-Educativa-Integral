// ============================================================
//  services/storage.service.ts — Almacenamiento local (filesystem).
//  Reemplazo completo de Supabase Storage para Hostinger VPS.
//  Los archivos se guardan en {STORAGE_PATH}/{bucket}/{prefixPath}/.
//  Sirve los archivos vía /api/files/ con verificación JWT.
// ============================================================
import { env } from '@/config/env';
import { AppError } from '@/errors/http-errors';
import { ALLOWED_EXTENSIONS, MAX_FILE_SIZE, type BucketName } from '@/storage/buckets';
import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';

class StorageValidationError extends AppError {
  constructor(message: string) {
    super('STORAGE_VALIDATION_ERROR', message, 400);
  }
}

function bucketDir(bucket: BucketName): string {
  return path.join(env.STORAGE_PATH, bucket);
}

async function ensureDir(p: string) {
  try {
    await fs.mkdir(p, { recursive: true });
  } catch {
    // race condition safe
  }
}

export const StorageService = {
  /**
   * Sube un archivo al filesystem local.
   * @returns La ruta relativa (ej. "materiales/docente-uuid/1234-archivo.pdf").
   */
  async upload(
    bucket: BucketName,
    prefixPath: string,
    file: File,
  ): Promise<string> {
    if (file.size > MAX_FILE_SIZE) {
      throw new StorageValidationError(
        `El archivo supera el tamaño máximo permitido (${MAX_FILE_SIZE / 1024 / 1024} MB).`,
      );
    }

    const ext = path.extname(file.name).toLowerCase();
    const allowed = ALLOWED_EXTENSIONS[bucket];
    if (allowed && !allowed.includes(ext)) {
      throw new StorageValidationError(
        `Extensión no permitida: ${ext}. Permitidas: ${allowed.join(', ')}`,
      );
    }

    const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const objectPath = `${bucket}/${prefixPath}/${safeName}`;
    const fullPath = path.join(env.STORAGE_PATH, objectPath);

    await ensureDir(path.dirname(fullPath));

    const arrayBuffer = await file.arrayBuffer();
    await fs.writeFile(fullPath, Buffer.from(arrayBuffer));

    return objectPath;
  },

  /**
   * Genera una URL firmada temporal (300 s). Como es local,
   * retorna una URL al endpoint /api/files/ con un token JWT
   * firmado como query param (o confía en la cookie del usuario).
   *
   * Para simplificar, retorna la URL del backend que sirve el
   * archivo con verificación de auth vía cookie (HttpOnly JWT).
   */
  async getSignedUrl(bucket: BucketName, objectPath: string): Promise<string> {
    const apiUrl = env.APP_URL.replace(/\/+$/, '');
    return `${apiUrl}/api/files/${objectPath}`;
  },

  /**
   * Elimina un archivo del filesystem. No falla si no existe.
   */
  async delete(bucket: BucketName, objectPath: string): Promise<void> {
    const fullPath = path.join(env.STORAGE_PATH, objectPath);
    try {
      await fs.unlink(fullPath);
    } catch {
      // Silently ignore if file doesn't exist
    }
  },

  /**
   * Retorna el path absoluto para servir el archivo.
   */
  getFilePath(objectPath: string): string {
    return path.join(env.STORAGE_PATH, objectPath);
  },

  /** Siempre configurado en local filesystem. */
  isConfigured(): boolean {
    return true;
  },
};
