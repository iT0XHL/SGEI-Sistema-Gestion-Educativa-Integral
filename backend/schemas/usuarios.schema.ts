// ============================================================
//  schemas/usuarios.schema.ts — Validación Zod del módulo Cuentas.
// ============================================================
import { z } from 'zod';
import { ROLES } from '@/types/roles';

/**
 * Creación de cuentas de PERSONAL (Admin / Secretaria).
 * Las cuentas de Docente y Alumno se crean en sus propios
 * endpoints (/api/docentes, /api/alumnos — Fase 4) porque
 * requieren registrar además su entidad académica.
 */
export const CreateUsuarioSchema = z.object({
  usuario_login: z
    .string()
    .trim()
    .email('El usuario debe ser un correo institucional válido')
    .max(50),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(128),
  rol: z.enum(['Admin', 'Secretaria'], {
    errorMap: () => ({
      message: 'Solo se pueden crear cuentas Admin o Secretaria por este endpoint',
    }),
  }),
});
export type CreateUsuarioInput = z.infer<typeof CreateUsuarioSchema>;

export const UpdateUsuarioSchema = z
  .object({
    rol: z.enum(ROLES).optional(),
    activo: z.boolean().optional(),
  })
  .refine((d) => d.rol !== undefined || d.activo !== undefined, {
    message: 'Debes enviar al menos un campo a actualizar',
  });
export type UpdateUsuarioInput = z.infer<typeof UpdateUsuarioSchema>;

export const ListUsuariosQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  rol: z.enum(ROLES).optional(),
  activo: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type ListUsuariosQuery = z.infer<typeof ListUsuariosQuerySchema>;
