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
