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
    usuario_login: z
      .string()
      .trim()
      .email('Debe ser un correo válido')
      .max(50)
      .optional(),
    nombres: z.string().trim().min(2).max(100).optional(),
    apellido_paterno: z.string().trim().min(2).max(60).optional(),
    apellido_materno: z.string().trim().min(2).max(60).optional(),
    rol: z.enum(ROLES).optional(),
    activo: z.boolean().optional(),
  })
  .refine((d) =>
    d.usuario_login !== undefined ||
    d.nombres !== undefined ||
    d.apellido_paterno !== undefined ||
    d.apellido_materno !== undefined ||
    d.rol !== undefined ||
    d.activo !== undefined,
    {
      message: 'Debes enviar al menos un campo a actualizar',
    }
  );
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

export const ChangePasswordSchema = z
  .object({
    password_actual: z.string().min(1, 'Ingresa tu contraseña actual'),
    password_nueva: z
      .string()
      .min(8, 'La nueva contraseña debe tener al menos 8 caracteres')
      .max(128),
  })
  .refine((d) => d.password_actual !== d.password_nueva, {
    message: 'La nueva contraseña debe ser distinta de la actual',
    path: ['password_nueva'],
  });
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

export const AdminResetPasswordSchema = z.object({
  password_nueva: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(128),
});
export type AdminResetPasswordInput = z.infer<typeof AdminResetPasswordSchema>;
