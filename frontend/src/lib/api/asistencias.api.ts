// ============================================================
//  lib/api/asistencias.api.ts — Llamadas al backend de asistencias
//  (alumnos y docentes).
// ============================================================
import { apiClient } from './client';
import type {
  AsistenciaRegistro,
  AsistenciaDocenteRegistro,
  EstadoAsistencia,
  GuardarAsistenciaPayload,
  ResumenAsistencia,
} from '../../types/asistencia';

export interface AsistenciaDocenteRow {
  id: string;
  docente_id: string;
  docente?: {
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string;
    dni: string;
  };
  fecha: string;
  estado: 'P' | 'F' | 'T' | 'J';
  justificacion: string | null;
  hora_registro: string;
  registrador?: { usuario_login: string };
}

export interface DocenteRow {
  id: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  dni: string;
  activo: boolean;
}

export interface ApiPaginatedResponse<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

const ESTADOS = {
  P: 'Presente',
  F: 'Falta',
  T: 'Tardanza',
  J: 'Justificado',
} as const;

export function getEstadoLabel(estado: string): string {
  return ESTADOS[estado as keyof typeof ESTADOS] || estado;
}

export function getEstadoColor(estado: string): string {
  const colors: Record<string, string> = {
    P: 'bg-green-100 text-green-800 border-green-300',
    F: 'bg-red-100 text-red-800 border-red-300',
    T: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    J: 'bg-blue-100 text-blue-800 border-blue-300',
  };
  return colors[estado] || 'bg-slate-100 text-slate-800 border-slate-300';
}

// ── Asistencia de alumnos ─────────────────────────────────────

export const asistenciasApi = {
  /** Lista registros de asistencia. */
  listar(params: {
    seccionId?: string;
    alumnoId?: string;
    estado?: EstadoAsistencia;
    fecha?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    limit?: number;
    offset?: number;
  }) {
    return apiClient.get<AsistenciaRegistro[]>('/api/asistencias/alumnos', {
      seccionId: params.seccionId,
      alumnoId: params.alumnoId,
      estado: params.estado,
      fecha: params.fecha,
      fechaDesde: params.fechaDesde,
      fechaHasta: params.fechaHasta,
      limit: params.limit !== undefined ? String(params.limit) : undefined,
      offset: params.offset !== undefined ? String(params.offset) : undefined,
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
  listar(params: {
    docenteId?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
    estado?: 'P' | 'F' | 'T' | 'J';
    page?: number;
    limit?: number;
  } = {}) {
    const q: Record<string, string> = {};
    if (params.docenteId) q.docenteId = params.docenteId;
    if (params.fecha_inicio) q.fecha_inicio = params.fecha_inicio;
    if (params.fecha_fin) q.fecha_fin = params.fecha_fin;
    if (params.estado) q.estado = params.estado;
    if (params.page) q.page = String(params.page);
    if (params.limit) q.limit = String(params.limit);
    return apiClient.get<ApiPaginatedResponse<AsistenciaDocenteRow>>('/api/asistencias', Object.keys(q).length ? q : undefined);
  },

  crear(payload: {
    docente_id: string;
    fecha: string;
    estado: 'P' | 'F' | 'T' | 'J';
    justificacion?: string | null;
  }) {
    return apiClient.post<AsistenciaDocenteRow>('/api/asistencias', payload);
  },

  obtener(id: string) {
    return apiClient.get<AsistenciaDocenteRow>(`/api/asistencias/${id}`);
  },

  actualizar(id: string, data: { estado?: 'P' | 'F' | 'T' | 'J'; justificacion?: string | null }) {
    return apiClient.patch<AsistenciaDocenteRow>(`/api/asistencias/${id}`, data);
  },

  eliminar(id: string) {
    return apiClient.delete<{ id: string; eliminado: boolean }>(`/api/asistencias/${id}`);
  },
};

export async function cargarDocentes(): Promise<DocenteRow[]> {
  try {
    const response = await apiClient.get<ApiPaginatedResponse<DocenteRow>>('/api/docentes', {
      page: '1',
      limit: '500',
      activo: 'true',
    });
    return response?.items || [];
  } catch (err) {
    console.error('Error loading docentes:', err);
    return [];
  }
}
