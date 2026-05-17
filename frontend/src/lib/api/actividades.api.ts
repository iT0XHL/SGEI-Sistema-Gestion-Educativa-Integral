// ============================================================
//  lib/api/actividades.api.ts — Llamadas al backend de actividades.
// ============================================================
import { apiClient } from './client';
import type {
  Actividad,
  Entrega,
  CreateActividadPayload,
  UpdateActividadPayload,
  SubmitEntregaPayload,
  CalificarEntregaPayload,
} from '../../types/actividad';

export const actividadesApi = {
  /** Lista actividades con filtros. */
  listar(params: { seccionId?: string; cursoId?: string; tipo?: string }) {
    return apiClient.get<Actividad[]>('/api/actividades', {
      seccionId: params.seccionId,
      cursoId: params.cursoId,
      tipo: params.tipo,
    });
  },

  /** Obtiene una actividad por ID. */
  obtener(id: string) {
    return apiClient.get<Actividad>(`/api/actividades/${id}`);
  },

  /** Crea actividad sin adjunto o con URL externa. */
  crear(payload: CreateActividadPayload) {
    return apiClient.post<Actividad>('/api/actividades', payload);
  },

  /** Crea actividad subiendo un adjunto (PDF/doc). */
  crearConArchivo(
    params: Omit<CreateActividadPayload, 'url_adjunto'> & { archivo: File },
  ) {
    const fd = new FormData();
    fd.append('curso_id', params.curso_id);
    fd.append('seccion_id', params.seccion_id);
    fd.append('titulo', params.titulo);
    if (params.descripcion) fd.append('descripcion', params.descripcion);
    if (params.tipo) fd.append('tipo', params.tipo);
    fd.append('fecha_limite', params.fecha_limite);
    fd.append('puntaje_maximo', String(params.puntaje_maximo));
    fd.append('archivo', params.archivo);
    return apiClient.postFormData<Actividad>('/api/actividades', fd);
  },

  /** Actualiza una actividad. */
  actualizar(id: string, payload: UpdateActividadPayload) {
    return apiClient.patch<Actividad>(`/api/actividades/${id}`, payload);
  },

  /** Elimina una actividad. */
  eliminar(id: string) {
    return apiClient.delete<{ id: string }>(`/api/actividades/${id}`);
  },

  /** URL firmada del adjunto del docente. */
  getAdjuntoUrl(id: string) {
    return apiClient.get<{ url: string; es_firmada: boolean }>(`/api/actividades/${id}/adjunto`);
  },

  // ── Entregas ────────────────────────────────────────────────

  /** Lista entregas de una actividad (Docente/Admin) o la propia (Alumno). */
  listarEntregas(actividadId: string) {
    return apiClient.get<Entrega[]>(`/api/actividades/${actividadId}/entregas`);
  },

  /** Alumno entrega sin archivo. */
  entregar(actividadId: string, payload: SubmitEntregaPayload) {
    return apiClient.post<Entrega>(`/api/actividades/${actividadId}/entregas`, payload);
  },

  /** Alumno entrega con archivo. */
  entregarConArchivo(actividadId: string, archivo: File, comentario?: string) {
    const fd = new FormData();
    fd.append('archivo', archivo);
    if (comentario) fd.append('comentario_alumno', comentario);
    return apiClient.postFormData<Entrega>(`/api/actividades/${actividadId}/entregas`, fd);
  },

  /** Docente califica una entrega. */
  calificar(actividadId: string, entregaId: string, payload: CalificarEntregaPayload) {
    return apiClient.patch<Entrega>(
      `/api/actividades/${actividadId}/entregas/${entregaId}`,
      payload,
    );
  },

  /** URL firmada del archivo de una entrega. */
  getEntregaArchivoUrl(actividadId: string, entregaId: string) {
    return apiClient.get<{ url: string; es_firmada: boolean }>(
      `/api/actividades/${actividadId}/entregas/${entregaId}`,
    );
  },
};
