// ============================================================
//  modules/horarios/horario-publicacion.schema.ts
//  Validación Zod del flujo de publicación de horarios.
// ============================================================
import { z } from 'zod';

const uuid = z.string().uuid('Identificador inválido');

export const PublicarHorarioSchema = z.object({
  periodo_id: uuid,
});
export type PublicarHorarioInput = z.infer<typeof PublicarHorarioSchema>;

export const HorarioPublicacionesQuery = z.object({
  periodoId: uuid.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(20),
});
export type HorarioPublicacionesQuery = z.infer<typeof HorarioPublicacionesQuery>;

export const HorarioPublicadoQuery = z.object({
  periodoId: uuid.optional(),
});
export type HorarioPublicadoQuery = z.infer<typeof HorarioPublicadoQuery>;

export const HorarioExportQuery = z
  .object({
    periodoId: uuid.optional(),
    tipo: z.enum(['docente', 'seccion', 'completo', 'docentes', 'secciones']),
    id: uuid.optional(),
  })
  .refine((d) => !['docente', 'seccion'].includes(d.tipo) || !!d.id, {
    message: 'id es requerido cuando tipo es "docente" o "seccion"',
    path: ['id'],
  });
export type HorarioExportQuery = z.infer<typeof HorarioExportQuery>;

/** Export del horario PUBLICADO (Docente/Alumno viendo el suyo, o Admin viendo el de un tercero). */
export const HorarioExportPublicadoQuery = z.object({
  periodoId: uuid.optional(),
  tipo: z.enum(['docente', 'alumno']),
  id: uuid,
});
export type HorarioExportPublicadoQuery = z.infer<typeof HorarioExportPublicadoQuery>;
