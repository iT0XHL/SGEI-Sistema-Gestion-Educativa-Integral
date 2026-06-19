// ============================================================================
//  modules/notificaciones/notificacion-message-builder.ts
//  Builder central de mensajes de notificación (§18, §26.13).
//
//  Dado un evento + contexto, devuelve { titulo, cuerpo, tipo, prioridad,
//  url_accion, metadata }. Centralizar aquí evita escribir mensajes a mano
//  en cada módulo y garantiza consistencia.
//
//  Reglas aplicadas:
//   · URLs internas, no absolutas (§26.14).
//   · No exponer datos sensibles: notas, montos, motivos completos (§26.16).
//   · Títulos cortos = [Actor] + [acción]; cuerpo = detalle contextual (§18).
// ============================================================================
import {
  NotificationEvents,
  EVENTO_CONFIG,
  type NotificationEvent,
  type TipoNotificacion,
  type PrioridadNotificacion,
} from './notificacion.events';

/**
 * Contexto que viaja con cada evento. Todos los campos son opcionales: cada
 * evento usa los que necesita. Los *Nombre se guardan como snapshot en metadata.
 */
export interface NotificacionContexto {
  // Actor (quien realiza la acción)
  actorNombre?:   string;
  actorRol?:      string;

  // Entidades frecuentes
  alumnoId?:      string;
  alumnoNombre?:  string;
  docenteId?:     string;
  docenteNombre?: string;
  seccionId?:     string;
  cursoId?:       string;
  cursoNombre?:   string;
  bimestreNombre?: string;

  // Identificadores de la entidad afectada
  notaId?:        string;
  actividadId?:   string;
  actividadTitulo?: string;
  entregaId?:     string;
  materialId?:    string;
  materialTitulo?: string;
  boletaId?:      string;
  pagoId?:        string;
  libretaId?:     string;
  periodoNombre?: string;

  // Permite sobre-escribir título / cuerpo / url (comunicados manuales)
  tituloOverride?: string;
  cuerpoOverride?: string;
  urlOverride?:    string;

  // Cualquier metadato adicional libre
  extra?: Record<string, unknown>;
}

/** Resultado del builder: plantilla lista para persistir. */
export interface MensajeNotificacion {
  titulo:      string;
  cuerpo:      string;
  tipo:        TipoNotificacion;
  prioridad:   PrioridadNotificacion;
  url_accion:  string;
  entidadTipo: string;
  entidadId:   string | null;
  metadata:    Record<string, unknown>;
}

function actorLabel(ctx: NotificacionContexto, fallback = 'El sistema'): string {
  if (!ctx.actorNombre) return fallback;
  // "Docente Juan Pérez", "Secretaría María", "Admin Andre"
  const rol = ctx.actorRol;
  if (rol === 'Docente')    return `Docente ${ctx.actorNombre}`;
  if (rol === 'Secretaria') return `Secretaría ${ctx.actorNombre}`;
  if (rol === 'Admin')      return `Admin ${ctx.actorNombre}`;
  return ctx.actorNombre;
}

/**
 * Construye el mensaje para un evento dado. El `tipo` y `prioridad` provienen
 * de EVENTO_CONFIG; el `entidadId` se infiere del contexto según el evento.
 */
export function buildNotificationMessage(
  evento: NotificationEvent,
  ctx:    NotificacionContexto,
): MensajeNotificacion {
  const cfg   = EVENTO_CONFIG[evento];
  const actor = actorLabel(ctx);

  // Metadata enriquecida (§26.12): solo se incluyen campos presentes.
  const metadata: Record<string, unknown> = {
    evento,
    ...(ctx.actorNombre   ? { actorNombre: ctx.actorNombre } : {}),
    ...(ctx.actorRol      ? { actorRol: ctx.actorRol } : {}),
    ...(ctx.alumnoId      ? { alumnoId: ctx.alumnoId } : {}),
    ...(ctx.alumnoNombre  ? { alumnoNombre: ctx.alumnoNombre } : {}),
    ...(ctx.docenteId     ? { docenteId: ctx.docenteId } : {}),
    ...(ctx.docenteNombre ? { docenteNombre: ctx.docenteNombre } : {}),
    ...(ctx.cursoNombre   ? { cursoNombre: ctx.cursoNombre } : {}),
    ...(ctx.bimestreNombre ? { bimestre: ctx.bimestreNombre } : {}),
    ...(ctx.actividadTitulo ? { actividadTitulo: ctx.actividadTitulo } : {}),
    ...(ctx.materialTitulo ? { materialTitulo: ctx.materialTitulo } : {}),
    ...(ctx.periodoNombre ? { periodoNombre: ctx.periodoNombre } : {}),
    ...(ctx.extra ?? {}),
  };

  let titulo = '';
  let cuerpo = '';
  let url    = '';
  let entidadId: string | null = null;

  switch (evento) {
    case NotificationEvents.DOCENTE_CREADO:
      titulo = 'Nuevo docente registrado';
      cuerpo = `${actor} registró al docente ${ctx.docenteNombre ?? ''} en el sistema.`.trim();
      url    = '/admin/cuentas';
      entidadId = ctx.docenteId ?? null;
      break;

    case NotificationEvents.DOCENTE_ACTUALIZADO:
      titulo = 'Datos de docente actualizados';
      cuerpo = `${actor} actualizó los datos del docente ${ctx.docenteNombre ?? ''}.`.trim();
      url    = '/admin/cuentas';
      entidadId = ctx.docenteId ?? null;
      break;

    case NotificationEvents.ALUMNO_CREADO:
      titulo = 'Nuevo alumno registrado';
      cuerpo = `${actor} registró al alumno ${ctx.alumnoNombre ?? ''}.`.trim();
      url    = '/secretaria/alumnos';
      entidadId = ctx.alumnoId ?? null;
      break;

    case NotificationEvents.ALUMNO_ACTUALIZADO:
      titulo = 'Datos de alumno actualizados';
      cuerpo = `${actor} actualizó los datos del alumno ${ctx.alumnoNombre ?? ''}.`.trim();
      url    = '/secretaria/alumnos';
      entidadId = ctx.alumnoId ?? null;
      break;

    case NotificationEvents.NOTA_REGISTRADA:
      titulo = `${actor} registró una nueva calificación`;
      cuerpo = `Se registró una nueva calificación${ctx.cursoNombre ? ` en ${ctx.cursoNombre}` : ''}${ctx.bimestreNombre ? ` (${ctx.bimestreNombre})` : ''}. Ingresa para revisar el detalle.`;
      url    = '/alumno/libreta';
      entidadId = ctx.notaId ?? null;
      break;

    case NotificationEvents.NOTA_ACTUALIZADA:
      titulo = `${actor} actualizó una calificación`;
      cuerpo = `Se actualizó una de tus calificaciones${ctx.cursoNombre ? ` en ${ctx.cursoNombre}` : ''}. Ingresa para revisar el detalle.`;
      url    = '/alumno/libreta';
      entidadId = ctx.notaId ?? null;
      break;

    case NotificationEvents.TAREA_CALIFICADA:
      titulo = `${actor} calificó tu tarea`;
      cuerpo = `Tu entrega${ctx.actividadTitulo ? ` "${ctx.actividadTitulo}"` : ''}${ctx.cursoNombre ? ` de ${ctx.cursoNombre}` : ''} fue calificada. Ingresa para ver el resultado.`;
      url    = '/alumno/cursos';
      entidadId = ctx.entregaId ?? null;
      break;

    case NotificationEvents.MATERIAL_PUBLICADO:
      titulo = `${actor} publicó nuevo material`;
      cuerpo = `Nuevo material${ctx.materialTitulo ? ` "${ctx.materialTitulo}"` : ''}${ctx.cursoNombre ? ` para ${ctx.cursoNombre}` : ''} disponible.`;
      url    = '/alumno/cursos';
      entidadId = ctx.materialId ?? null;
      break;

    case NotificationEvents.ACTIVIDAD_PUBLICADA:
      titulo = `${actor} publicó una nueva actividad`;
      cuerpo = `Nueva actividad${ctx.actividadTitulo ? ` "${ctx.actividadTitulo}"` : ''}${ctx.cursoNombre ? ` en ${ctx.cursoNombre}` : ''}. Revisa la fecha límite.`;
      url    = '/alumno/cursos';
      entidadId = ctx.actividadId ?? null;
      break;

    case NotificationEvents.BOLETA_SUBIDA:
      titulo = 'Nueva boleta para revisión';
      cuerpo = `El alumno ${ctx.alumnoNombre ?? ''} subió una boleta de pago para revisión.`.replace('  ', ' ');
      url    = '/secretaria/vouchers';
      entidadId = ctx.boletaId ?? null;
      break;

    case NotificationEvents.BOLETA_REVISADA:
      titulo = 'Tu boleta fue revisada';
      cuerpo = `${actor} revisó la boleta que subiste. Ingresa para ver el estado.`;
      url    = '/alumno/pagos';
      entidadId = ctx.boletaId ?? null;
      break;

    case NotificationEvents.PAGO_REGISTRADO:
      titulo = 'Nuevo pago registrado';
      cuerpo = 'Se registró un nuevo pago en tu cuenta. Ingresa para ver el detalle.';
      url    = '/alumno/pagos';
      entidadId = ctx.pagoId ?? null;
      break;

    case NotificationEvents.COMUNICADO_GENERAL:
      titulo = ctx.tituloOverride ?? 'Nuevo comunicado';
      cuerpo = ctx.cuerpoOverride ?? `${actor} publicó un nuevo comunicado.`;
      url    = ctx.urlOverride ?? '/';
      break;

    case NotificationEvents.PERIODO_ACTUALIZADO:
      titulo = 'Período académico actualizado';
      cuerpo = `Se actualizó el período académico activo${ctx.periodoNombre ? `: ${ctx.periodoNombre}` : ''}.`;
      url    = ctx.urlOverride ?? '/';
      break;

    case NotificationEvents.NOTAS_ENVIADAS_A_SECRETARIA:
      titulo = 'Notas enviadas a secretaría';
      cuerpo = `${actor} envió las notas${ctx.bimestreNombre ? ` del ${ctx.bimestreNombre}` : ''} a secretaría para revisión.`.trim();
      url    = '/secretaria/libretas';
      break;

    case NotificationEvents.LIBRETA_PUBLICADA:
      titulo = 'Libreta publicada';
      cuerpo = `Tu libreta${ctx.bimestreNombre ? ` del ${ctx.bimestreNombre}` : ''} ya está disponible. Puedes descargarla desde el portal.`.trim();
      url    = '/alumno/libreta';
      entidadId = ctx.libretaId ?? ctx.alumnoId ?? null;
      break;

    case NotificationEvents.LIBRETA_BLOQUEADA:
      titulo = 'Libreta bloqueada';
      cuerpo = `Tu libreta${ctx.bimestreNombre ? ` del ${ctx.bimestreNombre}` : ''} ha sido bloqueada por el momento. Contacta a secretaría si tienes dudas.`.trim();
      url    = '/alumno/libreta';
      entidadId = ctx.libretaId ?? ctx.alumnoId ?? null;
      break;

    default: {
      // Exhaustividad: si se agrega un evento sin caso, TypeScript avisa.
      const _never: never = evento;
      titulo = 'Notificación';
      cuerpo = 'Tienes una nueva notificación.';
      url    = '/';
      void _never;
    }
  }

  return {
    titulo:      (ctx.tituloOverride ?? titulo).slice(0, 150),
    cuerpo:      ctx.cuerpoOverride ?? cuerpo,
    tipo:        cfg.tipo,
    prioridad:   cfg.prioridad,
    url_accion:  ctx.urlOverride ?? url,
    entidadTipo: cfg.entidad,
    entidadId,
    metadata,
  };
}
