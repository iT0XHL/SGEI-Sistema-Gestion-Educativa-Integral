// ============================================================
//  services/storage.service.ts — Supabase Storage (buckets privados).
//
//  Usa la SERVICE KEY para operar con privilegios de administrador
//  (bypass RLS de Storage). Las URLs firmadas tienen 300 s de vigencia.
//
//  Si SUPABASE_URL / SUPABASE_SERVICE_KEY no están configuradas,
//  los métodos lanzan StorageNotConfiguredError con mensaje claro.
// ============================================================
import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';
import { AppError } from '@/errors/http-errors';
import { ALLOWED_EXTENSIONS, MAX_FILE_SIZE, type BucketName } from '@/storage/buckets';
import path from 'node:path';

class StorageNotConfiguredError extends AppError {
  constructor() {
    super(
      'STORAGE_NOT_CONFIGURED',
      'Supabase Storage no está configurado. Define SUPABASE_URL y SUPABASE_SERVICE_KEY en el .env',
      503,
    );
  }
}

class StorageValidationError extends AppError {
  constructor(message: string) {
    super('STORAGE_VALIDATION_ERROR', message, 400);
  }
}

function getClient() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    throw new StorageNotConfiguredError();
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });
}

export const StorageService = {
  /**
   * Sube un archivo a Supabase Storage.
   * @returns La ruta del objeto en el bucket (ej. "docente-uuid/1234-archivo.pdf").
   */
  async upload(
    bucket: BucketName,
    prefixPath: string,
    file: File,
  ): Promise<string> {
    // 1. Validar tamaño.
    if (file.size > MAX_FILE_SIZE) {
      throw new StorageValidationError(
        `El archivo supera el tamaño máximo permitido (${MAX_FILE_SIZE / 1024 / 1024} MB).`,
      );
    }

    // 2. Validar extensión.
    const ext = path.extname(file.name).toLowerCase();
    const allowed = ALLOWED_EXTENSIONS[bucket];
    if (allowed && !allowed.includes(ext)) {
      throw new StorageValidationError(
        `Extensión no permitida: ${ext}. Permitidas: ${allowed.join(', ')}`,
      );
    }

    // 3. Construir ruta única para evitar colisiones.
    const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const objectPath = `${prefixPath}/${safeName}`;

    const arrayBuffer = await file.arrayBuffer();
    const supabase = getClient();

    const { error } = await supabase.storage
      .from(bucket)
      .upload(objectPath, arrayBuffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

    if (error) {
      throw new AppError('STORAGE_UPLOAD_ERROR', `Error al subir archivo: ${error.message}`, 502);
    }

    return objectPath;
  },

  /**
   * Genera una URL firmada temporal (300 s) para un objeto privado.
   */
  async getSignedUrl(bucket: BucketName, objectPath: string): Promise<string> {
    const supabase = getClient();
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(objectPath, 300);

    if (error || !data?.signedUrl) {
      throw new AppError(
        'STORAGE_SIGNED_URL_ERROR',
        `No se pudo generar la URL firmada: ${error?.message ?? 'unknown'}`,
        502,
      );
    }

    return data.signedUrl;
  },

  /**
   * Elimina un objeto del bucket. Falla silenciosamente si no existe.
   */
  async delete(bucket: BucketName, objectPath: string): Promise<void> {
    const supabase = getClient();
    await supabase.storage.from(bucket).remove([objectPath]);
  },

  /** Verifica si Storage está configurado en el entorno actual. */
  isConfigured(): boolean {
    return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY);
  },
};
