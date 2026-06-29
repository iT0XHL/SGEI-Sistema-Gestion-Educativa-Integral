import { apiClient, BASE_URL } from './client';
import type { BoletaPago, RevisarBoletaPayload, EstadoRevisionBoleta } from '../../types/pago';

export interface ListarBoletasParams {
  alumnoId?:       string;
  pagoId?:         string;
  estadoRevision?: EstadoRevisionBoleta;
}

export const boletasApi = {
  listar(params: ListarBoletasParams = {}): Promise<BoletaPago[]> {
    const q: Record<string, string> = {};
    if (params.alumnoId)       q.alumnoId       = params.alumnoId;
    if (params.pagoId)         q.pagoId         = params.pagoId;
    if (params.estadoRevision) q.estadoRevision = params.estadoRevision;
    return apiClient.get<BoletaPago[]>('/api/boletas', q);
  },

  obtener(id: string): Promise<BoletaPago> {
    return apiClient.get<BoletaPago>(`/api/boletas/${id}`);
  },

  async subir(payload: {
    pago_id:           string;
    archivo:           File;
    banco?:            string;
    numero_operacion?: string;
  }): Promise<BoletaPago> {
    const form = new FormData();
    form.append('archivo',  payload.archivo);
    form.append('pago_id',  payload.pago_id);
    if (payload.banco)            form.append('banco',            payload.banco);
    if (payload.numero_operacion) form.append('numero_operacion', payload.numero_operacion);

    const res = await fetch(`${BASE_URL}/api/boletas`, {
      method:      'POST',
      body:        form,
      credentials: 'include',
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error((json as { error?: { message?: string } })?.error?.message ?? `Error al subir boleta (${res.status})`);
    }
    const json = await res.json();
    return (json as { data: BoletaPago }).data;
  },

  revisar(payload: RevisarBoletaPayload): Promise<BoletaPago> {
    return apiClient.post<BoletaPago>('/api/boletas/revisar', payload);
  },

  getArchivoUrl(id: string): Promise<{ url: string; expira_en: number | null }> {
    return apiClient.get<{ url: string; expira_en: number | null }>(`/api/boletas/${id}/archivo`);
  },
};
