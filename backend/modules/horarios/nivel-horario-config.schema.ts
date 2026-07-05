// ============================================================
//  modules/horarios/nivel-horario-config.schema.ts
//  Validación Zod de la jornada escolar (hora de inicio + duración
//  de la hora escolar) por Nivel.
// ============================================================
import { z } from 'zod';

const uuid = z.string().uuid('Identificador inválido');
const horaHHMM = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida (formato HH:MM)');

export const JornadaQuery = z.object({
  nivelId: uuid,
  periodoId: uuid,
});
export type JornadaQuery = z.infer<typeof JornadaQuery>;

export const UpsertJornadaSchema = z.object({
  nivel_id: uuid,
  periodo_id: uuid,
  hora_inicio_jornada: horaHHMM,
  duracion_hora_min: z.coerce.number().int().min(20, 'Mínimo 20 minutos').max(180, 'Máximo 180 minutos'),
  total_horas_dia: z.coerce.number().int().min(1, 'Mínimo 1 hora').max(20, 'Máximo 20 horas'),
});
export type UpsertJornadaInput = z.infer<typeof UpsertJornadaSchema>;
