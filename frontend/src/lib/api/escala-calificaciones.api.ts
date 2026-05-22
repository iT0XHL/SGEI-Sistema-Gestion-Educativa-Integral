import { apiClient } from './client';

export interface EscalaItem {
  id: string;
  periodo_id: string;
  escala: 'AD' | 'A' | 'B' | 'C';
  rango_inferior: number;
  rango_superior: number;
  descripcion?: string;
}

export interface CoberturaResult {
  ok: boolean;
  messages: string[];
}

export const escalaCalificacionesApi = {
  listar(periodoId: string): Promise<EscalaItem[]> {
    return apiClient.get<EscalaItem[]>('/api/escala-calificaciones', { periodoId });
  },

  actualizar(payload: {
    periodo_id: string;
    escalas: Array<{
      escala: 'AD' | 'A' | 'B' | 'C';
      rango_inferior: number;
      rango_superior: number;
    }>;
  }): Promise<EscalaItem[]> {
    return apiClient.patch<EscalaItem[]>('/api/escala-calificaciones', payload);
  },

  verificarCobertura(periodoId: string): Promise<CoberturaResult> {
    return apiClient.get<CoberturaResult>('/api/escala-calificaciones/cobertura', { periodoId });
  },
};
