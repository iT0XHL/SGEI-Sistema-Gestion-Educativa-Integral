import type { SituacionFinalAlumno, UpsertSfaPayload } from '../../types/situacion-final';

const BASE = `${import.meta.env.VITE_API_URL}/api/situacion-final`;

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res  = await fetch(url, { credentials: 'include', ...init });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? 'Error');
  return json.data as T;
}

export const sfaApi = {
  listar(params: { periodoId?: string; seccionId?: string; alumnoId?: string } = {}): Promise<SituacionFinalAlumno[]> {
    const url = new URL(BASE);
    if (params.periodoId) url.searchParams.set('periodoId', params.periodoId);
    if (params.seccionId) url.searchParams.set('seccionId', params.seccionId);
    if (params.alumnoId)  url.searchParams.set('alumnoId',  params.alumnoId);
    return request<SituacionFinalAlumno[]>(url.toString());
  },

  obtener(alumnoId: string, periodoId: string): Promise<SituacionFinalAlumno> {
    return request<SituacionFinalAlumno>(`${BASE}/${alumnoId}?periodoId=${periodoId}`);
  },

  upsert(payload: UpsertSfaPayload): Promise<SituacionFinalAlumno> {
    return request<SituacionFinalAlumno>(BASE, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
  },

  eliminar(alumnoId: string, periodoId: string): Promise<void> {
    return request<void>(`${BASE}/${alumnoId}?periodoId=${periodoId}`, { method: 'DELETE' });
  },
};
