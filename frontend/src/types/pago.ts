// ── Enums ────────────────────────────────────────────────────
export type EstadoPago           = 'Pendiente' | 'En_Revision' | 'Pagado' | 'Rechazado';
export type EstadoRevisionBoleta = 'En_Revision' | 'Aprobada' | 'Rechazada';

// ── Estado de pago desde v_estado_pagos_alumno ────────────────
export interface EstadoPagoRow {
  alumno_id:           string;
  alumno_nombre:       string;
  grado:               string;
  seccion:             string;
  pago_id:             string;
  concepto:            string;
  mes:                 number | null;
  monto:               number;
  estado:              EstadoPago;
  fecha_vencimiento:   string;
  fecha_pago:          string | null;
  estado_boleta:       EstadoRevisionBoleta | null;
  observacion_rechazo: string | null;
}

// ── Pago completo (con boleta anidada) ────────────────────────
export interface BoletaPago {
  id:                  string;
  pago_id:             string;
  url_archivo:         string;
  nombre_archivo:      string | null;
  banco:               string | null;
  numero_operacion:    string | null;
  estado_revision:     EstadoRevisionBoleta;
  observacion_rechazo: string | null;
  revisado_por:        string | null;
  fecha_revision:      string | null;
  fecha_subida:        string;
}

export interface Pago {
  id:               string;
  alumno_id:        string;
  concepto_id:      string;
  periodo_id:       string;
  mes:              number | null;
  monto:            number;
  estado:           EstadoPago;
  fecha_vencimiento: string;
  fecha_pago:       string | null;
  generado_por:     string;
  created_at:       string;
  concepto?: { nombre: string; monto_base: number };
  alumno?:   { nombres: string; apellido_paterno: string };
  boleta?:   BoletaPago | null;
}

export interface ConceptoPago {
  id:          string;
  nombre:      string;
  descripcion: string | null;
  monto_base:  number;
  activo:      boolean;
}

// ── Payloads ──────────────────────────────────────────────────
export interface SubirBoletaPayload {
  pago_id:          string;
  banco?:           string;
  numero_operacion?: string;
}

export interface RevisarBoletaPayload {
  boleta_id:           string;
  nuevo_estado:        'Aprobada' | 'Rechazada';
  observacion_rechazo?: string | null;
}

export interface CreatePagoPayload {
  alumno_id:         string;
  concepto_id:       string;
  periodo_id:        string;
  mes?:              number;
  monto:             number;
  fecha_vencimiento: string;
}

// ── Helpers de UI ─────────────────────────────────────────────
export const ESTADO_PAGO_LABEL: Record<EstadoPago, string> = {
  Pendiente:   'Pendiente',
  En_Revision: 'En Revisión',
  Pagado:      'Pagado',
  Rechazado:   'Rechazado',
};

export const ESTADO_BOLETA_LABEL: Record<EstadoRevisionBoleta, string> = {
  En_Revision: 'En Revisión',
  Aprobada:    'Aprobada',
  Rechazada:   'Rechazada',
};

/** Mapeo front→DB para compatibilidad con voucherStatusMapper existente */
export function toDbEstado(front: 'submitted' | 'approved' | 'rejected'): EstadoRevisionBoleta {
  if (front === 'approved') return 'Aprobada';
  if (front === 'rejected') return 'Rechazada';
  return 'En_Revision';
}

export function toFrontEstado(db: EstadoRevisionBoleta): 'submitted' | 'approved' | 'rejected' {
  if (db === 'Aprobada')  return 'approved';
  if (db === 'Rechazada') return 'rejected';
  return 'submitted';
}
