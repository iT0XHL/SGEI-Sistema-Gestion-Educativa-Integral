// ============================================================================
//  modules/notificaciones/notificacion.service.ts
//  Servicio CENTRALIZADO de notificaciones basado en eventos (§10, §25).
//
//  Punto de entrada para el resto de módulos: `notificarEvento(...)`. Resuelve
//  destinatarios en backend, construye el mensaje, evita duplicados, persiste e
//  emite en tiempo real (SSE). NUNCA lanza desde notificarEvento: una falla al
//  notificar jamás debe romper la acción principal ya guardada (§13, §26.3).
// ============================================================================
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ForbiddenError } from '@/errors/http-errors';
import type { JwtClaims } from '@/lib/jwt';
import { notificationBus } from '@/lib/notification-bus';
import { NotificacionRepository, type CrearNotificacionInput } from './notificacion.repository';
import type { CrearNotificacionInput as CrearManualInput } from './notificacion.schema';
import {
  buildNotificationMessage,
  type NotificacionContexto,
} from './notificacion-message-builder';
import {
  resolverDestinatarios,
  type ResolverContexto,
} from './notificacion-recipient-resolver';
import {
  isNotificationEvent,
  type NotificationEvent,
} from './notificacion.events';

type Db = typeof prisma | Prisma.TransactionClient;

/** Datos mínimos del actor que originó el evento. */
export interface ActorInfo {
  perfilId?: string;
  rol?:      string;
  nombre?:   string;
}

/** Contexto combinado: lo que necesitan el builder y el resolver. */
export type EventoContexto = NotificacionContexto & ResolverContexto;

export interface NotificarEventoParams {
  evento:   NotificationEvent;
  actor?:   ActorInfo;
  contexto: EventoContexto;
  /** Sufijo extra para la idempotency_key (p.ej. versión en actualizaciones). */
  idempotencyExtra?: string;
  /** Cliente Prisma/transacción para integrarse en una transacción (§26.4). */
  db?: Db;
}

function buildIdempotencyKey(
  evento:    NotificationEvent,
  entidadId: string | null,
  extra:     string | undefined,
  destinoId: string,
): string {
  return [evento, entidadId ?? 'na', extra, destinoId].filter(Boolean).join(':').slice(0, 200);
}

/**
 * Completa nombre/rol del actor a partir de su perfilId cuando el llamador solo
 * dispone del id (módulos que reciben perfilId y no el JWT completo). Tolerante
 * a fallos: si no se puede resolver, devuelve lo que haya.
 */
async function resolverActor(db: Db, actor: ActorInfo | undefined): Promise<ActorInfo | undefined> {
  if (!actor?.perfilId) return actor;
  if (actor.nombre && actor.rol) return actor;
  try {
    const perfil = await db.perfilUsuario.findUnique({
      where:  { id: actor.perfilId },
      select: {
        rol:        true,
        credencial: { select: { nombres: true, apellido_paterno: true } },
      },
    });
    if (!perfil) return actor;
    const nombre = [perfil.credencial?.nombres, perfil.credencial?.apellido_paterno]
      .filter(Boolean)
      .join(' ')
      .trim();
    return {
      perfilId: actor.perfilId,
      rol:      actor.rol ?? perfil.rol,
      nombre:   actor.nombre ?? (nombre || undefined),
    };
  } catch {
    return actor;
  }
}

function publicarTiempoReal(filas: Array<Record<string, unknown>>): void {
  for (const f of filas) {
    notificationBus.publish({
      id:                 String(f.id),
      usuario_destino_id: String(f.usuario_destino_id),
      tipo:               String(f.tipo),
      titulo:             String(f.titulo),
      cuerpo:             String(f.cuerpo),
      url_accion:         (f.url_accion as string | null) ?? null,
      leida:              Boolean(f.leida),
      prioridad:          String(f.prioridad ?? 'normal'),
      evento:             (f.evento as string | null) ?? null,
      metadata:           f.metadata ?? null,
      created_at:         f.created_at instanceof Date
        ? f.created_at.toISOString()
        : String(f.created_at),
    });
  }
}

export const NotificacionService = {
  // ── Lectura (sin cambios de contrato) ──────────────────────────────────────
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

  async archivar(id: string, user: JwtClaims) {
    const resultado = await NotificacionRepository.archivar(id, user.perfilId);
    if (resultado.count === 0) {
      throw new ForbiddenError('NOT_FOUND', 'Notificación no encontrada o no te pertenece.');
    }
    return { archivada: true };
  },

  // ── Creación manual (comunicados Admin/Secretaria, §19.4) ───────────────────
  async crear(input: CrearManualInput, user: JwtClaims) {
    if (user.rol !== 'Admin' && user.rol !== 'Secretaria') {
      throw new ForbiddenError(
        'INSUFFICIENT_ROLE',
        'Solo Admin y Secretaría pueden enviar comunicados.',
      );
    }
    const fila = await this.crearParaUsuario({
      usuario_destino_id: input.usuario_destino_id,
      tipo:               input.tipo,
      titulo:             input.titulo,
      cuerpo:             input.cuerpo,
      url_accion:         input.url_accion ?? null,
      evento:             'COMUNICADO_GENERAL',
      prioridad:          'normal',
      actor_id:           user.perfilId,
      actor_rol:          user.rol,
      actor_nombre_snapshot: user.nombre,
    });
    return fila;
  },

  /** Crea una notificación para un único usuario y la emite en tiempo real. */
  async crearParaUsuario(input: CrearNotificacionInput, db: Db = prisma) {
    const fila = await NotificacionRepository.crear(input, db);
    publicarTiempoReal([fila as unknown as Record<string, unknown>]);
    return fila;
  },

  /** Crea la misma notificación para varios usuarios (lote con idempotencia). */
  async crearParaMultiplesUsuarios(
    base: Omit<CrearNotificacionInput, 'usuario_destino_id'>,
    destinatarios: string[],
    db: Db = prisma,
  ) {
    const inputs: CrearNotificacionInput[] = destinatarios.map((destinoId) => ({
      ...base,
      usuario_destino_id: destinoId,
      idempotency_key: base.idempotency_key
        ? `${base.idempotency_key}:${destinoId}`
        : null,
    }));
    const creadas = await NotificacionRepository.crearLote(inputs, db);
    publicarTiempoReal(creadas as Array<Record<string, unknown>>);
    return creadas;
  },

  // ── Núcleo basado en eventos (§10) ─────────────────────────────────────────
  /**
   * Procesa un evento: resuelve destinatarios, construye el mensaje, evita
   * duplicados, persiste y emite en tiempo real. Tolerante a fallos: registra
   * el error y continúa, para no afectar la acción principal.
   */
  async notificarEvento(params: NotificarEventoParams): Promise<void> {
    try {
      const { evento, idempotencyExtra } = params;
      const db = params.db ?? prisma;

      if (!isNotificationEvent(evento)) {
        console.warn('[Notificaciones] Evento desconocido, se ignora:', evento);
        return;
      }

      const actor = await resolverActor(db, params.actor);

      const contexto: EventoContexto = {
        ...params.contexto,
        actorNombre:   params.contexto.actorNombre ?? actor?.nombre,
        actorRol:      params.contexto.actorRol ?? actor?.rol,
        actorPerfilId: params.contexto.actorPerfilId ?? actor?.perfilId,
      };

      // 1. Resolver destinatarios (en backend, desde relaciones reales).
      const destinatarios = await resolverDestinatarios(evento, contexto, db);
      if (destinatarios.length === 0) return;

      // 2. Construir el mensaje una sola vez.
      const msg = buildNotificationMessage(evento, contexto);

      // 3. Construir filas con idempotency_key por destinatario.
      const inputs: CrearNotificacionInput[] = destinatarios.map((destinoId) => ({
        usuario_destino_id:    destinoId,
        tipo:                  msg.tipo,
        titulo:                msg.titulo,
        cuerpo:                msg.cuerpo,
        url_accion:            msg.url_accion,
        actor_id:              actor?.perfilId ?? null,
        actor_rol:             contexto.actorRol ?? null,
        actor_nombre_snapshot: contexto.actorNombre ?? null,
        evento,
        entidad_tipo:          msg.entidadTipo,
        entidad_id:            msg.entidadId,
        prioridad:             msg.prioridad,
        metadata:              msg.metadata,
        canal:                 'app',
        idempotency_key: buildIdempotencyKey(
          evento,
          msg.entidadId,
          idempotencyExtra,
          destinoId,
        ),
      }));

      // 4. Persistir en lote evitando duplicados.
      const creadas = await NotificacionRepository.crearLote(inputs, db);

      // 5. Emitir en tiempo real solo las realmente creadas.
      publicarTiempoReal(creadas as Array<Record<string, unknown>>);
    } catch (err) {
      // Una notificación fallida nunca debe romper la operación principal.
      console.error('[Notificaciones] notificarEvento falló:', err);
    }
  },
};
