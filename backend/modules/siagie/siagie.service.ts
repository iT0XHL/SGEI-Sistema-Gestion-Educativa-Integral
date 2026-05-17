import { ForbiddenError } from '@/errors/http-errors';
import { AuditService } from '@/modules/auditoria/audit.service';
import { SiagieRepository } from './siagie.repository';
import type { JwtClaims } from '@/lib/jwt';

function assertAdminOrSecretaria(user: JwtClaims) {
  if (user.rol !== 'Admin' && user.rol !== 'Secretaria') {
    throw new ForbiddenError('INSUFFICIENT_ROLE', 'Solo Admin y Secretaria pueden acceder al módulo SIAGIE.');
  }
}

export const SiagieService = {
  async stats(periodoId: string | undefined, user: JwtClaims) {
    assertAdminOrSecretaria(user);
    return SiagieRepository.stats(periodoId);
  },

  async validar(periodoId: string | undefined, user: JwtClaims) {
    assertAdminOrSecretaria(user);
    return SiagieRepository.validaciones(periodoId);
  },

  async refresh(user: JwtClaims) {
    if (user.rol !== 'Admin') {
      throw new ForbiddenError('INSUFFICIENT_ROLE', 'Solo Admin puede refrescar la vista materializada SIAGIE.');
    }
    await SiagieRepository.refresh();
    await AuditService.log({
      usuarioId:       user.perfilId,
      tipo:            'UPDATE',
      modulo:          'siagie',
      entidadAfectada: 'formato_siagie',
      entidadId:       null,
      newValue:        { accion: 'REFRESH MATERIALIZED VIEW CONCURRENTLY' },
    });
    return { mensaje: 'Vista materializada audit_schema.formato_siagie actualizada.' };
  },

  async exportar(
    periodoId:  string | undefined,
    user:       JwtClaims,
    ip?:        string,
    userAgent?: string,
  ) {
    assertAdminOrSecretaria(user);
    const rows = await SiagieRepository.obtener(periodoId);

    await AuditService.log({
      usuarioId:       user.perfilId,
      tipo:            'READ_SENSITIVE',
      modulo:          'siagie',
      entidadAfectada: 'formato_siagie',
      entidadId:       periodoId ?? null,
      newValue:        { registros: rows.length },
      ip,
      userAgent,
    });

    return rows;
  },
};
