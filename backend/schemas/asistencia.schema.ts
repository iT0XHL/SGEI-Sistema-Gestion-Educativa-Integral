// ============================================================
//  schemas/asistencia.schema.ts — Validación Zod para asistencia
//  docente (registro, edición, filtros, reportes).
// ============================================================
import { z } from 'zod';

const uuid = z.string().uuid('Identificador inválido');

export const CreateAsistenciaSchema = z.object({
  docente_id: uuid,
  fecha: z.coerce.date(),
  estado: z.enum(['P', 'F', 'T', 'J'], { errorMap: () => ({ message: 'Estado inválido (P/F/T/J)' }) }),
  justificacion: z.string().trim().max(500).optional().nullable(),
});
export type CreateAsistenciaInput = z.infer<typeof CreateAsistenciaSchema>;

export const UpdateAsistenciaSchema = z.object({
  estado: z.enum(['P', 'F', 'T', 'J']).optional(),
  justificacion: z.string().trim().max(500).optional().nullable(),
});
export type UpdateAsistenciaInput = z.infer<typeof UpdateAsistenciaSchema>;

export const ListAsistenciasQuery = z.object({
  docenteId: uuid.optional(),
  fecha_inicio: z.coerce.date().optional(),
  fecha_fin: z.coerce.date().optional(),
  estado: z.enum(['P', 'F', 'T', 'J']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(20),
});
export type ListAsistenciasQuery = z.infer<typeof ListAsistenciasQuery>;
