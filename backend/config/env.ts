// ============================================================
//  config/env.ts — Validación de variables de entorno con Zod.
//  Falla de forma temprana y explícita si falta algo crítico.
// ============================================================
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  // Base de datos — único requerido en la Fase 1.
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),
  // DIRECT_URL: si no se define, se usa DATABASE_URL (válido en local).
  DIRECT_URL: z.string().min(1).optional(),

  // JWT — requerido para auth.
  JWT_SECRET: z.string().min(32, 'JWT_SECRET es obligatorio (mín. 32 caracteres)'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  JWT_COOKIE_NAME: z.string().default('sgei_token'),

  // Seguridad.
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

  // Integración con el frontend existente.
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:3000'),
  MAX_FILE_SIZE_MB: z.coerce.number().int().positive().default(5),

  // Supabase Storage — requerido para subida de archivos (materiales, entregas).
  // No requerido para desarrollo local sin archivos.
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_KEY: z.string().min(1).optional(),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    '[SGEI] Variables de entorno inválidas:\n',
    parsed.error.flatten().fieldErrors,
  );
  throw new Error('Configuración de entorno inválida. Revisa tu archivo .env');
}

const data = parsed.data;

export const env = {
  ...data,
  // En local DIRECT_URL puede omitirse: cae a DATABASE_URL.
  DIRECT_URL: data.DIRECT_URL ?? data.DATABASE_URL,
  isProd: data.NODE_ENV === 'production',
  isDev: data.NODE_ENV === 'development',
  SUPABASE_URL: data.SUPABASE_URL,
  SUPABASE_SERVICE_KEY: data.SUPABASE_SERVICE_KEY,
};

export type Env = typeof env;
