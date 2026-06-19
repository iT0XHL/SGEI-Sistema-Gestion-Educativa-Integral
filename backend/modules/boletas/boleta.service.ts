import { ForbiddenError, NotFoundError, ConflictError } from '@/errors/http-errors';
import { AuditService } from '@/modules/auditoria/audit.service';
import { NotificacionService } from '@/modules/notificaciones/notificacion.service';
import { NotificationEvents } from '@/modules/notificaciones/notificacion.events';
import { StorageService } from '@/services/storage.service';
import { BUCKETS } from '@/storage/buckets';
import { BoletaRepository } from './boleta.repository';
import { PagoRepository } from '@/modules/pagos/pago.repository';
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

    // Verificar que el pago pertenece al alumno
    const pago = await PagoRepository.findOne(input.pago_id);
    if (!pago) throw new NotFoundError('Pago');
    if (pago.alumno_id !== user.entidadId) {
      throw new ForbiddenError('PAGO_AJENO', 'Este pago no te pertenece.');
    }

    // Solo puede subir si el pago está Pendiente o Rechazado (re-envío)
    if (pago.estado !== 'Pendiente' && pago.estado !== 'Rechazado') {
      throw new ConflictError(
        `No puedes subir una boleta para un pago en estado "${pago.estado}".`,
      );
    }

    // Si ya existe boleta anterior (re-envío), eliminar del Storage y de BD
    const existente = await BoletaRepository.findByPagoId(input.pago_id);
    if (existente && StorageService.isConfigured()) {
      await StorageService.delete(BUCKETS.BOLETAS_PAGOS, existente.url_archivo).catch(() => {});
    }

    // Subir archivo a Storage
    let urlArchivo: string;
    if (StorageService.isConfigured()) {
      urlArchivo = await StorageService.upload(
        BUCKETS.BOLETAS_PAGOS,
        `${user.entidadId}/${input.pago_id}`,
        archivo,
      );
    } else {
      urlArchivo = `mock/${user.entidadId}/${input.pago_id}/${archivo.name}`;
    }

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

    // Notificar a secretarías y administradores para revisión (§6 BOLETA_SUBIDA).
    await NotificacionService.notificarEvento({
      evento: NotificationEvents.BOLETA_SUBIDA,
      actor:  { perfilId: user.perfilId, rol: user.rol, nombre: user.nombre },
      contexto: {
        boletaId:     boleta.id,
        alumnoId:     user.entidadId,
        alumnoNombre: user.nombre,
      },
    });

    return boleta;
  },

  async revisar(input: RevisarBoletaInput, user: JwtClaims) {
    if (user.rol !== 'Admin' && user.rol !== 'Secretaria') {
      throw new ForbiddenError('INSUFFICIENT_ROLE', 'Solo Admin y Secretaria pueden revisar boletas.');
    }

    const boleta = await BoletaRepository.findOne(input.boleta_id);
    if (!boleta) throw new NotFoundError('Boleta');

    if (boleta.estado_revision !== 'En_Revision') {
      throw new ConflictError(
        `La boleta ya fue procesada (estado: ${boleta.estado_revision}).`,
      );
    }

    // El SP financial_schema.revisar_boleta:
    // - valida estado actual
    // - actualiza boleta y pago
    // - crea notificación si Rechazada
    await BoletaRepository.revisar(
      input.boleta_id,
      user.perfilId,
      input.nuevo_estado,
      input.observacion_rechazo ?? null,
      user.perfilId,
    );

    await AuditService.log({
      usuarioId:       user.perfilId,
      tipo:            'UPDATE',
      modulo:          'boletas',
      entidadAfectada: 'boleta_pago',
      entidadId:       input.boleta_id,
      oldValue: { estado_revision: 'En_Revision' },
      newValue: { estado_revision: input.nuevo_estado, observacion: input.observacion_rechazo },
    });

    // Notificar al alumno (§6 BOLETA_REVISADA).
    // IMPORTANTE (§26.18): el SP financial_schema.revisar_boleta YA crea la
    // notificación cuando la boleta es Rechazada. Para evitar duplicados, aquí
    // solo se notifica el caso Aprobada; el caso Rechazada lo gestiona el SP.
    if (input.nuevo_estado === 'Aprobada') {
      await NotificacionService.notificarEvento({
        evento: NotificationEvents.BOLETA_REVISADA,
        actor:  { perfilId: user.perfilId, rol: user.rol, nombre: user.nombre },
        contexto: {
          alumnoId: boleta.pago.alumno_id,
          boletaId: input.boleta_id,
        },
        idempotencyExtra: input.nuevo_estado,
      });
    }

    return BoletaRepository.findOne(input.boleta_id);
  },

  async getArchivoUrl(id: string, user: JwtClaims) {
    const boleta = await BoletaRepository.findOne(id);
    if (!boleta) throw new NotFoundError('Boleta');

    if (user.rol === 'Alumno' && boleta.pago.alumno_id !== user.entidadId) {
      throw new ForbiddenError('BOLETA_AJENA', 'No tienes acceso a este archivo.');
    }

    if (!StorageService.isConfigured()) {
      return { url: boleta.url_archivo, expira_en: null };
    }
    const url = await StorageService.getSignedUrl(BUCKETS.BOLETAS_PAGOS, boleta.url_archivo);
    return { url, expira_en: 300 };
  },
};
