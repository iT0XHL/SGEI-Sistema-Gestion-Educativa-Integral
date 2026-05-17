import { apiClient } from './client';
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
};
