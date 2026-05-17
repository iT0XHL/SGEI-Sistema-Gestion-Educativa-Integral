// ============================================================
//  lib/api/materiales.api.ts — Llamadas al backend de materiales.
// ============================================================
import { apiClient } from './client';
import type {
  Material,
  CreateMaterialUrlPayload,
  UpdateMaterialPayload,
  ArchivoUrlResponse,
} from '../../types/material';

export const materialesApi = {
  /** Lista materiales con filtros opcionales. */
  listar(params: { seccionId?: string; cursoId?: string; docenteId?: string; visible?: boolean }) {
    return apiClient.get<Material[]>('/api/materiales', {
      seccionId: params.seccionId,
      cursoId: params.cursoId,
      docenteId: params.docenteId,
      visible: params.visible !== undefined ? String(params.visible) : undefined,
    });
  },

  /** Obtiene un material por ID. */
  obtener(id: string) {
    return apiClient.get<Material>(`/api/materiales/${id}`);
  },

  /** Crea material con URL externa (enlace/video). */
  crearConUrl(payload: CreateMaterialUrlPayload) {
    return apiClient.post<Material>('/api/materiales', payload);
  },

  /** Crea material subiendo un archivo (PDF/imagen/otro). */
  crearConArchivo(params: {
    curso_id: string;
    seccion_id: string;
    titulo: string;
    descripcion?: string;
    tipo: 'PDF' | 'imagen' | 'otro';
    visible?: boolean;
    archivo: File;
  }) {
    const fd = new FormData();
    fd.append('curso_id', params.curso_id);
    fd.append('seccion_id', params.seccion_id);
    fd.append('titulo', params.titulo);
    if (params.descripcion) fd.append('descripcion', params.descripcion);
    fd.append('tipo', params.tipo);
    fd.append('visible', String(params.visible ?? true));
    fd.append('archivo', params.archivo);
    return apiClient.postFormData<Material>('/api/materiales', fd);
  },

  /** Actualiza metadatos de un material. */
  actualizar(id: string, payload: UpdateMaterialPayload) {
    return apiClient.patch<Material>(`/api/materiales/${id}`, payload);
  },

  /** Elimina un material y su archivo de Storage. */
  eliminar(id: string) {
    return apiClient.delete<{ id: string }>(`/api/materiales/${id}`);
  },

  /**
   * Obtiene la URL de acceso al archivo del material.
   * - Para PDF/imagen/otro: URL firmada temporal (300 s) de Supabase Storage.
   * - Para enlace/video: la URL externa directamente.
   */
  getArchivoUrl(id: string) {
    return apiClient.get<ArchivoUrlResponse>(`/api/materiales/${id}/archivo`);
  },
};
