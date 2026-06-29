// ============================================================
//  lib/api/siagie.api.ts — Usa apiClient para JSON. El exportar
//  baja un .xlsx por blob, así que necesita fetch directo: ahí
//  reusamos la misma BASE_URL con fallback que client.ts.
// ============================================================
import { apiClient, BASE_URL } from './client';
import type { SiagieStats, SiagieValidacion } from '../../types/siagie';

export const siagieApi = {
  stats(periodoId?: string): Promise<SiagieStats> {
    return apiClient.get<SiagieStats>(
      '/api/siagie',
      periodoId ? { periodoId } : undefined,
    );
  },

  validar(periodoId?: string): Promise<SiagieValidacion[]> {
    return apiClient.get<SiagieValidacion[]>(
      '/api/siagie/validar',
      periodoId ? { periodoId } : undefined,
    );
  },

  refresh(): Promise<{ mensaje: string }> {
    return apiClient.post<{ mensaje: string }>('/api/siagie/refresh', {});
  },

  async exportar(periodoId?: string): Promise<void> {
    const qs   = periodoId ? `?periodoId=${encodeURIComponent(periodoId)}` : '';
    const res  = await fetch(`${BASE_URL}/api/siagie/exportar${qs}`, {
      credentials: 'include',
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error((json as { error?: { message?: string } }).error?.message ?? 'Error al exportar');
    }

    const blob     = await res.blob();
    const disposition = res.headers.get('content-disposition') ?? '';
    const match    = disposition.match(/filename="?([^"]+)"?/);
    const filename = match?.[1] ?? 'SIAGIE.xlsx';

    const a = document.createElement('a');
    a.href  = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  },
};
