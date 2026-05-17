// ============================================================
//  lib/api/asistencias.api.ts — Llamadas al backend de asistencias.
// ============================================================
import { apiClient } from './client';
import type {
  AsistenciaRegistro,
  AsistenciaDocenteRegistro,
  GuardarAsistenciaPayload,
  ResumenAsistencia,
} from '../../types/asistencia';

// ── Asistencia de alumnos ─────────────────────────────────────

export const asistenciasApi = {
  /** Lista registros de asistencia. */
  listar(params: {
    seccionId?: string;
    alumnoId?: string;
    fecha?: string;
    fechaDesde?: string;
    fechaHasta?: string;
  }) {
    return apiClient.get<AsistenciaRegistro[]>('/api/asistencias/alumnos', {
      seccionId: params.seccionId,
      alumnoId: params.alumnoId,
      fecha: params.fecha,
      fechaDesde: params.fechaDesde,
      fechaHasta: params.fechaHasta,
    });
  },

  /** Guarda asistencia en lote (upsert). */
  guardar(payload: GuardarAsistenciaPayload) {
    return apiClient.post<{ registros_guardados: number; fecha: string; seccion_id: string }>(
      '/api/asistencias/alumnos',
      payload,
    );
  },

  /** Actualiza un registro individual. */
  actualizar(id: string, data: { estado?: string; justificacion?: string | null }) {
    return apiClient.patch<AsistenciaRegistro>(`/api/asistencias/alumnos/${id}`, data);
  },

  /** Elimina un registro (Admin). */
  eliminar(id: string) {
    return apiClient.delete<{ id: string }>(`/api/asistencias/alumnos/${id}`);
  },

  /** Resumen de asistencia por sección usando la vista v_resumen_asistencia. */
  resumen(seccionId: string) {
    return apiClient.get<ResumenAsistencia[]>('/api/asistencias/resumen', { seccionId });
  },
};

// ── Asistencia de docentes (Admin) ────────────────────────────

export const asistenciaDocentesApi = {
  listar(params: { docenteId?: string; fecha?: string; fechaDesde?: string; fechaHasta?: string }) {
    return apiClient.get<AsistenciaDocenteRegistro[]>('/api/asistencias/docentes', {
      docenteId: params.docenteId,
      fecha: params.fecha,
      fechaDesde: params.fechaDesde,
      fechaHasta: params.fechaHasta,
    });
  },

  guardar(payload: {
    fecha: string;
    registros: Array<{ docente_id: string; estado: string; justificacion?: string | null }>;
  }) {
    return apiClient.post<{ registros_guardados: number; fecha: string }>(
      '/api/asistencias/docentes',
      payload,
    );
  },

  actualizar(id: string, data: { estado?: string; justificacion?: string | null }) {
    return apiClient.patch<AsistenciaDocenteRegistro>(`/api/asistencias/docentes/${id}`, data);
  },
};
