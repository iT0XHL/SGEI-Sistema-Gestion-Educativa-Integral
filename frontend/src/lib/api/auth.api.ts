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
}

export interface LoginResponse {
  user:       SessionUser;
  redirectTo: string;
}

export interface ChangePasswordPayload {
  password_actual: string;
  password_nueva:  string;
}

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

  forgotPassword(email: string): Promise<{ enviado: boolean }> {
    return apiClient.post<{ enviado: boolean }>('/api/auth/forgot-password', { email });
  },

  resetPassword(token: string, password_nueva: string): Promise<{ actualizada: boolean }> {
    return apiClient.post<{ actualizada: boolean }>('/api/auth/reset-password', { token, password_nueva });
  },
};
