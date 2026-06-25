import { z } from 'zod';

export const TipoNotificacionEnum = z.enum(['sistema', 'pago', 'academico', 'comunicado']);

export const CrearNotificacionSchema = z.object({
  usuario_destino_id: z.string().uuid(),
  tipo:               TipoNotificacionEnum,
  titulo:             z.string().min(1).max(150),
  cuerpo:             z.string().min(1).max(5000),
  url_accion:         z.string().url().optional(),
});

export const ListarNotificacionesQuery = z.object({
  leida: z
    .string()
    .optional()
    .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
});

export type CrearNotificacionInput = z.infer<typeof CrearNotificacionSchema>;
