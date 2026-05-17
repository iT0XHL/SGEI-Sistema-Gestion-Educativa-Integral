import { z } from 'zod';

export const SituacionFinalEnum = z.enum([
  'Promovido',
  'Repitente',
  'Retirado',
  'Trasladado',
  'Fallecido',
]);

export const UpsertSfaSchema = z
  .object({
    alumno_id:                z.string().uuid(),
    periodo_id:               z.string().uuid(),
    situacion_final:          SituacionFinalEnum,
    numero_areas_desaprobadas: z.number().int().min(0).default(0),
    comportamiento:           z.string().max(10).optional(),
    motivo_retiro:            z.string().min(5).max(1000).optional(),
    observaciones:            z.string().max(2000).optional(),
  })
  .refine(
    (d) =>
      !['Retirado', 'Trasladado'].includes(d.situacion_final) ||
      (d.motivo_retiro?.trim().length ?? 0) >= 5,
    {
      message: 'motivo_retiro es obligatorio cuando la situación es Retirado o Trasladado.',
      path: ['motivo_retiro'],
    },
  );

export const ListarSfaQuery = z.object({
  periodoId: z.string().uuid().optional(),
  seccionId: z.string().uuid().optional(),
  alumnoId:  z.string().uuid().optional(),
});

export type UpsertSfaInput  = z.infer<typeof UpsertSfaSchema>;
export type ListarSfaFilter = z.infer<typeof ListarSfaQuery>;
