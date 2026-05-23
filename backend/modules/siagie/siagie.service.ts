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
    assertAdminOrSecretaria(user);
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

    // 1° intento: leer la MV directamente.
    let [detalle, notasFinales] = await Promise.all([
      SiagieRepository.obtener(periodoId),
      SiagieRepository.obtenerNotasFinales(periodoId),
    ]);

    // Si la MV está vacía pero la tabla 'nota' tiene registros, refrescamos
    // automáticamente y reintentamos. Esto cubre el caso inicial (seed sin
    // REFRESH) y el caso en que se ingresaron notas sin refrescar la vista.
    let refrescada = false;
    if (detalle.length === 0 && notasFinales.length === 0) {
      const hayNotas = await SiagieRepository.existenNotas();
      if (hayNotas) {
        await SiagieRepository.refresh();
        refrescada = true;
        [detalle, notasFinales] = await Promise.all([
          SiagieRepository.obtener(periodoId),
          SiagieRepository.obtenerNotasFinales(periodoId),
        ]);
      }
    }

    await AuditService.log({
      usuarioId:       user.perfilId,
      tipo:            'READ_SENSITIVE',
      modulo:          'siagie',
      entidadAfectada: 'formato_siagie',
      entidadId:       periodoId ?? null,
      newValue:        {
        registros_detalle: detalle.length,
        registros_acta:    notasFinales.length,
        mv_refrescada:     refrescada,
      },
      ip,
      userAgent,
    });

    return { detalle, notasFinales };
  },
};
