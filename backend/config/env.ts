// ============================================================
//  config/env.ts — Validación de variables de entorno con Zod.
//  Falla de forma temprana y explícita si falta algo crítico.
// ============================================================
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),
  DIRECT_URL: z.string().min(1).optional(),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET es obligatorio (mín. 32 caracteres)'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  JWT_COOKIE_NAME: z.string().default('sgei_token'),

  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

  FRONTEND_ORIGIN: z.string().url().default('http://localhost:3000'),
  MAX_FILE_SIZE_MB: z.coerce.number().int().positive().default(10),

  // Almacenamiento local (filesystem) — directorio donde se guardan los archivos.
  // En Docker: persistir vía volumen. En Hostinger VPS: ruta absoluta.
  STORAGE_PATH: z.string().default('./public/uploads'),

  // URL pública del backend para generar enlaces de descarga de archivos.
  APP_URL: z.string().url().default('http://localhost:3001'),

  CRON_SECRET: z.union([z.string().min(16), z.literal('')]).optional(),

  RESEND_API_KEY: z.union([z.string().min(1), z.literal('')]).optional(),
  EMAIL_FROM: z.string().default('SGEI <no-reply@sgei.local>'),
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
  DIRECT_URL: data.DIRECT_URL ?? data.DATABASE_URL,
  isProd: data.NODE_ENV === 'production',
  isDev: data.NODE_ENV === 'development',
};

export type Env = typeof env;
