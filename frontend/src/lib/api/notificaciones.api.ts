// ============================================================
//  lib/api/notificaciones.api.ts — Usa apiClient compartido
//  para heredar BASE_URL, credenciales y manejo de errores.
// ============================================================
import { apiClient } from './client';
import type {
  Notificacion,
  ContadorNotificaciones,
  CrearNotificacionPayload,
} from '../../types/notificacion';

export const notificacionesApi = {
  listar(leida?: boolean): Promise<Notificacion[]> {
    return apiClient.get<Notificacion[]>(
      '/api/notificaciones',
      leida !== undefined ? { leida: String(leida) } : undefined,
    );
  },

  contar(): Promise<ContadorNotificaciones> {
    return apiClient.get<ContadorNotificaciones>('/api/notificaciones/contar');
  },

  marcarLeida(id: string): Promise<{ actualizada: boolean }> {
    return apiClient.patch<{ actualizada: boolean }>(`/api/notificaciones/${id}/leer`, {});
  },

  marcarTodasLeidas(): Promise<{ actualizadas: number }> {
    return apiClient.patch<{ actualizadas: number }>('/api/notificaciones/leer-todas', {});
  },

  crear(payload: CrearNotificacionPayload): Promise<Notificacion> {
    return apiClient.post<Notificacion>('/api/notificaciones', payload);
  },
};
