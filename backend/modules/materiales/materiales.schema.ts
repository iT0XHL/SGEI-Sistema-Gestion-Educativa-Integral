// ============================================================
//  modules/materiales/materiales.schema.ts
//  tipo_material ENUM: PDF | enlace | video | imagen | otro
//  Los tipos PDF/imagen/otro → archivo subido a Storage.
//  Los tipos enlace/video   → URL externa en el campo `url`.
// ============================================================
import { z } from 'zod';

export const TipoMaterialEnum = z.enum(['PDF', 'enlace', 'video', 'imagen', 'otro']);

/** POST /api/materiales — crear material con URL externa (enlace/video). */
export const CreateMaterialSchema = z.object({
  docente_id: z.string().uuid().optional(), // Admin puede especificarlo; Docente usa su entidadId.
  curso_id: z.string().uuid('curso_id debe ser UUID'),
  seccion_id: z.string().uuid('seccion_id debe ser UUID'),
  titulo: z.string().min(3).max(200),
  descripcion: z.string().max(2000).optional().nullable(),
  tipo: TipoMaterialEnum,
  url: z.string().url('url debe ser una URL válida').max(2000),
  visible: z.boolean().default(true),
});

/** PUT /api/materiales/[id] */
export const UpdateMaterialSchema = z.object({
  titulo: z.string().min(3).max(200).optional(),
  descripcion: z.string().max(2000).optional().nullable(),
  tipo: TipoMaterialEnum.optional(),
  url: z.string().url().max(2000).optional(),
  visible: z.boolean().optional(),
});

/** Query params para GET /api/materiales. */
export const ListMaterialesQuery = z.object({
  seccionId: z.string().uuid().optional(),
  cursoId: z.string().uuid().optional(),
  docenteId: z.string().uuid().optional(),
  visible: z
    .string()
    .optional()
    .transform((v) => (v === 'false' ? false : v === 'true' ? true : undefined)),
});

export type CreateMaterialInput = z.infer<typeof CreateMaterialSchema>;
export type UpdateMaterialInput = z.infer<typeof UpdateMaterialSchema>;
export type ListMaterialesQuery = z.infer<typeof ListMaterialesQuery>;
