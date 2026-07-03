// ============================================================
//  modules/horarios/horario-descanso.schema.ts
//  Validación Zod del Recreo/Refrigerio por Nivel.
// ============================================================
import { z } from 'zod';

const uuid = z.string().uuid('Identificador inválido');
const horaHHMM = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida (formato HH:MM)');

export const DescansosQuery = z.object({
  periodoId: uuid,
  nivelIds: z
    .string()
    .transform((s) => s.split(',').map((v) => v.trim()).filter(Boolean))
    .pipe(z.array(uuid).min(1, 'Se requiere al menos un nivelId')),
});
export type DescansosQuery = z.infer<typeof DescansosQuery>;

export const UpsertDescansoSchema = z
  .object({
    nivel_id: uuid,
    periodo_id: uuid,
    tipo: z.enum(['RECREO', 'REFRIGERIO']),
    hora_inicio: horaHHMM,
    hora_fin: horaHHMM,
  })
  .refine((d) => d.hora_fin > d.hora_inicio, {
    message: 'hora_fin debe ser mayor que hora_inicio',
    path: ['hora_fin'],
  });
export type UpsertDescansoInput = z.infer<typeof UpsertDescansoSchema>;
