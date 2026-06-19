// ============================================================================
//  lib/notification-bus.ts — Bus de eventos en proceso para tiempo real (SSE).
//
//  Cuando el servicio de notificaciones persiste una notificación, publica
//  aquí un evento. El endpoint SSE (app/api/notificaciones/stream) se suscribe
//  por usuario y reenvía solo las notificaciones de ese usuario autenticado.
//
//  Es un bus EN PROCESO (Node EventEmitter): suficiente para una sola instancia
//  del backend, que es el caso de este despliegue (Docker Compose, §16 "bus
//  interno"). Para escalar a múltiples instancias, sustituir el emit/subscribe
//  por PostgreSQL LISTEN/NOTIFY o Redis Pub/Sub sin tocar el resto del código.
//
//  Se guarda en globalThis para sobrevivir al hot-reload de Next.js (igual que
//  el singleton de Prisma).
// ============================================================================
import { EventEmitter } from 'node:events';

/** Notificación serializable enviada por SSE. */
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

const CHANNEL = 'notificacion';

const globalForBus = globalThis as unknown as {
  __sgeiNotificationBus?: EventEmitter;
};

function getEmitter(): EventEmitter {
  if (!globalForBus.__sgeiNotificationBus) {
    const emitter = new EventEmitter();
    // Cada conexión SSE registra un listener; subir el límite evita warnings
    // con muchos usuarios conectados simultáneamente.
    emitter.setMaxListeners(0);
    globalForBus.__sgeiNotificationBus = emitter;
  }
  return globalForBus.__sgeiNotificationBus;
}

export const notificationBus = {
  /** Publica una notificación recién creada para entrega en tiempo real. */
  publish(notificacion: NotificacionRealtime): void {
    getEmitter().emit(CHANNEL, notificacion);
  },

  /**
   * Suscribe un listener que recibe únicamente las notificaciones cuyo
   * destinatario coincide con `usuarioDestinoId`. Devuelve una función para
   * cancelar la suscripción.
   */
  subscribe(
    usuarioDestinoId: string,
    listener: (n: NotificacionRealtime) => void,
  ): () => void {
    const handler = (n: NotificacionRealtime) => {
      if (n.usuario_destino_id === usuarioDestinoId) listener(n);
    };
    const emitter = getEmitter();
    emitter.on(CHANNEL, handler);
    return () => emitter.off(CHANNEL, handler);
  },
};
