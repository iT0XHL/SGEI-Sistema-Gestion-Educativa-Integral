// ============================================================
//  modules/actividades/actividades.schema.ts
//  tipo_actividad ENUM: tarea | practica | evaluacion | proyecto
//  estado_entrega ENUM: pendiente | entregado | calificado
// ============================================================
import { z } from 'zod';

export const TipoActividadEnum = z.enum(['tarea', 'practica', 'evaluacion', 'proyecto']);
export const EstadoEntregaEnum = z.enum(['pendiente', 'entregado', 'calificado']);

/** POST /api/actividades */
export const CreateActividadSchema = z.object({
  curso_id: z.string().uuid('curso_id debe ser UUID'),
  seccion_id: z.string().uuid('seccion_id debe ser UUID'),
  titulo: z.string().min(3).max(200),
  descripcion: z.string().max(5000).optional().nullable(),
  tipo: TipoActividadEnum.optional(),
  fecha_limite: z.string().datetime({ message: 'fecha_limite debe ser ISO 8601 con zona horaria' }),
  puntaje_maximo: z
    .number()
    .positive('puntaje_maximo debe ser mayor a 0')
    .max(100),
  url_adjunto: z.string().url().max(2000).optional().nullable(),
});

/** PATCH /api/actividades/[id] */
export const UpdateActividadSchema = z.object({
  titulo: z.string().min(3).max(200).optional(),
  descripcion: z.string().max(5000).optional().nullable(),
  tipo: TipoActividadEnum.optional(),
  fecha_limite: z.string().datetime().optional(),
  puntaje_maximo: z.number().positive().max(100).optional(),
  url_adjunto: z.string().url().max(2000).optional().nullable(),
});

/** Query params GET /api/actividades */
export const ListActividadesQuery = z.object({
  seccionId: z.string().uuid().optional(),
  cursoId: z.string().uuid().optional(),
  tipo: TipoActividadEnum.optional(),
});

/** POST /api/actividades/[id]/entregas — alumno entrega */
export const SubmitEntregaSchema = z.object({
  comentario_alumno: z.string().max(2000).optional().nullable(),
  // url_archivo se establece desde el archivo subido a Storage, no desde el body JSON.
});

/** PATCH /api/actividades/[id]/entregas/[entregaId] — docente califica */
export const CalificarEntregaSchema = z.object({
  nota: z.number().min(0).max(100).optional().nullable(),
  observacion_docente: z.string().max(2000).optional().nullable(),
  estado: EstadoEntregaEnum.optional(),
});

export type CreateActividadInput = z.infer<typeof CreateActividadSchema>;
export type UpdateActividadInput = z.infer<typeof UpdateActividadSchema>;
export type ListActividadesQuery = z.infer<typeof ListActividadesQuery>;
export type SubmitEntregaInput = z.infer<typeof SubmitEntregaSchema>;
export type CalificarEntregaInput = z.infer<typeof CalificarEntregaSchema>;
