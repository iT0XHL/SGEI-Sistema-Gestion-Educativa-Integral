import { apiClient } from './client';
import type { RolUsuario } from '../../types/roles';

export interface LoginPayload {
  email:    string;
  password: string;
  rol:      RolUsuario;
}

export interface SessionUser {
  id:          string;
  rol:         RolUsuario;
  nombre:      string;
  entidadId:   string;
  entidadTipo: string;
  /** TRUE = debe cambiar la contraseña; AppShell muestra el modal obligatorio. */
  debeCambiarPassword?: boolean;
}

export interface LoginResponse {
  user:                 SessionUser;
  redirectTo:          string;
  debeCambiarPassword?: boolean;
}

export interface ChangePasswordPayload {
  password_actual: string;
  password_nueva:  string;
}

export interface ForceChangePasswordPayload {
  password_nueva: string;
  confirmacion:   string;
}

export type { SessionUser };

export const authApi = {
  login(payload: LoginPayload): Promise<LoginResponse> {
    return apiClient.post<LoginResponse>('/api/auth/login', payload);
  },

  logout(): Promise<{ mensaje: string }> {
    return apiClient.post<{ mensaje: string }>('/api/auth/logout', {});
  },

  me(): Promise<SessionUser> {
    return apiClient.get<SessionUser>('/api/auth/me');
  },

  changePassword(payload: ChangePasswordPayload): Promise<{ mensaje: string }> {
    return apiClient.patch<{ mensaje: string }>('/api/auth/change-password', payload);
  },

  forceChangePassword(payload: ForceChangePasswordPayload): Promise<LoginResponse> {
    return apiClient.post<LoginResponse>('/api/auth/force-change-password', payload);
  },
};
