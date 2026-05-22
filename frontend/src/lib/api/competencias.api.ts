import { apiClient } from './client';

export interface CompetenciaRow {
  id: string;
  curso_id: string;
  nombre: string;
  descripcion: string | null;
  tipo: 'regular' | 'transversal';
  orden: number;
  curso?: { nombre: string };
}

export interface ApiPaginatedResponse<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export const competenciasApi = {
  listar(params: { cursoId?: string; page?: number; limit?: number } = {}): Promise<ApiPaginatedResponse<CompetenciaRow>> {
    const q: Record<string, string> = {};
    if (params.cursoId) q.cursoId = params.cursoId;
    if (params.page) q.page = String(params.page);
    if (params.limit) q.limit = String(params.limit);
    return apiClient.get<ApiPaginatedResponse<CompetenciaRow>>('/api/competencias', Object.keys(q).length ? q : undefined);
  },

  crear(payload: {
    curso_id: string;
    nombre: string;
    descripcion?: string;
    tipo: 'regular' | 'transversal';
    orden?: number;
  }): Promise<CompetenciaRow> {
    return apiClient.post<CompetenciaRow>('/api/competencias', payload);
  },

  actualizar(id: string, payload: {
    nombre?: string;
    descripcion?: string;
    tipo?: 'regular' | 'transversal';
    orden?: number;
  }): Promise<CompetenciaRow> {
    return apiClient.patch<CompetenciaRow>(`/api/competencias/${id}`, payload);
  },

  eliminar(id: string): Promise<{ id: string; eliminado: boolean }> {
    return apiClient.delete(`/api/competencias/${id}`);
  },

  reordenar(competencias: Array<{ id: string; orden: number }>): Promise<{ reordenadas: number }> {
    return apiClient.post<{ reordenadas: number }>('/api/competencias/reordenar', {
      competencias
    });
  },
};
