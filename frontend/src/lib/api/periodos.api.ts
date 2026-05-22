import { apiClient } from './client';

export interface PeriodoRow {
  id: string;
  anio: number;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
}

export interface BimestreRow {
  id: string;
  periodo_id: string;
  numero: number;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  cerrado: boolean;
  periodo?: { nombre: string; anio: number };
}

export interface ApiPaginatedResponse<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export const periodosApi = {
  listar(params: { activo?: boolean; page?: number; limit?: number } = {}): Promise<ApiPaginatedResponse<PeriodoRow>> {
    const q: Record<string, string> = {};
    if (params.activo !== undefined) q.activo = String(params.activo);
    if (params.page) q.page = String(params.page);
    if (params.limit) q.limit = String(params.limit);
    return apiClient.get<ApiPaginatedResponse<PeriodoRow>>('/api/periodos', Object.keys(q).length ? q : undefined);
  },

  crear(payload: {
    anio: number;
    nombre: string;
    fecha_inicio: string;
    fecha_fin: string;
    activo?: boolean;
  }): Promise<PeriodoRow> {
    return apiClient.post<PeriodoRow>('/api/periodos', payload);
  },

  actualizar(id: string, payload: {
    nombre?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
    activo?: boolean;
  }): Promise<PeriodoRow> {
    return apiClient.patch<PeriodoRow>(`/api/periodos/${id}`, payload);
  },

  setActivo(id: string, activo: boolean): Promise<PeriodoRow> {
    return apiClient.put<PeriodoRow>(`/api/periodos/${id}`, { activo });
  },

  eliminar(id: string): Promise<{ id: string; eliminado: boolean }> {
    return apiClient.delete(`/api/periodos/${id}`);
  },
};

export const bimestresApi = {
  listar(params: { periodoId?: string; page?: number; limit?: number } = {}): Promise<ApiPaginatedResponse<BimestreRow>> {
    const q: Record<string, string> = {};
    if (params.periodoId) q.periodoId = params.periodoId;
    if (params.page) q.page = String(params.page);
    if (params.limit) q.limit = String(params.limit);
    return apiClient.get<ApiPaginatedResponse<BimestreRow>>('/api/bimestres', Object.keys(q).length ? q : undefined);
  },

  crear(payload: {
    periodo_id: string;
    numero: number;
    nombre: string;
    fecha_inicio: string;
    fecha_fin: string;
  }): Promise<BimestreRow> {
    return apiClient.post<BimestreRow>('/api/bimestres', payload);
  },

  actualizar(id: string, payload: {
    nombre?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
    cerrado?: boolean;
  }): Promise<BimestreRow> {
    return apiClient.patch<BimestreRow>(`/api/bimestres/${id}`, payload);
  },

  eliminar(id: string): Promise<{ id: string; eliminado: boolean }> {
    return apiClient.delete(`/api/bimestres/${id}`);
  },
};
