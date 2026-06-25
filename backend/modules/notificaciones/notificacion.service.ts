import { ForbiddenError } from '@/errors/http-errors';
import { NotificacionRepository } from './notificacion.repository';
import type { CrearNotificacionInput } from './notificacion.schema';
import type { JwtClaims } from '@/lib/jwt';

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
    return NotificacionRepository.crear(input);
  },
};
