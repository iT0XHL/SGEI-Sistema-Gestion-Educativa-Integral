import { z } from 'zod';

export const TipoNotificacionEnum = z.enum(['sistema', 'pago', 'academico', 'comunicado']);

/**
 * url_accion acepta rutas internas (/alumno/notas) o URLs absolutas (§26.14).
 * Las notificaciones redirigen DENTRO del sistema, así que una ruta relativa
 * que empiece por "/" es válida.
 */
const UrlAccion = z
  .string()
  .max(500)
  .refine(
    (v) => v.startsWith('/') || /^https?:\/\//.test(v),
    'url_accion debe ser una ruta interna (/...) o una URL http(s) válida.',
  );

export const CrearNotificacionSchema = z.object({
  usuario_destino_id: z.string().uuid(),
  tipo:               TipoNotificacionEnum,
  titulo:             z.string().min(1).max(150),
  cuerpo:             z.string().min(1).max(5000),
  url_accion:         UrlAccion.optional(),
});

export const ListarNotificacionesQuery = z.object({
  leida: z
    .string()
    .optional()
    .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
});

export type CrearNotificacionInput = z.infer<typeof CrearNotificacionSchema>;
