import { z } from 'zod';

const uuid = z.string().uuid('Identificador inválido');

export const CreatePeriodoSchema = z.object({
  anio: z.coerce.number().int().min(1990).max(2100),
  nombre: z.string().trim().min(2).max(60),
  fecha_inicio: z.coerce.date(),
  fecha_fin: z.coerce.date(),
  activo: z.boolean().default(false),
}).refine((data) => data.fecha_fin > data.fecha_inicio, {
  message: 'fecha_fin debe ser posterior a fecha_inicio',
  path: ['fecha_fin'],
});
export type CreatePeriodoInput = z.infer<typeof CreatePeriodoSchema>;

export const UpdatePeriodoSchema = z.object({
  nombre: z.string().trim().min(2).max(60).optional(),
  fecha_inicio: z.coerce.date().optional(),
  fecha_fin: z.coerce.date().optional(),
  activo: z.boolean().optional(),
});
export type UpdatePeriodoInput = z.infer<typeof UpdatePeriodoSchema>;

export const ListPeriodosQuery = z.object({
  activo: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(20),
});
export type ListPeriodosQuery = z.infer<typeof ListPeriodosQuery>;

export const CreateBimestreSchema = z.object({
  periodo_id: uuid,
  numero: z.coerce.number().int().min(1).max(4),
  nombre: z.string().trim().min(2).max(40),
  fecha_inicio: z.coerce.date(),
  fecha_fin: z.coerce.date(),
}).refine((data) => data.fecha_fin > data.fecha_inicio, {
  message: 'fecha_fin debe ser posterior a fecha_inicio',
  path: ['fecha_fin'],
});
export type CreateBimestreInput = z.infer<typeof CreateBimestreSchema>;

export const UpdateBimestreSchema = z.object({
  nombre: z.string().trim().min(2).max(40).optional(),
  fecha_inicio: z.coerce.date().optional(),
  fecha_fin: z.coerce.date().optional(),
  cerrado: z.boolean().optional(),
});
export type UpdateBimestreInput = z.infer<typeof UpdateBimestreSchema>;

export const ListBimestresQuery = z.object({
  periodoId: uuid.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(20),
});
export type ListBimestresQuery = z.infer<typeof ListBimestresQuery>;
