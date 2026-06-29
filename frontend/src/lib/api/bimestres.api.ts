import { apiClient } from './client';

export interface Bimestre {
  id: string;
  nombre: string;
  numero: number;
  cerrado: boolean;
  periodo_id: string;
}

// El endpoint /api/bimestres responde paginado ({ items, meta }). Normalizamos
// aquí para devolver siempre un arreglo, que es lo que esperan los consumidores
// (DocenteDashboard, DocenteNotas, páginas de Alumno) al hacer .filter/.map.
export const bimestresApi = {
  async listar(periodoId?: string): Promise<Bimestre[]> {
    const res = await apiClient.get<{ items: Bimestre[] } | Bimestre[]>(
      '/api/bimestres',
      periodoId ? { periodoId } : undefined,
    );
    return Array.isArray(res) ? res : res?.items ?? [];
  },
};
