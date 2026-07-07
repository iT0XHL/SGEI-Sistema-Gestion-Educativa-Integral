import { ForbiddenError, NotFoundError, BusinessRuleError } from '@/errors/http-errors';
import { AuditService } from '@/modules/auditoria/audit.service';
import { prisma } from '@/lib/prisma';
import { NotaRepository } from './nota.repository';
import { NotificacionService } from '@/modules/notificaciones/notificacion.service';
import { NotificationEvents } from '@/modules/notificaciones/notificacion.events';
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

    let bimestreNombre: string | undefined;
    if (bimestreId) {
      const bimestre = await prisma.bimestre.findUnique({
        where: { id: bimestreId },
        select: { cerrado: true, nombre: true },
      });
      if (bimestre?.cerrado) {
        throw new BusinessRuleError(
          'BIMESTRE_CERRADO',
          'No se pueden registrar notas en un bimestre cerrado.',
        );
      }
      bimestreNombre = bimestre?.nombre;
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

    // Notifica a cada alumno afectado que se registraron/actualizaron notas
    // (§Bloque 3). Una notificación por alumno, no por competencia, para no
    // saturar con una nota por cada fila del bimestre.
    const alumnosNotificados = [...new Set(notas.map((n) => n.alumno_id))];
    for (const alumnoId of alumnosNotificados) {
      await NotificacionService.notificarEvento({
        evento: NotificationEvents.NOTA_REGISTRADA,
        actor:  { perfilId: user.perfilId, rol: user.rol, nombre: user.nombre },
        contexto: { alumnoId, bimestreNombre },
        idempotencyExtra: `${alumnoId}:${bimestreId}`,
      });
    }

    // Notifica UNA vez a secretaría/admin que el docente registró notas, para
    // que puedan continuar el flujo (revisión / generación de libretas).
    const primeraCompetenciaId = input.notas[0]?.competencia_id;
    let cursoNombre: string | undefined;
    if (primeraCompetenciaId) {
      const comp = await prisma.competencia.findUnique({
        where:  { id: primeraCompetenciaId },
        select: { curso: { select: { nombre: true } } },
      });
      cursoNombre = comp?.curso?.nombre;
    }
    await NotificacionService.notificarEvento({
      evento: NotificationEvents.NOTAS_REGISTRADAS,
      actor:  { perfilId: user.perfilId, rol: user.rol, nombre: user.nombre },
      contexto: { cursoNombre, bimestreNombre },
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
    const actualizada = await NotaRepository.update(id, input, user.perfilId);

    await NotificacionService.notificarEvento({
      evento: NotificationEvents.NOTA_ACTUALIZADA,
      actor:  { perfilId: user.perfilId, rol: user.rol, nombre: user.nombre },
      contexto: { alumnoId: nota.alumno_id, notaId: id },
    });

    return actualizada;
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
