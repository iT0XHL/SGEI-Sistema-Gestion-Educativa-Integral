import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export interface CrearNotificacionInput {
  usuario_destino_id: string;
  tipo:               'sistema' | 'pago' | 'academico' | 'comunicado';
  titulo:             string;
  cuerpo:             string;
  url_accion?:        string;
}

export const NotificacionRepository = {
  async listar(usuarioDestinoId: string, leida?: boolean) {
    return prisma.notificacion.findMany({
      where: {
        usuario_destino_id: usuarioDestinoId,
        ...(leida !== undefined ? { leida } : {}),
      },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
  },

  async contarNoLeidas(usuarioDestinoId: string) {
    return prisma.notificacion.count({
      where: { usuario_destino_id: usuarioDestinoId, leida: false },
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

  async crear(input: CrearNotificacionInput) {
    return prisma.notificacion.create({
      data: {
        usuario_destino_id: input.usuario_destino_id,
        tipo:               input.tipo as never,
        titulo:             input.titulo,
        cuerpo:             input.cuerpo,
        url_accion:         input.url_accion ?? null,
      },
    });
  },

  async crearConTx(tx: Prisma.TransactionClient, input: CrearNotificacionInput) {
    return tx.notificacion.create({
      data: {
        usuario_destino_id: input.usuario_destino_id,
        tipo:               input.tipo as never,
        titulo:             input.titulo,
        cuerpo:             input.cuerpo,
        url_accion:         input.url_accion ?? null,
      },
    });
  },
};
