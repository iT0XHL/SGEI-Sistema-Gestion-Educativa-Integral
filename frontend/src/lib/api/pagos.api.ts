import { apiClient } from './client';
import type {
  Pago,
  EstadoPagoRow,
  ConceptoPago,
  CreatePagoPayload,
  EstadoPago,
} from '../../types/pago';

export interface ListarPagosParams {
  alumnoId?:  string;
  periodoId?: string;
  estado?:    EstadoPago;
  mes?:       number;
}

export const pagosApi = {
  /** Alumno: devuelve EstadoPagoRow[]. Admin/Secretaria: devuelve Pago[]. */
  listar(params: ListarPagosParams = {}): Promise<EstadoPagoRow[] | Pago[]> {
    const q: Record<string, string> = {};
    if (params.alumnoId)          q.alumnoId  = params.alumnoId;
    if (params.periodoId)         q.periodoId = params.periodoId;
    if (params.estado)            q.estado    = params.estado;
    if (params.mes !== undefined) q.mes       = String(params.mes);
    return apiClient.get('/api/pagos', q);
  },

  obtener(id: string): Promise<Pago> {
    return apiClient.get<Pago>(`/api/pagos/${id}`);
  },

  crear(payload: CreatePagoPayload): Promise<Pago> {
    return apiClient.post<Pago>('/api/pagos', payload);
  },

  listarConceptos(): Promise<ConceptoPago[]> {
    return apiClient.get<ConceptoPago[]>('/api/pagos/conceptos');
  },
};
