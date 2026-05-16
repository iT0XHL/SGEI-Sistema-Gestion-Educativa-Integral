// ============================================================
//  types/roles.ts — Roles RBAC.
//  Coinciden EXACTAMENTE con el ENUM auth_schema.rol_usuario.
//  No existe rol "Padre": el alumno accede con su propio usuario.
// ============================================================

export const ROLES = ['Admin', 'Secretaria', 'Docente', 'Alumno'] as const;

export type RolUsuario = (typeof ROLES)[number];

/** Discriminador polimórfico de perfil_usuario.entidad_tipo. */
export const ENTIDAD_TIPOS = [
  'admin',
  'secretaria',
  'docente',
  'alumno',
] as const;

export type EntidadTipo = (typeof ENTIDAD_TIPOS)[number];

export function isRol(value: unknown): value is RolUsuario {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}
