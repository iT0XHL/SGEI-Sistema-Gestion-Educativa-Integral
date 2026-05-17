import type {
  Notificacion,
  ContadorNotificaciones,
  CrearNotificacionPayload,
} from '../../types/notificacion';

const BASE = `${import.meta.env.VITE_API_URL}/api/notificaciones`;

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res  = await fetch(url, { credentials: 'include', ...init });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? 'Error');
  return json.data as T;
}

export const notificacionesApi = {
  listar(leida?: boolean): Promise<Notificacion[]> {
    const url = new URL(BASE);
    if (leida !== undefined) url.searchParams.set('leida', String(leida));
    return request<Notificacion[]>(url.toString());
  },

  contar(): Promise<ContadorNotificaciones> {
    return request<ContadorNotificaciones>(`${BASE}/contar`);
  },

  marcarLeida(id: string): Promise<{ actualizada: boolean }> {
    return request<{ actualizada: boolean }>(`${BASE}/${id}/leer`, { method: 'PATCH' });
  },

  marcarTodasLeidas(): Promise<{ actualizadas: number }> {
    return request<{ actualizadas: number }>(`${BASE}/leer-todas`, { method: 'PATCH' });
  },

  crear(payload: CrearNotificacionPayload): Promise<Notificacion> {
    return request<Notificacion>(BASE, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
  },
};
