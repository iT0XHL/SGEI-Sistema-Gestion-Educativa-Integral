import { ForbiddenError, NotFoundError } from '@/errors/http-errors';
import { AuditService } from '@/modules/auditoria/audit.service';
import { SfaRepository } from './sfa.repository';
import type { UpsertSfaInput, ListarSfaFilter } from './sfa.schema';
import type { JwtClaims } from '@/lib/jwt';

function assertAdminOrSecretaria(user: JwtClaims) {
  if (user.rol !== 'Admin' && user.rol !== 'Secretaria') {
    throw new ForbiddenError('INSUFFICIENT_ROLE', 'Solo Admin y Secretaria pueden gestionar la situación final.');
  }
}

export const SfaService = {
  async listar(filters: ListarSfaFilter, user: JwtClaims) {
    if (user.rol === 'Alumno') {
      return SfaRepository.listar({ ...filters, alumnoId: user.entidadId });
    }
    return SfaRepository.listar(filters);
  },

  async obtener(alumnoId: string, periodoId: string, user: JwtClaims) {
    if (user.rol === 'Alumno' && user.entidadId !== alumnoId) {
      throw new ForbiddenError('ACCESS_DENIED', 'Solo puedes ver tu propia situación final.');
    }
    const sfa = await SfaRepository.findByAlumno(alumnoId, periodoId);
    if (!sfa) throw new NotFoundError('SFA_NOT_FOUND', 'Situación final no registrada para este alumno y período.');
    return sfa;
  },

  async upsert(input: UpsertSfaInput, user: JwtClaims) {
    assertAdminOrSecretaria(user);

    const sfa = await SfaRepository.upsert(input, user.perfilId, user.perfilId);

    await AuditService.log({
      usuarioId:       user.perfilId,
      tipo:            'UPDATE',
      modulo:          'situacion_final',
      entidadAfectada: 'situacion_final_alumno',
      entidadId:       sfa.id,
      newValue:        { situacion_final: input.situacion_final, alumno_id: input.alumno_id },
    });

    return sfa;
  },

  async eliminar(alumnoId: string, periodoId: string, user: JwtClaims) {
    if (user.rol !== 'Admin') {
      throw new ForbiddenError('INSUFFICIENT_ROLE', 'Solo Admin puede eliminar la situación final.');
    }

    const sfa = await SfaRepository.findByAlumno(alumnoId, periodoId);
    if (!sfa) throw new NotFoundError('SFA_NOT_FOUND', 'Situación final no encontrada.');

    await SfaRepository.eliminar(alumnoId, periodoId, user.perfilId);

    await AuditService.log({
      usuarioId:       user.perfilId,
      tipo:            'DELETE',
      modulo:          'situacion_final',
      entidadAfectada: 'situacion_final_alumno',
      entidadId:       sfa.id,
      newValue:        null,
    });
  },
};
