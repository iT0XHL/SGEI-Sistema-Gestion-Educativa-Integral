import { apiClient } from './client';
import type { RolUsuario } from '../../types/roles';

export interface LoginPayload {
  email:    string;
  password: string;
  rol:      RolUsuario;
}

export interface SessionUser {
  perfilId:    string;
  rol:         RolUsuario;
  nombre:      string;
  entidadId:   string;
  entidadTipo: string;
  redirectTo:  string;
}

export interface ChangePasswordPayload {
  password_actual: string;
  password_nueva:  string;
}

export const authApi = {
  login(payload: LoginPayload): Promise<SessionUser> {
    return apiClient.post<SessionUser>('/api/auth/login', payload);
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
};
