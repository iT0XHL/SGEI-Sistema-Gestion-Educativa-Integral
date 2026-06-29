import { ForbiddenError, NotFoundError } from '@/errors/http-errors';
import { AuditService } from '@/modules/auditoria/audit.service';
import { PagoRepository } from './pago.repository';
import type { JwtClaims } from '@/lib/jwt';
import type { CreatePagoInput, ListarPagosQueryInput } from './pago.schema';

export const PagoService = {
  async listar(query: ListarPagosQueryInput, user: JwtClaims) {
    // Docente no tiene acceso a pagos
    if (user.rol === 'Docente') {
      throw new ForbiddenError('ACCESO_DENEGADO', 'Docente no puede ver pagos.');
    }
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
    // Docente no tiene acceso a pagos
    if (user.rol === 'Docente') {
      throw new ForbiddenError('ACCESO_DENEGADO', 'Docente no puede ver pagos.');
    }

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
    return pago;
  },

  async listarConceptos() {
    return PagoRepository.listarConceptos();
  },
};
