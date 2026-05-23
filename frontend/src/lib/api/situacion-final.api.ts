// ============================================================
//  lib/api/situacion-final.api.ts — Cliente HTTP para situación
//  final de alumnos (SFA). Usa apiClient compartido para que
//  herede BASE_URL, credenciales y manejo unificado de errores.
// ============================================================
import { apiClient } from './client';
import type { SituacionFinalAlumno, UpsertSfaPayload } from '../../types/situacion-final';

export interface ListarSfaParams {
  periodoId?: string;
  seccionId?: string;
  alumnoId?:  string;
}

export const sfaApi = {
  listar(params: ListarSfaParams = {}): Promise<SituacionFinalAlumno[]> {
    const q: Record<string, string> = {};
    if (params.periodoId) q.periodoId = params.periodoId;
    if (params.seccionId) q.seccionId = params.seccionId;
    if (params.alumnoId)  q.alumnoId  = params.alumnoId;
    return apiClient.get<SituacionFinalAlumno[]>(
      '/api/situacion-final',
      Object.keys(q).length ? q : undefined,
    );
  },

  obtener(alumnoId: string, periodoId: string): Promise<SituacionFinalAlumno> {
    return apiClient.get<SituacionFinalAlumno>(
      `/api/situacion-final/${alumnoId}`,
      { periodoId },
    );
  },

  upsert(payload: UpsertSfaPayload): Promise<SituacionFinalAlumno> {
    return apiClient.post<SituacionFinalAlumno>('/api/situacion-final', payload);
  },

  eliminar(alumnoId: string, periodoId: string): Promise<void> {
    return apiClient.delete<void>(`/api/situacion-final/${alumnoId}?periodoId=${periodoId}`);
  },
};
