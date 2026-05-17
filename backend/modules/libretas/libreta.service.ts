import { ForbiddenError, NotFoundError } from '@/errors/http-errors';
import { AuditService } from '@/modules/auditoria/audit.service';
import { LibretaRepository } from './libreta.repository';
import type { JwtClaims } from '@/lib/jwt';

export const LibretaService = {
  async obtener(alumnoId: string, bimestreId: string | undefined, user: JwtClaims) {
    if (user.rol === 'Alumno') {
      if (user.entidadId !== alumnoId) {
        throw new ForbiddenError('LIBRETA_AJENA', 'Solo puedes ver tu propia libreta.');
      }
      const bloqueada = await LibretaRepository.bloqueoActivo(alumnoId);
      if (bloqueada) {
        throw new ForbiddenError(
          'LIBRETA_BLOQUEADA',
          'Tu libreta está bloqueada por deuda pendiente o bloqueo administrativo.',
        );
      }
    }

    if (user.rol === 'Docente') {
      // Docente puede ver la libreta de alumnos de su sección
      const rows = await LibretaRepository.obtener(alumnoId, bimestreId);
      if (rows.length === 0) throw new NotFoundError('Libreta del alumno');
      return rows;
    }

    const rows = await LibretaRepository.obtener(alumnoId, bimestreId);
    if (rows.length === 0) throw new NotFoundError('Libreta del alumno');
    return rows;
  },

  async generarPdf(
    alumnoId:   string,
    bimestreId: string | undefined,
    user:       JwtClaims,
    ip?:        string,
    userAgent?: string,
  ) {
    if (user.rol === 'Alumno') {
      if (user.entidadId !== alumnoId) {
        throw new ForbiddenError('LIBRETA_AJENA', 'Solo puedes descargar tu propia libreta.');
      }
      const bloqueada = await LibretaRepository.bloqueoActivo(alumnoId);
      if (bloqueada) {
        throw new ForbiddenError(
          'LIBRETA_BLOQUEADA',
          'Tu libreta está bloqueada por deuda pendiente o bloqueo administrativo.',
        );
      }
    }

    const rows = await LibretaRepository.obtener(alumnoId, bimestreId);
    if (rows.length === 0) throw new NotFoundError('Libreta del alumno');

    // Auditar descarga (READ_SENSITIVE obligatorio MINEDU)
    await AuditService.log({
      usuarioId:       user.perfilId,
      tipo:            'READ_SENSITIVE',
      modulo:          'libretas',
      entidadAfectada: 'mv_libreta_alumno',
      entidadId:       alumnoId,
      ip,
      userAgent,
    });

    return rows;
  },
};
