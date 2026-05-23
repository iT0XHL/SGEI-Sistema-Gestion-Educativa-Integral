import { apiClient } from './client';

// ── Boletas / Vouchers ────────────────────────────────────────
export type EstadoRevision = 'En_Revision' | 'Aprobada' | 'Rechazada';

export interface BoletaDTO {
  id:                  string;
  pago_id:             string;
  url_archivo:         string;
  nombre_archivo:      string | null;
  banco:               string | null;
  numero_operacion:    string | null;
  estado_revision:     EstadoRevision;
  observacion_rechazo: string | null;
  fecha_subida:        string;
  fecha_revision:      string | null;
  pago: {
    id:               string;
    monto:            number;
    mes:              number | null;
    fecha_vencimiento: string;
    estado:           'Pendiente' | 'En_Revision' | 'Pagado' | 'Rechazado';
    alumno: {
      nombres:          string;
      apellido_paterno: string;
      seccion: { nombre: string; grado: { nombre: string } };
    };
    concepto: { nombre: string };
  };
  revisor: { nombres: string } | null;
}

export interface RevisarBoletaPayload {
  boleta_id:            string;
  nuevo_estado:         'Aprobada' | 'Rechazada';
  observacion_rechazo?: string | null;
}

export interface ListarBoletasParams {
  alumnoId?:       string;
  pagoId?:         string;
  estadoRevision?: EstadoRevision;
}

// ── Pagos por alumno ──────────────────────────────────────────
export type EstadoPagoAlumno = 'al_dia' | 'moroso' | 'pendiente' | 'sin_cuotas';

export interface AlumnoPagoResumenDTO {
  alumno_id:                 string;
  nombre_completo:           string;
  grado:                     string;
  seccion:                   string;
  estado_pago:               EstadoPagoAlumno;
  monto_total:               number;
  monto_pagado:              number;
  monto_pendiente:           number;
  monto_vencido:             number;
  porcentaje_pagado:         number;
  cuotas_pagadas:            number;
  cuotas_pendientes:         number;
  cuotas_vencidas:           number;
  cuotas_total:              number;
  moroso:                    boolean;
  tiene_boleta_pendiente:    boolean;
  boletas_pendientes:        number;
  boletas_aprobadas:         number;
  boletas_rechazadas:        number;
  boletas_total:             number;
  fecha_proxima_vencimiento: string | null;
}

// ── Resumen financiero ────────────────────────────────────────
export interface ResumenFinanciero {
  vouchers_pendientes: number;
  vouchers_aprobados:  number;
  vouchers_rechazados: number;
  total_recaudado:     number;
  total_deuda:         number;
  alumnos_al_dia:      number;
  alumnos_con_deuda:   number;
  morosos:             number;
}

export interface RecaudacionMensual {
  mes:   number;
  monto: number;
}

export interface ResumenSecretaria {
  periodo: { id: string; nombre: string; anio: number } | null;
  resumen_financiero: ResumenFinanciero;
  recaudacion_mensual: RecaudacionMensual[];
  total_alumnos:       number;
  total_listos_siagie: number;
}

export interface VoucherReciente {
  id:                 string;
  pago_id:            string;
  url_archivo:        string;
  nombre_archivo:     string | null;
  banco:              string | null;
  numero_operacion:   string | null;
  estado_revision:    string;
  observacion_rechazo: string | null;
  fecha_subida:       string;
  fecha_revision:     string | null;
  alumno: {
    id:              string;
    nombre_completo: string;
    grado_seccion:   string;
  };
  concepto: string;
  monto:    number;
  mes:      number | null;
}

export const secretariaApi = {
  resumen(): Promise<ResumenSecretaria> {
    return apiClient.get<ResumenSecretaria>('/api/secretaria/resumen');
  },

  vouchersRecientes(): Promise<VoucherReciente[]> {
    return apiClient.get<VoucherReciente[]>('/api/secretaria/vouchers/recientes');
  },

  pagosPorAlumno(): Promise<AlumnoPagoResumenDTO[]> {
    return apiClient.get<AlumnoPagoResumenDTO[]>('/api/secretaria/pagos');
  },

  listarBoletas(params: ListarBoletasParams = {}): Promise<BoletaDTO[]> {
    const qs: Record<string, string> = {};
    if (params.alumnoId)       qs['alumnoId']       = params.alumnoId;
    if (params.pagoId)         qs['pagoId']         = params.pagoId;
    if (params.estadoRevision) qs['estadoRevision'] = params.estadoRevision;
    return apiClient.get<BoletaDTO[]>('/api/boletas', qs);
  },

  revisarBoleta(payload: RevisarBoletaPayload): Promise<BoletaDTO> {
    return apiClient.post<BoletaDTO>('/api/boletas/revisar', payload);
  },

  getArchivoUrl(id: string): Promise<{ url: string; expira_en: number | null }> {
    return apiClient.get<{ url: string; expira_en: number | null }>(`/api/boletas/${id}/archivo`);
  },
};
