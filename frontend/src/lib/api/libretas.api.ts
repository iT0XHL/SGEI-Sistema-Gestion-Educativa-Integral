import { apiClient } from './client';
import type { LibretaRow } from '../../types/nota';
import type { RecepcionRow, ResumenAlumnoLibreta, LibretaDTO } from '../../types/libreta';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export const libretasApi = {
  obtener(alumnoId: string, bimestreId?: string): Promise<LibretaRow[]> {
    const q: Record<string, string> = {};
    if (bimestreId) q.bimestreId = bimestreId;
    return apiClient.get<LibretaRow[]>(`/api/libretas/${alumnoId}`, q);
  },

  async descargarPdf(alumnoId: string, bimestreId?: string): Promise<Blob> {
    const q = new URLSearchParams();
    if (bimestreId) q.set('bimestreId', bimestreId);
    const qs  = q.toString();
    const url = `${BASE_URL}/api/libretas/${alumnoId}/pdf${qs ? `?${qs}` : ''}`;
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error((json as { error?: { message?: string } })?.error?.message ?? `Error al generar PDF (${res.status})`);
    }
    return res.blob();
  },

  estadoRecepcion(params?: Record<string, string>): Promise<RecepcionRow[]> {
    return apiClient.get<RecepcionRow[]>('/api/libretas/estado-recepcion', params);
  },

  resumenSeccion(seccionId: string, bimestreId?: string): Promise<ResumenAlumnoLibreta[]> {
    const q: Record<string, string> = {};
    if (bimestreId) q.bimestreId = bimestreId;
    return apiClient.get<ResumenAlumnoLibreta[]>(`/api/libretas/secciones/${seccionId}/resumen`, q);
  },

  generar(alumnoId: string, bimestreId: string): Promise<LibretaDTO> {
    return apiClient.post<LibretaDTO>('/api/libretas/generar', { alumnoId, bimestreId });
  },

  generarLote(seccionId: string, bimestreId: string): Promise<{ alumno_id: string; exito: boolean; error?: string }[]> {
    return apiClient.post('/api/libretas/generar-lote', { seccionId, bimestreId });
  },

  aprobar(id: string, observacion?: string): Promise<LibretaDTO> {
    return apiClient.patch<LibretaDTO>(`/api/libretas/aprobar/${id}`, { observacion });
  },

  observar(id: string, observacion: string): Promise<LibretaDTO> {
    return apiClient.patch<LibretaDTO>(`/api/libretas/observar/${id}`, { observacion });
  },

  publicar(id: string, observacion?: string): Promise<LibretaDTO> {
    return apiClient.patch<LibretaDTO>(`/api/libretas/publicar/${id}`, { observacion });
  },

  anular(id: string, observacion?: string): Promise<LibretaDTO> {
    return apiClient.patch<LibretaDTO>(`/api/libretas/anular/${id}`, { observacion });
  },

  async descargarLote(seccionId: string, bimestreId: string, periodoId?: string): Promise<Blob> {
    const params: Record<string, string> = { seccionId, bimestreId };
    if (periodoId) params.periodoId = periodoId;
    const q = new URLSearchParams(params);
    const url = `${BASE_URL}/api/libretas/exportar-lote?${q}`;
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error((json as { error?: { message?: string } })?.error?.message ?? 'Error al exportar lote');
    }
    return res.blob();
  },
};
