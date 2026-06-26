import { z } from 'zod';

const uuid = z.string().uuid();

// Escala Literal
export const CreateEscalaSchema = z.object({
  periodo_id: uuid,
  escala: z.enum(['AD', 'A', 'B', 'C']),
  rango_inferior: z.coerce.number().min(0).max(20),
  rango_superior: z.coerce.number().min(0).max(20),
}).refine((d) => d.rango_superior >= d.rango_inferior);
export type CreateEscalaInput = z.infer<typeof CreateEscalaSchema>;

export const UpdateEscalaSchema = z.object({
  rango_inferior: z.coerce.number().min(0).max(20).optional(),
  rango_superior: z.coerce.number().min(0).max(20).optional(),
});
export type UpdateEscalaInput = z.infer<typeof UpdateEscalaSchema>;

// Institución Educativa
export const CreateInstitucionSchema = z.object({
  nombre: z.string().trim().min(3).max(200),
  codigo_modular: z.string().trim().min(3).max(20),
  codigo_ugel: z.string().trim().max(10),
  nombre_ugel: z.string().trim().max(150),
  modalidad: z.string().trim().max(80).default('Educación Básica Regular'),
  gestion: z.string().trim().max(20),
  departamento: z.string().trim().max(80),
  provincia: z.string().trim().max(80),
  distrito: z.string().trim().max(80),
});
export type CreateInstitucionInput = z.infer<typeof CreateInstitucionSchema>;

export const UpdateInstitucionSchema = z.object({
  nombre: z.string().trim().min(3).max(200).optional(),
  codigo_modular: z.string().trim().min(3).max(20).optional(),
  nombre_ugel: z.string().trim().max(150).optional(),
  departamento: z.string().trim().max(80).optional(),
  provincia: z.string().trim().max(80).optional(),
  distrito: z.string().trim().max(80).optional(),
});
export type UpdateInstitucionInput = z.infer<typeof UpdateInstitucionSchema>;

// Competencia
export const CreateCompetenciaSchema = z.object({
  curso_id: uuid,
  nombre: z.string().trim().min(3).max(200),
  descripcion: z.string().trim().optional(),
  tipo: z.string().trim().max(20),
  orden: z.coerce.number().int().positive().optional(),
});
export type CreateCompetenciaInput = z.infer<typeof CreateCompetenciaSchema>;

export const UpdateCompetenciaSchema = z.object({
  nombre: z.string().trim().min(3).max(200).optional(),
  descripcion: z.string().trim().optional(),
  tipo: z.string().trim().max(20).optional(),
  orden: z.coerce.number().int().positive().optional(),
});
export type UpdateCompetenciaInput = z.infer<typeof UpdateCompetenciaSchema>;
