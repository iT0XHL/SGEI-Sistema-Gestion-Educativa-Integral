import { apiClient } from './client';

export interface Bimestre {
  id: string;
  nombre: string;
  numero: number;
  cerrado: boolean;
  periodo_id: string;
}

// El backend responde paginado ({ items, meta }). Desempaquetamos a Bimestre[]
// para que los consumidores puedan usar .filter()/.find()/.map() directamente.
interface Paginado<T> { items: T[]; meta?: unknown }

export const bimestresApi = {
  async listar(periodoId?: string): Promise<Bimestre[]> {
    const data = await apiClient.get<Paginado<Bimestre> | Bimestre[]>(
      '/api/bimestres',
      periodoId ? { periodoId } : undefined,
    );
    return Array.isArray(data) ? data : (data.items ?? []);
  },
};
