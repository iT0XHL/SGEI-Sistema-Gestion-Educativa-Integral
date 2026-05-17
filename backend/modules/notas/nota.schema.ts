import { z } from 'zod';

export const TipoEvaluacionEnum = z.enum([
  'Final',
  'Recuperacion',
  'Ubicacion',
  'Estudio_Independiente',
]);

export const NotaItemSchema = z.object({
  alumno_id:      z.string().uuid(),
  competencia_id: z.string().uuid(),
  bimestre_id:    z.string().uuid(),
  nota_vigesimal: z.number().min(0).max(20),
  tipo_evaluacion: TipoEvaluacionEnum.optional(),
  observacion:    z.string().max(500).optional().nullable(),
});

export const UpsertBatchNotaSchema = z.object({
  notas: z.array(NotaItemSchema).min(1).max(200),
});

export const UpdateNotaSchema = z.object({
  nota_vigesimal:  z.number().min(0).max(20).optional(),
  tipo_evaluacion: TipoEvaluacionEnum.optional(),
  observacion:     z.string().max(500).optional().nullable(),
});

export const DesbloquearNotaSchema = z.object({
  valor_nuevo: z.number().min(0).max(20),
  motivo:      z.string().min(5).max(500),
});

export const ListarNotasQuery = z.object({
  alumnoId:      z.string().uuid().optional(),
  bimestreId:    z.string().uuid().optional(),
  competenciaId: z.string().uuid().optional(),
  docenteId:     z.string().uuid().optional(),
  seccionId:     z.string().uuid().optional(),
  cerrada:       z.enum(['true', 'false']).optional(),
});

export type NotaItem             = z.infer<typeof NotaItemSchema>;
export type UpsertBatchNotaInput = z.infer<typeof UpsertBatchNotaSchema>;
export type UpdateNotaInput      = z.infer<typeof UpdateNotaSchema>;
export type DesbloquearNotaInput = z.infer<typeof DesbloquearNotaSchema>;
export type ListarNotasQueryInput = z.infer<typeof ListarNotasQuery>;
