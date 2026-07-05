import { apiClient, BASE_URL } from './client';
import type {
  Nota,
  UpsertBatchNotaPayload,
  UpdateNotaPayload,
  DesbloquearNotaPayload,
} from '../../types/nota';

export interface ListarNotasParams {
  alumnoId?:      string;
  bimestreId?:    string;
  competenciaId?: string;
  docenteId?:     string;
  seccionId?:     string;
  cerrada?:       boolean;
}

export interface PreviewCelda {
  competencia_id: string;
  competencia_nombre: string;
  valor: number | null;
  error?: string;
}

export interface PreviewFila {
  alumno_id: string;
  alumno_nombre: string;
  dni: string;
  errores: string[];
  celdas: PreviewCelda[];
}

export interface PreviewImportacion {
  asignacion_label: string;
  bimestre_nombre: string;
  columnas_obsoletas: string[];
  columnas_faltantes: string[];
  filas: PreviewFila[];
  resumen: { total_filas: number; celdas_validas: number; celdas_con_error: number };
}

export const notasApi = {
  listar(params: ListarNotasParams = {}): Promise<Nota[]> {
    const q: Record<string, string> = {};
    if (params.alumnoId)      q.alumnoId      = params.alumnoId;
    if (params.bimestreId)    q.bimestreId    = params.bimestreId;
    if (params.competenciaId) q.competenciaId = params.competenciaId;
    if (params.docenteId)     q.docenteId     = params.docenteId;
    if (params.seccionId)     q.seccionId     = params.seccionId;
    if (params.cerrada !== undefined) q.cerrada = String(params.cerrada);
    return apiClient.get<Nota[]>('/api/notas', q);
  },

  obtener(id: string): Promise<Nota> {
    return apiClient.get<Nota>(`/api/notas/${id}`);
  },

  upsertBatch(payload: UpsertBatchNotaPayload): Promise<{ registradas: number; notas: Nota[] }> {
    return apiClient.post('/api/notas', payload);
  },

  actualizar(id: string, payload: UpdateNotaPayload): Promise<Nota> {
    return apiClient.patch<Nota>(`/api/notas/${id}`, payload);
  },

  desbloquear(id: string, payload: DesbloquearNotaPayload): Promise<Nota> {
    return apiClient.post<Nota>(`/api/notas/${id}/desbloquear`, payload);
  },

  /** Descarga la plantilla Excel de ingreso de notas para una asignación + bimestre. */
  async descargarPlantilla(asignacionId: string, bimestreId: string): Promise<Blob> {
    const q = new URLSearchParams({ asignacionId, bimestreId });
    const res = await fetch(`${BASE_URL}/api/notas/plantilla?${q.toString()}`, { credentials: 'include' });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error((json as { error?: { message?: string } })?.error?.message ?? `Error al generar la plantilla (${res.status})`);
    }
    return res.blob();
  },

  /** Sube la plantilla llenada y obtiene la vista previa validada (no guarda nada todavía). */
  previsualizarImportacion(archivo: File): Promise<PreviewImportacion> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return apiClient.postFormData<PreviewImportacion>('/api/notas/importar/preview', formData);
  },
};
