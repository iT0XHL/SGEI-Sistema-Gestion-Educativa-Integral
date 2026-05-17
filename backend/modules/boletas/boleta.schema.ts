import { z } from 'zod';

export const SubirBoletaSchema = z.object({
  pago_id:          z.string().uuid(),
  banco:            z.string().max(80).optional(),
  numero_operacion: z.string().max(50).optional(),
});

export const RevisarBoletaSchema = z.object({
  boleta_id:            z.string().uuid(),
  nuevo_estado:         z.enum(['Aprobada', 'Rechazada']),
  observacion_rechazo:  z.string().min(5).max(1000).optional().nullable(),
}).refine(
  (d) => d.nuevo_estado !== 'Rechazada' || (d.observacion_rechazo && d.observacion_rechazo.trim().length >= 5),
  { message: 'La observación de rechazo es obligatoria al rechazar una boleta.', path: ['observacion_rechazo'] },
);

export const ListarBoletasQuery = z.object({
  alumnoId:      z.string().uuid().optional(),
  pagoId:        z.string().uuid().optional(),
  estadoRevision: z.enum(['En_Revision', 'Aprobada', 'Rechazada']).optional(),
});

export type SubirBoletaInput   = z.infer<typeof SubirBoletaSchema>;
export type RevisarBoletaInput = z.infer<typeof RevisarBoletaSchema>;
export type ListarBoletasQueryInput = z.infer<typeof ListarBoletasQuery>;
