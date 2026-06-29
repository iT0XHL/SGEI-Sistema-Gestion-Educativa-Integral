import { apiClient, BASE_URL } from './client';
import type { LibretaRow } from '../../types/nota';
import type { ResumenAlumnoLibreta, RecepcionRow, LibretaDTO } from '../../types/libreta';

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

  // ── Secretaría / Admin: gestión de libretas ──────────────────────

  /** Avance de notas + estado de libreta de cada alumno de una sección. */
  resumenSeccion(seccionId: string, bimestreId?: string): Promise<ResumenAlumnoLibreta[]> {
    const q: Record<string, string> = {};
    if (bimestreId) q.bimestreId = bimestreId;
    return apiClient.get<ResumenAlumnoLibreta[]>(`/api/libretas/secciones/${seccionId}/resumen`, q);
  },

  /** Genera (snapshot) la libreta de un alumno para un bimestre. */
  generar(alumnoId: string, bimestreId: string): Promise<LibretaDTO> {
    return apiClient.post<LibretaDTO>('/api/libretas/generar', { alumnoId, bimestreId });
  },

  /** Genera las libretas de toda la sección. */
  generarLote(seccionId: string, bimestreId: string): Promise<Array<{ alumno_id: string; exito: boolean; error?: string }>> {
    return apiClient.post('/api/libretas/generar-lote', { seccionId, bimestreId });
  },

  aprobar(id: string, observacion?: string): Promise<LibretaDTO> {
    return apiClient.patch<LibretaDTO>(`/api/libretas/aprobar/${id}`, observacion ? { observacion } : {});
  },

  publicar(id: string): Promise<LibretaDTO> {
    return apiClient.patch<LibretaDTO>(`/api/libretas/publicar/${id}`, {});
  },

  observar(id: string, observacion: string): Promise<LibretaDTO> {
    return apiClient.patch<LibretaDTO>(`/api/libretas/observar/${id}`, { observacion });
  },

  anular(id: string): Promise<LibretaDTO> {
    return apiClient.patch<LibretaDTO>(`/api/libretas/anular/${id}`, {});
  },

  /** Estado de recepción de notas por curso/sección. */
  estadoRecepcion(filtros: {
    bimestreId?: string; gradoId?: string; seccionId?: string; cursoId?: string; docenteId?: string;
  } = {}): Promise<RecepcionRow[]> {
    const q: Record<string, string> = {};
    for (const [k, v] of Object.entries(filtros)) if (v) q[k] = v;
    return apiClient.get<RecepcionRow[]>('/api/libretas/estado-recepcion', Object.keys(q).length ? q : undefined);
  },

  /** Descarga un ZIP con las libretas .docx de toda la sección. */
  async descargarLote(seccionId: string, bimestreId: string): Promise<Blob> {
    const url = `${BASE_URL}/api/libretas/exportar-lote?seccionId=${seccionId}&bimestreId=${bimestreId}`;
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error((json as { error?: { message?: string } })?.error?.message ?? `Error al exportar (${res.status})`);
    }
    return res.blob();
  },
};
