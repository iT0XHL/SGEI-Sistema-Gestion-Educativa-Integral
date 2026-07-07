// ============================================================================
//  modules/notificaciones/notificacion.events.ts
//  Catálogo central de eventos notificables del sistema (§5, §6, §11).
//
//  REGLA: este catálogo contiene ÚNICAMENTE eventos que se EMITEN realmente
//  desde un flujo del sistema (nada de eventos muertos). Si se agrega un evento
//  aquí, debe existir un `notificarEvento(...)` que lo dispare, además de su
//  caso en el message-builder y el recipient-resolver.
//
//  Mantener sincronizado con:
//    · notificacion-message-builder.ts    (título / cuerpo / url)
//    · notificacion-recipient-resolver.ts (destinatarios)
// ============================================================================

/** Códigos de evento válidos. Inmutable. Todos se disparan desde un módulo. */
export const NotificationEvents = {
  // Administrativos (docentes / alumnos / usuarios)
  DOCENTE_CREADO:        'DOCENTE_CREADO',
  DOCENTE_ACTUALIZADO:   'DOCENTE_ACTUALIZADO',
  ALUMNO_CREADO:         'ALUMNO_CREADO',
  ALUMNO_ACTUALIZADO:    'ALUMNO_ACTUALIZADO',
  // Académicos
  NOTA_REGISTRADA:       'NOTA_REGISTRADA',
  NOTA_ACTUALIZADA:      'NOTA_ACTUALIZADA',
  TAREA_CALIFICADA:      'TAREA_CALIFICADA',
  MATERIAL_PUBLICADO:    'MATERIAL_PUBLICADO',
  ACTIVIDAD_PUBLICADA:   'ACTIVIDAD_PUBLICADA',
  SIMULACRO_PROGRAMADO:  'SIMULACRO_PROGRAMADO',
  SIMULACRO_PREGUNTAS_CARGADAS: 'SIMULACRO_PREGUNTAS_CARGADAS',
  NOTAS_REGISTRADAS:     'NOTAS_REGISTRADAS',
  NOTAS_ENVIADAS_A_SECRETARIA: 'NOTAS_ENVIADAS_A_SECRETARIA',
  // Libretas
  LIBRETA_PUBLICADA:     'LIBRETA_PUBLICADA',
  LIBRETA_BLOQUEADA:     'LIBRETA_BLOQUEADA',
  // Financieros
  BOLETA_SUBIDA:         'BOLETA_SUBIDA',
  BOLETA_REVISADA:       'BOLETA_REVISADA',
  PAGO_REGISTRADO:       'PAGO_REGISTRADO',
  PAGO_POR_VENCER:       'PAGO_POR_VENCER',
  // Horarios
  HORARIO_ACTUALIZADO:   'HORARIO_ACTUALIZADO',
  // Asistencia
  ASISTENCIA_PENDIENTE:  'ASISTENCIA_PENDIENTE',
  // Sistema / comunicados
  PERIODO_ACTUALIZADO:   'PERIODO_ACTUALIZADO',
  COMUNICADO_GENERAL:    'COMUNICADO_GENERAL',
} as const;

export type NotificationEvent =
  (typeof NotificationEvents)[keyof typeof NotificationEvents];

/** Tipo general de la notificación (coincide con el ENUM tipo_notificacion). */
export type TipoNotificacion = 'sistema' | 'academico' | 'pago' | 'comunicado';

/** Niveles de prioridad (§26.10). */
export type PrioridadNotificacion = 'baja' | 'normal' | 'alta' | 'urgente';

/** Metadatos estáticos asociados a cada evento. */
export interface EventoMeta {
  tipo:      TipoNotificacion;
  prioridad: PrioridadNotificacion;
  /** Tipo de entidad afectada por defecto (alumno, docente, nota, ...). */
  entidad:   string;
}

/**
 * Configuración por evento: tipo general + prioridad + entidad afectada.
 * Es la fuente de verdad para clasificar y priorizar las notificaciones.
 */
export const EVENTO_CONFIG: Record<NotificationEvent, EventoMeta> = {
  DOCENTE_CREADO:              { tipo: 'sistema',    prioridad: 'normal',  entidad: 'docente' },
  DOCENTE_ACTUALIZADO:         { tipo: 'sistema',    prioridad: 'baja',    entidad: 'docente' },
  ALUMNO_CREADO:               { tipo: 'sistema',    prioridad: 'normal',  entidad: 'alumno' },
  ALUMNO_ACTUALIZADO:          { tipo: 'sistema',    prioridad: 'baja',    entidad: 'alumno' },
  NOTA_REGISTRADA:             { tipo: 'academico',  prioridad: 'normal',  entidad: 'nota' },
  NOTA_ACTUALIZADA:            { tipo: 'academico',  prioridad: 'normal',  entidad: 'nota' },
  TAREA_CALIFICADA:            { tipo: 'academico',  prioridad: 'normal',  entidad: 'entrega' },
  MATERIAL_PUBLICADO:          { tipo: 'academico',  prioridad: 'normal',  entidad: 'material' },
  ACTIVIDAD_PUBLICADA:         { tipo: 'academico',  prioridad: 'normal',  entidad: 'actividad' },
  SIMULACRO_PROGRAMADO:        { tipo: 'academico',  prioridad: 'alta',    entidad: 'simulacro' },
  SIMULACRO_PREGUNTAS_CARGADAS:{ tipo: 'academico',  prioridad: 'normal',  entidad: 'simulacro' },
  NOTAS_REGISTRADAS:           { tipo: 'academico',  prioridad: 'normal',  entidad: 'nota' },
  NOTAS_ENVIADAS_A_SECRETARIA: { tipo: 'academico',  prioridad: 'alta',    entidad: 'nota' },
  LIBRETA_PUBLICADA:           { tipo: 'academico',  prioridad: 'urgente', entidad: 'libreta' },
  LIBRETA_BLOQUEADA:           { tipo: 'academico',  prioridad: 'alta',    entidad: 'libreta' },
  BOLETA_SUBIDA:               { tipo: 'pago',       prioridad: 'normal',  entidad: 'boleta' },
  BOLETA_REVISADA:             { tipo: 'pago',       prioridad: 'alta',    entidad: 'boleta' },
  PAGO_REGISTRADO:             { tipo: 'pago',       prioridad: 'normal',  entidad: 'pago' },
  PAGO_POR_VENCER:             { tipo: 'pago',       prioridad: 'alta',    entidad: 'pago' },
  HORARIO_ACTUALIZADO:         { tipo: 'academico',  prioridad: 'alta',    entidad: 'horario' },
  ASISTENCIA_PENDIENTE:        { tipo: 'sistema',    prioridad: 'normal',  entidad: 'asistencia_docente' },
  PERIODO_ACTUALIZADO:         { tipo: 'sistema',    prioridad: 'alta',    entidad: 'periodo' },
  COMUNICADO_GENERAL:          { tipo: 'comunicado', prioridad: 'urgente', entidad: 'comunicado' },
};

export function isNotificationEvent(value: unknown): value is NotificationEvent {
  return typeof value === 'string' && value in EVENTO_CONFIG;
}
