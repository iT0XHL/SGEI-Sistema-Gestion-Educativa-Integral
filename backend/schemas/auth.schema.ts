// ============================================================
//  schemas/auth.schema.ts — Validación Zod del módulo Auth.
// ============================================================
import { z } from 'zod';
import { ROLES } from '@/types/roles';

export const LoginSchema = z.object({
  email: z.string().trim().email('Correo institucional inválido').max(50),
  password: z.string().min(6, 'La contraseña es muy corta').max(128),
  rol: z.enum(ROLES),
});
export type LoginInput = z.infer<typeof LoginSchema>;

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
