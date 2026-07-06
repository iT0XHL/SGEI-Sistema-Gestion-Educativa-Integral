import { z } from 'zod';

export const CreatePagoSchema = z.object({
  alumno_id:         z.string().uuid(),
  concepto_id:       z.string().uuid(),
  periodo_id:        z.string().uuid(),
  mes:               z.number().int().min(1).max(12).optional().nullable(),
  monto:             z.number().positive(),
  fecha_vencimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD requerido.'),
});

export const ListarPagosQuery = z.object({
  alumnoId:   z.string().uuid().optional(),
  periodoId:  z.string().uuid().optional(),
  estado:     z.enum(['Pendiente', 'En_Revision', 'Pagado', 'Rechazado']).optional(),
  mes:        z.coerce.number().int().min(1).max(12).optional(),
});

export const GenerarMasivoSchema = z.object({
  periodo_id:        z.string().uuid(),
  concepto_id:       z.string().uuid(),
  mes:               z.number().int().min(1).max(12),
  monto:             z.number().positive(),
  fecha_vencimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD requerido.'),
});

export const GenerarMasivoResultSchema = z.object({
  creados: z.number(),
  saltados: z.number(),
  total_alumnos: z.number(),
});

export type CreatePagoInput      = z.infer<typeof CreatePagoSchema>;
export type ListarPagosQueryInput = z.infer<typeof ListarPagosQuery>;
export type GenerarMasivoInput   = z.infer<typeof GenerarMasivoSchema>;
export type GenerarMasivoResult  = z.infer<typeof GenerarMasivoResultSchema>;
