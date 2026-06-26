import { ForbiddenError } from '@/errors/http-errors';
import { NotificacionRepository } from './notificacion.repository';
import { resolverDestinatarios } from './notificacion-recipient-resolver';
import { buildNotificationMessage, type NotificacionContexto } from './notificacion-message-builder';
import { notificationBus } from '@/lib/notification-bus';
import type { NotificationEvent, PrioridadNotificacion } from './notificacion.events';
import type { CrearNotificacionInput } from './notificacion.schema';
import type { JwtClaims } from '@/lib/jwt';

/** Crea la notificación y la publica al bus en proceso para entrega SSE en vivo. */
async function crearYPublicar(
  input: CrearNotificacionInput,
  extra: { prioridad: PrioridadNotificacion; evento: NotificationEvent | null; metadata: Record<string, unknown> },
) {
  const notif = await NotificacionRepository.crear(input);
  notificationBus.publish({
    id:                 notif.id,
    usuario_destino_id: notif.usuario_destino_id,
    tipo:               notif.tipo,
    titulo:             notif.titulo,
    cuerpo:             notif.cuerpo,
    url_accion:         notif.url_accion,
    leida:              notif.leida,
    prioridad:          extra.prioridad,
    evento:             extra.evento,
    metadata:           extra.metadata,
    created_at:         notif.created_at.toISOString(),
  });
  return notif;
}

export const NotificacionService = {
  async listar(user: JwtClaims, leida?: boolean) {
    return NotificacionRepository.listar(user.perfilId, leida);
  },

  async contar(user: JwtClaims) {
    const no_leidas = await NotificacionRepository.contarNoLeidas(user.perfilId);
    return { no_leidas };
  },

  async marcarLeida(id: string, user: JwtClaims) {
    const resultado = await NotificacionRepository.marcarLeida(id, user.perfilId);
    if (resultado.count === 0) {
      throw new ForbiddenError('NOT_FOUND', 'Notificación no encontrada o no te pertenece.');
    }
    return { actualizada: true };
  },

  async marcarTodasLeidas(user: JwtClaims) {
    const resultado = await NotificacionRepository.marcarTodasLeidas(user.perfilId);
    return { actualizadas: resultado.count };
  },

  async crear(input: CrearNotificacionInput, user: JwtClaims) {
    if (user.rol !== 'Admin') {
      throw new ForbiddenError('INSUFFICIENT_ROLE', 'Solo Admin puede enviar notificaciones del sistema.');
    }
    return crearYPublicar(input, { prioridad: 'normal', evento: null, metadata: {} });
  },

  /**
   * Dispara un evento del catálogo: resuelve destinatarios (en backend, a partir
   * de relaciones reales), construye el mensaje y crea + publica una notificación
   * para cada uno (excluye al actor). Es el punto único para notificaciones por
   * evento; no falla el flujo de negocio si la entrega no se puede completar.
   */
  async notificarEvento(params: {
    evento:   NotificationEvent;
    actor:    { perfilId: string; rol: string; nombre: string };
    contexto?: NotificacionContexto & { destinatariosExplicitos?: string[]; incluirActor?: boolean };
    /** Reservado para deduplicación futura; hoy no se usa. */
    idempotencyExtra?: string;
  }): Promise<void> {
    try {
      const ctx = params.contexto ?? {};
      const destinatarios = await resolverDestinatarios(params.evento, {
        actorPerfilId:           params.actor.perfilId,
        alumnoId:                ctx.alumnoId,
        docenteId:               ctx.docenteId,
        seccionId:               ctx.seccionId,
        destinatariosExplicitos: ctx.destinatariosExplicitos,
        incluirActor:            ctx.incluirActor,
      });
      if (destinatarios.length === 0) return;

      const msg = buildNotificationMessage(params.evento, {
        ...ctx,
        actorNombre: params.actor.nombre,
        actorRol:    params.actor.rol,
      });

      for (const perfilId of destinatarios) {
        await crearYPublicar(
          {
            usuario_destino_id: perfilId,
            tipo:               msg.tipo,
            titulo:             msg.titulo,
            cuerpo:             msg.cuerpo,
            url_accion:         msg.url_accion,
          },
          { prioridad: msg.prioridad, evento: params.evento, metadata: msg.metadata },
        );
      }
    } catch (err) {
      // La notificación es accesoria: nunca debe romper el flujo de negocio.
      console.error('[notificarEvento] Error entregando notificación:', err);
    }
  },
};
