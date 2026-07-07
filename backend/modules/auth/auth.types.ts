// ============================================================
//  modules/auth/auth.types.ts
// ============================================================
import type { RolUsuario } from '@/types/roles';

/** Usuario expuesto al frontend tras login / en /me. */
export interface SessionUser {
  id: string; // perfil_usuario.id
  rol: RolUsuario;
  nombre: string;
  entidadId: string;
  entidadTipo: string;
  /** TRUE = debe cambiar la contraseña; el frontend muestra el modal obligatorio. */
  debeCambiarPassword: boolean;
}

export interface LoginResult {
  token: string;
  user: SessionUser;
  redirectTo: string;
  debeCambiarPassword?: boolean;
}

/** Ruta inicial por rol tras el login. */
export const REDIRECT_BY_ROLE: Record<RolUsuario, string> = {
  Admin: '/admin/inicio',
  Secretaria: '/secretaria/inicio',
  Docente: '/docente/inicio',
  Alumno: '/alumno/inicio',
};
