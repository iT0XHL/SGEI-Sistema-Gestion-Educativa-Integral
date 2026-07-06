import { apiClient } from './client';
import type {
  Pago,
  EstadoPagoRow,
  ConceptoPago,
  CreatePagoPayload,
  EstadoPago,
} from '../../types/pago';

export interface GenerarMasivoPayload {
  periodo_id:        string;
  concepto_id:       string;
  mes:               number;
  monto:             number;
  fecha_vencimiento: string;
}

export interface GenerarMasivoResult {
  creados:      number;
  saltados:     number;
  total_alumnos: number;
}

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

  generarMasivo(payload: GenerarMasivoPayload): Promise<GenerarMasivoResult> {
    return apiClient.post<GenerarMasivoResult>('/api/pagos/generar-masivo', payload);
  },

  subirVoucher(pagoId: string, archivo: File, banco: string, numeroOperacion: string): Promise<unknown> {
    const fd = new FormData();
    fd.append('pago_id', pagoId);
    fd.append('archivo', archivo);
    fd.append('banco', banco);
    fd.append('numero_operacion', numeroOperacion);
    return apiClient.postFormData('/api/boletas', fd);
  },
};
