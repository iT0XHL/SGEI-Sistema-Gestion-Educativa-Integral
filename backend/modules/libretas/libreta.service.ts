import { prisma } from '@/lib/prisma';
import { ForbiddenError, NotFoundError, BusinessRuleError } from '@/errors/http-errors';
import { AuditService } from '@/modules/auditoria/audit.service';
import { NotificacionService } from '@/modules/notificaciones/notificacion.service';
import { NotificationEvents, type NotificationEvent } from '@/modules/notificaciones/notificacion.events';
import { LibretaRepository } from './libreta.repository';
import type { JwtClaims } from '@/lib/jwt';
import type { EstadoRecepcionQueryInput } from './libreta.schema';

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
      // §14/§23: el alumno solo ve libretas PUBLICADAS (snapshot inmutable).
      const publicadas = await LibretaRepository.obtenerSnapshotPublicado(alumnoId, bimestreId);
      if (publicadas.length === 0) {
        throw new ForbiddenError(
          'LIBRETA_NO_PUBLICADA',
          'Tu libreta aún no está publicada por la secretaría.',
        );
      }
      return publicadas;
    }
    // Admin/Secretaria/Docente: vista en vivo (MV) para revisión interna.
    return LibretaRepository.obtener(alumnoId, bimestreId);
  },

  async generarPdf(
    alumnoId:   string,
    bimestreId: string | undefined,
    user:       JwtClaims,
    ip?:        string,
    userAgent?: string,
  ) {
    let rows;
    if (user.rol === 'Alumno') {
      if (user.entidadId !== alumnoId) {
        throw new ForbiddenError('LIBRETA_AJENA', 'Solo puedes descargar tu propia libreta.');
      }
      // El alumno con deuda/bloqueo NO puede descargar (§24).
      const bloqueada = await LibretaRepository.bloqueoActivo(alumnoId);
      if (bloqueada) {
        throw new ForbiddenError(
          'LIBRETA_BLOQUEADA',
          'Tu libreta está bloqueada por deuda pendiente o bloqueo administrativo.',
        );
      }
      // Solo descarga la libreta PUBLICADA (snapshot inmutable, §14/§23).
      rows = await LibretaRepository.obtenerSnapshotPublicado(alumnoId, bimestreId);
      if (rows.length === 0) {
        throw new ForbiddenError('LIBRETA_NO_PUBLICADA', 'Tu libreta aún no está publicada por la secretaría.');
      }
    } else {
      if (user.rol === 'Docente') {
        const ensenha = await LibretaRepository.docenteEnsenhaAlumno(user.entidadId!, alumnoId, bimestreId);
        if (!ensenha) {
          throw new ForbiddenError('ACCESO_DENEGADO', 'No enseñas a este alumno en el bimestre seleccionado.');
        }
      }
      // Admin/Secretaria/Docente: descarga interna de la vista en vivo, PERMITIDA
      // aun con deuda del alumno, pero queda auditada (§24).
      rows = await LibretaRepository.obtener(alumnoId, bimestreId);
      if (rows.length === 0) throw new NotFoundError('Libreta del alumno');
    }

    await AuditService.log({
      usuarioId:       user.perfilId,
      tipo:            'READ_SENSITIVE',
      modulo:          'libretas',
      entidadAfectada: 'mv_libreta_alumno',
      entidadId:       alumnoId,
      ip,
      userAgent,
    });

    // La descarga es un evento de AUDITORÍA (§22), no de notificación: no se
    // emite notificación al alumno para evitar ruido/spam (especialmente en
    // descargas masivas de secretaría).

    return rows;
  },

  /** Contexto (institución, DNI/código, periodos) para la cabecera del PDF. */
  async metaPdf(alumnoId: string) {
    return LibretaRepository.metaPdf(alumnoId);
  },

  async estadoRecepcion(filters: EstadoRecepcionQueryInput, user: JwtClaims) {
    if (user.rol !== 'Admin' && user.rol !== 'Secretaria') {
      throw new ForbiddenError('INSUFFICIENT_ROLE', 'Solo Admin/Secretaria pueden ver el estado de recepción.');
    }
    return LibretaRepository.estadoRecepcion(filters);
  },

  async resumenSeccion(seccionId: string, bimestreId: string | undefined, user: JwtClaims) {
    if (user.rol !== 'Admin' && user.rol !== 'Secretaria') {
      throw new ForbiddenError('INSUFFICIENT_ROLE', 'Solo Admin/Secretaria pueden ver el resumen de sección.');
    }
    return LibretaRepository.resumenSeccion(seccionId, bimestreId);
  },

  async generar(alumnoId: string, bimestreId: string, user: JwtClaims) {
    if (user.rol !== 'Admin' && user.rol !== 'Secretaria') {
      throw new ForbiddenError('INSUFFICIENT_ROLE', 'Solo Admin/Secretaria pueden generar libretas.');
    }

    const rows = await LibretaRepository.obtener(alumnoId, bimestreId);
    if (rows.length === 0) throw new NotFoundError('Notas del alumno para este bimestre');

    const bimestreInfo = await LibretaRepository.findBimestrePeriodo(bimestreId);
    if (!bimestreInfo) throw new NotFoundError('Bimestre');

    const existente = await prisma.libreta.findFirst({
      where: { alumno_id: alumnoId, bimestre_id: bimestreId },
      select: { id: true, estado: true },
    });
    if (existente) {
      throw new BusinessRuleError(
        'LIBRETA_YA_EXISTE',
        `La libreta ya fue generada (estado: ${existente.estado}).`,
      );
    }

    const libreta = await LibretaRepository.crearLibreta({
      alumnoId,
      periodoId: bimestreInfo.periodo_id,
      bimestreId,
      generadaPor: user.perfilId,
    });

    await AuditService.log({
      usuarioId:       user.perfilId,
      tipo:            'CREATE',
      modulo:          'libretas',
      entidadAfectada: 'libreta',
      entidadId:       libreta.id,
    });

    // Generar es un BORRADOR interno: el alumno NO ve la libreta hasta que se
    // publica, así que no se le notifica aquí (se evita ruido §26.1). El alumno
    // se entera al PUBLICAR (ver cambiarEstado).

    return libreta;
  },

  async cambiarEstado(
    id: string,
    nuevoEstado: string,
    user: JwtClaims,
    observacion?: string | null,
  ) {
    if (user.rol !== 'Admin' && user.rol !== 'Secretaria') {
      throw new ForbiddenError('INSUFFICIENT_ROLE', 'Solo Admin/Secretaria pueden cambiar el estado de libretas.');
    }

    const libreta = await LibretaRepository.findById(id);
    if (!libreta) throw new NotFoundError('Libreta');

    // Máquina de estados. Se permite aprobar directamente desde BORRADOR/OBSERVADA
    // (las acciones del frontend son Aprobar/Observar/Publicar/Anular), manteniendo
    // EN_REVISION como paso intermedio opcional. Así PUBLICADA es alcanzable.
    const TRANSITIONS: Record<string, string[]> = {
      BORRADOR:    ['EN_REVISION', 'APROBADA', 'OBSERVADA', 'ANULADA'],
      EN_REVISION: ['APROBADA', 'OBSERVADA', 'ANULADA'],
      OBSERVADA:   ['EN_REVISION', 'APROBADA', 'ANULADA'],
      APROBADA:    ['PUBLICADA', 'OBSERVADA', 'BLOQUEADA', 'ANULADA'],
      PUBLICADA:   ['BLOQUEADA', 'ANULADA'],
      BLOQUEADA:   ['PUBLICADA', 'ANULADA'],
    };

    const allowed = TRANSITIONS[libreta.estado];
    if (!allowed || !allowed.includes(nuevoEstado)) {
      throw new BusinessRuleError(
        'TRANSICION_INVALIDA',
        `No se puede cambiar de ${libreta.estado} a ${nuevoEstado}.`,
      );
    }

    await LibretaRepository.cambiarEstado(id, nuevoEstado, user.perfilId, observacion);

    await AuditService.log({
      usuarioId:       user.perfilId,
      tipo:            'UPDATE',
      modulo:          'libretas',
      entidadAfectada: 'libreta',
      entidadId:       id,
      oldValue: { estado: libreta.estado },
      newValue: { estado: nuevoEstado },
    });

    // Solo se notifica al alumno por los estados que le conciernen directamente:
    // PUBLICADA (su libreta ya está disponible) y BLOQUEADA. Los estados internos
    // del flujo (EN_REVISION/APROBADA/OBSERVADA) no generan ruido al alumno (§26.1);
    // quedan registrados en libreta_revision y auditoría.
    const eventoMap: Record<string, NotificationEvent> = {
      PUBLICADA: NotificationEvents.LIBRETA_PUBLICADA,
      BLOQUEADA: NotificationEvents.LIBRETA_BLOQUEADA,
    };
    const evento = eventoMap[nuevoEstado];
    if (evento) {
      await NotificacionService.notificarEvento({
        evento,
        actor:  { perfilId: user.perfilId, rol: user.rol, nombre: user.nombre },
        // libretaId hace única la idempotency_key por libreta: así la publicación
        // de cada bimestre notifica de forma independiente (no se deduplica entre
        // libretas distintas del mismo alumno).
        contexto: { alumnoId: libreta.alumno_id, libretaId: id },
      });
    }

    return prisma.libreta.findUnique({ where: { id } });
  },
};
