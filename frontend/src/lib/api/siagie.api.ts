import type { SiagieStats, SiagieValidacion } from '../../types/siagie';

const BASE = `${import.meta.env.VITE_API_URL}/api/siagie`;

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? 'Error');
  return json.data as T;
}

export const siagieApi = {
  stats(periodoId?: string): Promise<SiagieStats> {
    const url = new URL(BASE);
    if (periodoId) url.searchParams.set('periodoId', periodoId);
    return get<SiagieStats>(url.toString());
  },

  validar(periodoId?: string): Promise<SiagieValidacion[]> {
    const url = new URL(`${BASE}/validar`);
    if (periodoId) url.searchParams.set('periodoId', periodoId);
    return get<SiagieValidacion[]>(url.toString());
  },

  async refresh(): Promise<{ mensaje: string }> {
    const res = await fetch(`${BASE}/refresh`, {
      method:      'POST',
      credentials: 'include',
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error?.message ?? 'Error al refrescar');
    return json.data;
  },

  async exportar(periodoId?: string): Promise<void> {
    const url = new URL(`${BASE}/exportar`);
    if (periodoId) url.searchParams.set('periodoId', periodoId);

    const res = await fetch(url.toString(), { credentials: 'include' });
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
