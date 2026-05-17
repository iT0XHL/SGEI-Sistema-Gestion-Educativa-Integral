export const ROLES = ['Admin', 'Secretaria', 'Docente', 'Alumno'] as const;
export type RolUsuario = typeof ROLES[number];
