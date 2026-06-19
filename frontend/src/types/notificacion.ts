export type TipoNotificacion = 'sistema' | 'pago' | 'academico' | 'comunicado';

export type PrioridadNotificacion = 'baja' | 'normal' | 'alta' | 'urgente';

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

  // Campos del sistema por eventos (pueden faltar en filas antiguas).
  actor_nombre_snapshot?: string | null;
  evento?:                string | null;
  entidad_tipo?:          string | null;
  entidad_id?:            string | null;
  prioridad?:             PrioridadNotificacion;
  metadata?:              Record<string, unknown> | null;
  canal?:                 string;
  archivada?:             boolean;
}

/** Notificación recibida por SSE en tiempo real (subconjunto). */
export interface NotificacionRealtime {
  id:                 string;
  usuario_destino_id: string;
  tipo:               TipoNotificacion;
  titulo:             string;
  cuerpo:             string;
  url_accion:         string | null;
  leida:              boolean;
  prioridad:          PrioridadNotificacion;
  evento:             string | null;
  metadata:           Record<string, unknown> | null;
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
