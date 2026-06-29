import { ForbiddenError, NotFoundError, BusinessRuleError } from '@/errors/http-errors';
import { AuditService } from '@/modules/auditoria/audit.service';
import { prisma } from '@/lib/prisma';
import { NotaRepository } from './nota.repository';
import type { JwtClaims } from '@/lib/jwt';
import type {
  UpsertBatchNotaInput,
  UpdateNotaInput,
  DesbloquearNotaInput,
  ListarNotasQueryInput,
} from './nota.schema';

export const NotaService = {
  async listar(query: ListarNotasQueryInput, user: JwtClaims) {
    const filters: Parameters<typeof NotaRepository.findMany>[0] = {
      ...(query.cerrada !== undefined ? { cerrada: query.cerrada === 'true' } : {}),
    };

    if (user.rol === 'Alumno') {
      filters.alumnoId = user.entidadId;
      if (query.bimestreId) filters.bimestreId = query.bimestreId;
      return NotaRepository.findMany(filters);
    }

    if (user.rol === 'Docente') {
      filters.docenteId = user.entidadId;
      if (query.alumnoId)      filters.alumnoId      = query.alumnoId;
      if (query.bimestreId)    filters.bimestreId    = query.bimestreId;
      if (query.competenciaId) filters.competenciaId = query.competenciaId;
      return NotaRepository.findMany(filters);
    }

    // Admin / Secretaria
    if (query.alumnoId)      filters.alumnoId      = query.alumnoId;
    if (query.bimestreId)    filters.bimestreId    = query.bimestreId;
    if (query.competenciaId) filters.competenciaId = query.competenciaId;
    if (query.docenteId)     filters.docenteId     = query.docenteId;
    return NotaRepository.findMany(filters);
  },

  async obtener(id: string, user: JwtClaims) {
    const nota = await NotaRepository.findOne(id);
    if (!nota) throw new NotFoundError('Nota');

    if (user.rol === 'Alumno' && nota.alumno_id !== user.entidadId) {
      throw new ForbiddenError('NOTA_AJENA', 'Solo puedes ver tus propias notas.');
    }
    if (user.rol === 'Docente' && nota.docente_id !== user.entidadId) {
      throw new ForbiddenError('NOTA_AJENA', 'Solo puedes ver las notas que registraste.');
    }
    return nota;
  },

  async upsertBatch(input: UpsertBatchNotaInput, user: JwtClaims) {
    if (user.rol !== 'Docente' && user.rol !== 'Admin') {
      throw new ForbiddenError('INSUFFICIENT_ROLE', 'Solo docentes y Admin pueden registrar notas.');
    }

    const docenteId = user.entidadId;
    const bimestreId = input.notas[0]?.bimestre_id;

    if (bimestreId) {
      const bimestre = await prisma.bimestre.findUnique({
        where: { id: bimestreId },
        select: { cerrado: true },
      });
      if (bimestre?.cerrado) {
        throw new BusinessRuleError(
          'BIMESTRE_CERRADO',
          'No se pueden registrar notas en un bimestre cerrado.',
        );
      }
    }

    if (user.rol === 'Docente') {
      const idsUnicos = [...new Set(input.notas.map((n) => n.alumno_id))];
      for (const alumnoId of idsUnicos) {
        const tieneAcceso = await NotaRepository.docenteTieneAcceso(docenteId, alumnoId);
        if (!tieneAcceso) {
          throw new ForbiddenError(
            'SECCION_NO_ASIGNADA',
            'No tienes una asignación activa para uno de los alumnos indicados.',
          );
        }
      }
    }

    const notas = await NotaRepository.upsertBatch(input.notas, docenteId, user.perfilId);

    await AuditService.log({
      usuarioId:         user.perfilId,
      tipo:              'CREATE',
      modulo:            'notas',
      entidadAfectada:   'nota',
      entidadId:         null,
      newValue: { total: notas.length, bimestreId },
    });

    return { registradas: notas.length, notas };
  },

  async actualizar(id: string, input: UpdateNotaInput, user: JwtClaims) {
    if (user.rol !== 'Docente' && user.rol !== 'Admin') {
      throw new ForbiddenError('INSUFFICIENT_ROLE', 'Solo docentes y Admin pueden modificar notas.');
    }

    const nota = await NotaRepository.findOne(id);
    if (!nota) throw new NotFoundError('Nota');

    if (user.rol === 'Docente' && nota.docente_id !== user.entidadId) {
      throw new ForbiddenError('NOTA_AJENA', 'Solo puedes modificar las notas que registraste.');
    }

    // La nota cerrada será rechazada por el trigger tg_bloquear_nota_cerrada.
    // El error de PostgreSQL es capturado por errorResponse() como AppError.
    return NotaRepository.update(id, input, user.perfilId);
  },

  async desbloquear(id: string, input: DesbloquearNotaInput, user: JwtClaims) {
    if (user.rol !== 'Admin') {
      throw new ForbiddenError('INSUFFICIENT_ROLE', 'Solo el Administrador puede desbloquear notas cerradas.');
    }

    const nota = await NotaRepository.findOne(id);
    if (!nota) throw new NotFoundError('Nota');

    if (!nota.cerrada) {
      throw new ForbiddenError('NOTA_NO_CERRADA', 'La nota no está cerrada; no requiere desbloqueo.');
    }

    const resultado = await NotaRepository.desbloquear(
      id,
      input,
      user.perfilId,
      user.perfilId,
    );

    await AuditService.log({
      usuarioId:       user.perfilId,
      tipo:            'UPDATE',
      modulo:          'notas',
      entidadAfectada: 'nota',
      entidadId:       id,
      oldValue: { nota_vigesimal: nota.nota_vigesimal, cerrada: true },
      newValue: { nota_vigesimal: input.valor_nuevo,   cerrada: false, motivo: input.motivo },
    });

    return resultado;
  },
};
