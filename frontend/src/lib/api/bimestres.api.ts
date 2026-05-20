import { apiClient } from './client';

export interface Bimestre {
  id: string;
  nombre: string;
  numero: number;
  cerrado: boolean;
  periodo_id: string;
}

export const bimestresApi = {
  listar(periodoId?: string): Promise<Bimestre[]> {
    return apiClient.get<Bimestre[]>('/api/bimestres', periodoId ? { periodoId } : undefined);
  },
};
