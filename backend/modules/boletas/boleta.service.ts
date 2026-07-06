import { ForbiddenError, NotFoundError, ConflictError } from '@/errors/http-errors';
import { AuditService } from '@/modules/auditoria/audit.service';
import { StorageService } from '@/services/storage.service';
import { BUCKETS } from '@/storage/buckets';
import { BoletaRepository } from './boleta.repository';
import { PagoRepository } from '@/modules/pagos/pago.repository';
import { NotificacionService } from '@/modules/notificaciones/notificacion.service';
import { NotificationEvents } from '@/modules/notificaciones/notificacion.events';
import type { JwtClaims } from '@/lib/jwt';
import type { SubirBoletaInput, RevisarBoletaInput, ListarBoletasQueryInput } from './boleta.schema';

export const BoletaService = {
  async listar(query: ListarBoletasQueryInput, user: JwtClaims) {
    if (user.rol === 'Alumno') {
      return BoletaRepository.findMany({ alumnoId: user.entidadId });
    }
    return BoletaRepository.findMany({
      alumnoId:       query.alumnoId,
      pagoId:         query.pagoId,
      estadoRevision: query.estadoRevision,
    });
  },

  async obtener(id: string, user: JwtClaims) {
    const boleta = await BoletaRepository.findOne(id);
    if (!boleta) throw new NotFoundError('Boleta');

    if (user.rol === 'Alumno' && boleta.pago.alumno_id !== user.entidadId) {
      throw new ForbiddenError('BOLETA_AJENA', 'Solo puedes ver tus propias boletas.');
    }
    return boleta;
  },

  async subir(input: SubirBoletaInput, archivo: File, user: JwtClaims) {
    if (user.rol !== 'Alumno') {
      throw new ForbiddenError('INSUFFICIENT_ROLE', 'Solo el alumno puede subir comprobantes.');
    }

    const pago = await PagoRepository.findOne(input.pago_id);
    if (!pago) throw new NotFoundError('Pago');
    if (pago.alumno_id !== user.entidadId) {
      throw new ForbiddenError('PAGO_AJENO', 'Este pago no te pertenece.');
    }

    if (pago.estado !== 'Pendiente' && pago.estado !== 'Rechazado') {
      throw new ConflictError(
        `No puedes subir una boleta para un pago en estado "${pago.estado}".`,
      );
    }

    const existente = await BoletaRepository.findByPagoId(input.pago_id);
    if (existente) {
      await StorageService.delete(BUCKETS.BOLETAS_PAGOS, existente.url_archivo).catch(() => {});
      await BoletaRepository.delete(existente.id, user.perfilId);
    }

    const urlArchivo = await StorageService.upload(
      BUCKETS.BOLETAS_PAGOS,
      `${user.entidadId}/${input.pago_id}`,
      archivo,
    );

    const boleta = await BoletaRepository.create(
      {
        pago_id:          input.pago_id,
        url_archivo:      urlArchivo,
        nombre_archivo:   archivo.name,
        banco:            input.banco,
        numero_operacion: input.numero_operacion,
      },
      user.perfilId,
    );

    await AuditService.log({
      usuarioId:       user.perfilId,
      tipo:            'CREATE',
      modulo:          'boletas',
      entidadAfectada: 'boleta_pago',
      entidadId:       boleta.id,
      newValue: { pago_id: input.pago_id, nombre_archivo: archivo.name },
    });

    await NotificacionService.notificarEvento({
      evento: NotificationEvents.BOLETA_SUBIDA,
      actor:  { perfilId: user.perfilId, rol: user.rol, nombre: user.nombre },
      contexto: {
        boletaId:    boleta.id,
        alumnoId:    user.entidadId,
      },
    });

    return boleta;
  },

  async revisar(input: RevisarBoletaInput, user: JwtClaims) {
    if (user.rol !== 'Secretaria' && user.rol !== 'Admin') {
      throw new ForbiddenError('INSUFFICIENT_ROLE', 'Solo Secretaría y Admin pueden revisar boletas.');
    }

    const boleta = await BoletaRepository.findOne(input.boleta_id);
    if (!boleta) throw new NotFoundError('Boleta');

    await BoletaRepository.revisar(
      input.boleta_id,
      user.perfilId,
      input.nuevo_estado,
      input.observacion_rechazo ?? null,
      user.perfilId,
    );

    await NotificacionService.notificarEvento({
      evento: NotificationEvents.BOLETA_REVISADA,
      actor:  { perfilId: user.perfilId, rol: user.rol, nombre: user.nombre },
      contexto: {
        boletaId: boleta.id,
        alumnoId: boleta.pago?.alumno_id!,
      },
    });

    await AuditService.log({
      usuarioId:       user.perfilId,
      tipo:            'UPDATE',
      modulo:          'boletas',
      entidadAfectada: 'boleta_pago',
      entidadId:       boleta.id,
      newValue: { estado_revision: input.nuevo_estado },
      oldValue: { estado_revision: boleta.estado_revision },
    });

  },

  async getArchivoUrl(id: string, user: JwtClaims): Promise<{ url: string; expira_en: number | null }> {
    const boleta = await this.obtener(id, user);
    const signedUrl = await StorageService.getSignedUrl(BUCKETS.BOLETAS_PAGOS, boleta.url_archivo);
    return { url: signedUrl, expira_en: 300 };
  },
};
