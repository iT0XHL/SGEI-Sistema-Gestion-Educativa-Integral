export type TipoNotificacion = 'sistema' | 'pago' | 'academico' | 'comunicado';

export interface Notificacion {
  id:                 string;
  usuario_destino_id: string;
  tipo:               TipoNotificacion;
  titulo:             string;
  cuerpo:             string;
  url_accion:         string | null;
  leida:              boolean;
  fecha_lectura:      string | null;
  created_at:         string;
}

export interface CrearNotificacionPayload {
  usuario_destino_id: string;
  tipo:               TipoNotificacion;
  titulo:             string;
  cuerpo:             string;
  url_accion?:        string;
}

export interface ContadorNotificaciones {
  no_leidas: number;
}

/**
 * Carga útil que llega por SSE (/api/notificaciones/stream). Incluye campos
 * transitorios (prioridad/evento/metadata) que el bus añade solo para el aviso
 * en vivo; no se persisten en la tabla `notificacion`.
 */
export interface NotificacionRealtime {
  id:                 string;
  usuario_destino_id: string;
  tipo:               string;
  titulo:             string;
  cuerpo:             string;
  url_accion:         string | null;
  leida:              boolean;
  prioridad:          string;
  evento:             string | null;
  metadata:           unknown;
  created_at:         string;
}
