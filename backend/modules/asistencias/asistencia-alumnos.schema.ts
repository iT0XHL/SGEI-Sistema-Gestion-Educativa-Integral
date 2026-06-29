// ============================================================
//  modules/asistencias/asistencia-alumnos.schema.ts
//  Validaciones Zod para el registro de asistencia de alumnos.
//  ENUM estado: P | F | T | J  (SQL academic_schema.estado_asistencia)
// ============================================================
import { z } from 'zod';

export const EstadoAsistenciaEnum = z.enum(['P', 'F', 'T', 'J']);

/** Un registro individual dentro de un POST en lote. */
const RegistroAsistenciaItem = z.object({
  alumno_id: z.string().uuid('alumno_id debe ser UUID'),
  estado: EstadoAsistenciaEnum,
  justificacion: z.string().max(500).optional().nullable(),
});

/** POST /api/asistencias/alumnos — guarda asistencia de toda la sección. */
export const GuardarAsistenciaSchema = z.object({
  seccion_id: z.string().uuid('seccion_id debe ser UUID'),
  // Asignación (curso–sección) desde la que el docente toma asistencia.
  // Opcional para compatibilidad, refuerza la validación de horario.
  asignacion_id: z.string().uuid('asignacion_id debe ser UUID').optional(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha debe ser YYYY-MM-DD'),
  registros: z
    .array(RegistroAsistenciaItem)
    .min(1, 'Se debe enviar al menos un registro')
    .max(45, 'Máximo 45 alumnos por sección'),
});

/** PATCH /api/asistencias/alumnos/[id] — corrige un registro individual. */
export const ActualizarAsistenciaSchema = z.object({
  estado: EstadoAsistenciaEnum.optional(),
  justificacion: z.string().max(500).optional().nullable(),
});

/** Query params para GET /api/asistencias/alumnos. */
export const ListarAsistenciaQuery = z.object({
  seccionId: z.string().uuid().optional(),
  alumnoId: z.string().uuid().optional(),
  estado: EstadoAsistenciaEnum.optional(),
  fechaDesde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fechaHasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  // Paginación: acota el resultado para escalar con grandes volúmenes.
  limit: z.coerce.number().int().positive().max(5000).default(1000),
  offset: z.coerce.number().int().min(0).default(0),
});

export type GuardarAsistenciaInput = z.infer<typeof GuardarAsistenciaSchema>;
export type ActualizarAsistenciaInput = z.infer<typeof ActualizarAsistenciaSchema>;
export type ListarAsistenciaQuery = z.infer<typeof ListarAsistenciaQuery>;
