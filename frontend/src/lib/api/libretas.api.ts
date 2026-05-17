import { apiClient } from './client';
import type { LibretaRow } from '../../types/nota';

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
};
