import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

type Db = typeof prisma | Prisma.TransactionClient;

export type TipoNotificacionDB = 'sistema' | 'pago' | 'academico' | 'comunicado';

/** Datos para crear UNA notificación (incluye campos del modelo por eventos). */
export interface CrearNotificacionInput {
  usuario_destino_id:    string;
  tipo:                  TipoNotificacionDB;
  titulo:                string;
  cuerpo:                string;
  url_accion?:           string | null;
  // Campos del sistema por eventos (§8). Opcionales para compatibilidad.
  actor_id?:             string | null;
  actor_rol?:            string | null;
  actor_nombre_snapshot?: string | null;
  evento?:               string | null;
  entidad_tipo?:         string | null;
  entidad_id?:           string | null;
  prioridad?:            string;
  metadata?:             unknown;
  canal?:                string;
  idempotency_key?:      string | null;
  expires_at?:           Date | null;
}

const SELECT_REALTIME = {
  id:                 true,
  usuario_destino_id: true,
  tipo:               true,
  titulo:             true,
  cuerpo:             true,
  url_accion:         true,
  leida:              true,
  prioridad:          true,
  evento:             true,
  metadata:           true,
  created_at:         true,
} as const;

function toCreateData(input: CrearNotificacionInput): Prisma.NotificacionCreateManyInput {
  return {
    usuario_destino_id:    input.usuario_destino_id,
    tipo:                  input.tipo as never,
    titulo:                input.titulo,
    cuerpo:                input.cuerpo,
    url_accion:            input.url_accion ?? null,
    actor_id:              input.actor_id ?? null,
    actor_rol:             input.actor_rol ?? null,
    actor_nombre_snapshot: input.actor_nombre_snapshot ?? null,
    evento:                input.evento ?? null,
    entidad_tipo:          input.entidad_tipo ?? null,
    entidad_id:            input.entidad_id ?? null,
    prioridad:             input.prioridad ?? 'normal',
    metadata:              (input.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
    canal:                 input.canal ?? 'app',
    idempotency_key:       input.idempotency_key ?? null,
    expires_at:            input.expires_at ?? null,
  };
}

export const NotificacionRepository = {
  async listar(usuarioDestinoId: string, leida?: boolean) {
    return prisma.notificacion.findMany({
      where: {
        usuario_destino_id: usuarioDestinoId,
        archivada:          false,
        ...(leida !== undefined ? { leida } : {}),
      },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
  },

  async contarNoLeidas(usuarioDestinoId: string) {
    return prisma.notificacion.count({
      where: { usuario_destino_id: usuarioDestinoId, leida: false, archivada: false },
    });
  },

  async marcarLeida(id: string, usuarioDestinoId: string) {
    return prisma.notificacion.updateMany({
      where: { id, usuario_destino_id: usuarioDestinoId },
      data:  { leida: true, fecha_lectura: new Date() },
    });
  },

  async marcarTodasLeidas(usuarioDestinoId: string) {
    return prisma.notificacion.updateMany({
      where: { usuario_destino_id: usuarioDestinoId, leida: false },
      data:  { leida: true, fecha_lectura: new Date() },
    });
  },

  async archivar(id: string, usuarioDestinoId: string) {
    return prisma.notificacion.updateMany({
      where: { id, usuario_destino_id: usuarioDestinoId },
      data:  { archivada: true },
    });
  },

  /** Crea UNA notificación y devuelve la fila completa (para SSE / respuesta). */
  async crear(input: CrearNotificacionInput, db: Db = prisma) {
    return db.notificacion.create({ data: toCreateData(input) });
  },

  /**
   * Inserta MUCHAS notificaciones evitando duplicados por idempotency_key (§20).
   * Filtra primero las claves ya existentes, inserta el resto y devuelve solo
   * las filas REALMENTE creadas (para publicarlas por SSE).
   */
  async crearLote(inputs: CrearNotificacionInput[], db: Db = prisma) {
    if (inputs.length === 0) return [];

    const conKey = inputs.filter((i) => i.idempotency_key);
    const sinKey = inputs.filter((i) => !i.idempotency_key);

    // 1. Detectar qué claves ya existen para no re-crearlas.
    let yaExisten = new Set<string>();
    if (conKey.length > 0) {
      const keys = conKey.map((i) => i.idempotency_key!) as string[];
      const existentes = await db.notificacion.findMany({
        where:  { idempotency_key: { in: keys } },
        select: { idempotency_key: true },
      });
      yaExisten = new Set(existentes.map((e) => e.idempotency_key!).filter(Boolean));
    }

    const nuevos = [
      ...conKey.filter((i) => !yaExisten.has(i.idempotency_key!)),
      ...sinKey,
    ];
    if (nuevos.length === 0) return [];

    await db.notificacion.createMany({
      data: nuevos.map(toCreateData),
      skipDuplicates: true, // red de seguridad ante carreras concurrentes
    });

    // 2. Recuperar las filas creadas (con clave) para entregarlas en tiempo real.
    const nuevasKeys = nuevos.map((i) => i.idempotency_key).filter(Boolean) as string[];
    if (nuevasKeys.length === 0) return [];

    return db.notificacion.findMany({
      where:  { idempotency_key: { in: nuevasKeys } },
      select: SELECT_REALTIME,
    });
  },
};
