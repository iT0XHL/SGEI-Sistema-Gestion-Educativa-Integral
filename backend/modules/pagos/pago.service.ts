import { ForbiddenError, NotFoundError } from '@/errors/http-errors';
import { AuditService } from '@/modules/auditoria/audit.service';
import { NotificacionService } from '@/modules/notificaciones/notificacion.service';
import { NotificationEvents } from '@/modules/notificaciones/notificacion.events';
import { PagoRepository } from './pago.repository';
import type { JwtClaims } from '@/lib/jwt';
import type { CreatePagoInput, ListarPagosQueryInput } from './pago.schema';

export const PagoService = {
  async listar(query: ListarPagosQueryInput, user: JwtClaims) {
    // Alumno solo ve sus propios pagos (por la vista v_estado_pagos_alumno)
    if (user.rol === 'Alumno') {
      return PagoRepository.estadoPagosAlumno(user.entidadId);
    }
    // Admin/Secretaria pueden filtrar por cualquier alumno
    return PagoRepository.findMany({
      alumnoId:  query.alumnoId,
      periodoId: query.periodoId,
      estado:    query.estado,
      mes:       query.mes,
    });
  },

  async obtener(id: string, user: JwtClaims) {
    const pago = await PagoRepository.findOne(id);
    if (!pago) throw new NotFoundError('Pago');

    if (user.rol === 'Alumno' && pago.alumno_id !== user.entidadId) {
      throw new ForbiddenError('PAGO_AJENO', 'Solo puedes ver tus propios pagos.');
    }
    return pago;
  },

  async crear(input: CreatePagoInput, user: JwtClaims) {
    if (user.rol !== 'Admin' && user.rol !== 'Secretaria') {
      throw new ForbiddenError('INSUFFICIENT_ROLE', 'Solo Admin y Secretaria pueden crear pagos.');
    }
    const pago = await PagoRepository.create(input, user.perfilId, user.perfilId);

    await AuditService.log({
      usuarioId:       user.perfilId,
      tipo:            'CREATE',
      modulo:          'pagos',
      entidadAfectada: 'pago',
      entidadId:       pago.id,
      newValue: { alumno_id: input.alumno_id, monto: input.monto, mes: input.mes },
    });

    // Notificar al alumno correspondiente (§6 PAGO_REGISTRADO).
    // No se expone el monto en el mensaje por privacidad (§26.16).
    await NotificacionService.notificarEvento({
      evento: NotificationEvents.PAGO_REGISTRADO,
      actor:  { perfilId: user.perfilId, rol: user.rol, nombre: user.nombre },
      contexto: { alumnoId: input.alumno_id, pagoId: pago.id },
    });
    return pago;
  },

  async listarConceptos() {
    return PagoRepository.listarConceptos();
  },
};
