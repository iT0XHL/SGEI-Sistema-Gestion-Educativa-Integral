// ============================================================
//  modules/asistencias/asistencia-docentes.schema.ts
//  Solo Admin puede registrar/editar asistencia de docentes.
//  UNIQUE (docente_id, fecha) — el DB lo enforcea.
// ============================================================
import { z } from 'zod';

export const EstadoAsistenciaEnum = z.enum(['P', 'F', 'T', 'J']);

/** POST /api/asistencias/docentes — uno o varios docentes para una fecha. */
export const GuardarAsistenciaDocenteSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha debe ser YYYY-MM-DD'),
  registros: z
    .array(
      z.object({
        docente_id: z.string().uuid('docente_id debe ser UUID'),
        estado: EstadoAsistenciaEnum,
        justificacion: z.string().max(500).optional().nullable(),
      }),
    )
    .min(1)
    .max(100),
});

/** PATCH /api/asistencias/docentes/[id] */
export const ActualizarAsistenciaDocenteSchema = z.object({
  estado: EstadoAsistenciaEnum.optional(),
  justificacion: z.string().max(500).optional().nullable(),
});

/** Query params para GET /api/asistencias/docentes. */
export const ListarAsistenciaDocenteQuery = z.object({
  docenteId: z.string().uuid().optional(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fechaDesde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fechaHasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type GuardarAsistenciaDocenteInput = z.infer<typeof GuardarAsistenciaDocenteSchema>;
export type ActualizarAsistenciaDocenteInput = z.infer<typeof ActualizarAsistenciaDocenteSchema>;
export type ListarAsistenciaDocenteQuery = z.infer<typeof ListarAsistenciaDocenteQuery>;
