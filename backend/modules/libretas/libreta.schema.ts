import { z } from 'zod';

export const GenerarLibretaSchema = z.object({
  alumnoId:  z.string().uuid(),
  bimestreId: z.string().uuid(),
});

export const GenerarLoteSchema = z.object({
  seccionId:  z.string().uuid(),
  bimestreId: z.string().uuid(),
});

export const CambiarEstadoSchema = z.object({
  observacion: z.string().max(500).optional().nullable(),
});

export const EstadoRecepcionQuery = z.object({
  periodoId: z.string().uuid().optional(),
  bimestreId: z.string().uuid().optional(),
  nivelId: z.string().uuid().optional(),
  gradoId: z.string().uuid().optional(),
  seccionId: z.string().uuid().optional(),
  cursoId: z.string().uuid().optional(),
  docenteId: z.string().uuid().optional(),
});

export const ExportarLoteQuery = z.object({
  bimestreId: z.string().uuid(),
  seccionId: z.string().uuid(),
  periodoId: z.string().uuid().optional(),
});

export type GenerarLibretaInput = z.infer<typeof GenerarLibretaSchema>;
export type GenerarLoteInput = z.infer<typeof GenerarLoteSchema>;
export type CambiarEstadoInput = z.infer<typeof CambiarEstadoSchema>;
export type EstadoRecepcionQueryInput = z.infer<typeof EstadoRecepcionQuery>;
export type ExportarLoteQueryInput = z.infer<typeof ExportarLoteQuery>;

export interface RecepcionRow {
  docente_id: string;
  docente_nombre: string;
  curso_id: string;
  curso_nombre: string;
  grado: string;
  seccion_id: string;
  seccion_nombre: string;
  bimestre_numero: number;
  bimestre_nombre: string;
  total_alumnos: number;
  notas_esperadas: number;
  notas_registradas: number;
  cerrada: boolean;
  estado: string;
}

export interface LibretaDTO {
  id: string;
  alumno_id: string;
  periodo_id: string;
  bimestre_id: string;
  estado: string;
  version: number;
  fecha_generacion: string | null;
  fecha_publicacion: string | null;
  bloqueada: boolean;
}
