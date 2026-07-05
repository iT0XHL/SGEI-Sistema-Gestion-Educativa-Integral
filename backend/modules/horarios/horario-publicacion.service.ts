// ============================================================
//  modules/horarios/horario-publicacion.service.ts
//  Flujo de publicación de horarios (borrador → visible a
//  Docente/Alumno). Módulo separado de `academic` porque esta
//  lógica (snapshot, RBAC de lectura por rol, resolución de
//  sección del alumno) es conceptualmente distinta del CRUD de
//  bloques de horario, que sigue viviendo en academic.
// ============================================================
import { prisma } from '@/lib/prisma';
import { assertAccess } from '@/lib/auth';
import { paginate } from '@/lib/response';
import { NotFoundError, ForbiddenError, BusinessRuleError } from '@/errors/http-errors';
import { AuditService } from '@/modules/auditoria/audit.service';
import { PeriodoService } from '@/modules/periodo/periodo.service';
import { HorarioPublicacionRepository } from './horario-publicacion.repository';
import { HorarioDescansoRepository } from './horario-descanso.repository';
import { NivelHorarioConfigRepository } from './nivel-horario-config.repository';
import { NotificacionService } from '@/modules/notificaciones/notificacion.service';
import { NotificationEvents } from '@/modules/notificaciones/notificacion.events';
import type { JwtClaims } from '@/lib/jwt';

function assertAdminOnly(user: JwtClaims) {
  if (user.rol !== 'Admin') {
    throw new ForbiddenError('INSUFFICIENT_ROLE', 'Solo Administración gestiona la publicación de horarios.');
  }
}

/** Resuelve el período a usar: el pedido explícitamente, o el activo. */
async function resolverPeriodoId(periodoId: string | undefined): Promise<string> {
  if (periodoId) return periodoId;
  const { periodo } = await PeriodoService.getActivo();
  if (!periodo) {
    throw new BusinessRuleError('SIN_PERIODO_ACTIVO', 'No hay un período académico activo configurado.');
  }
  return periodo.id;
}

export const HorarioPublicacionService = {
  async listarPorDocente(filters: { periodoId?: string; page: number; limit: number }, user: JwtClaims) {
    assertAdminOnly(user);
    const periodoId = await resolverPeriodoId(filters.periodoId);
    const { rows, total } = await HorarioPublicacionRepository.listarDocentes({ periodoId, page: filters.page, limit: filters.limit });

    const ids = rows.map((r) => r.id);
    const publicaciones = await HorarioPublicacionRepository.publicacionesDeDocentes(ids, periodoId);

    const items = await Promise.all(
      rows.map(async (r) => {
        const bloques = await HorarioPublicacionRepository.bloquesVivosDeDocente(r.id, periodoId);
        return {
          id: r.id,
          nombres: r.nombres,
          apellido_paterno: r.apellido_paterno,
          apellido_materno: r.apellido_materno,
          total_bloques: bloques.length,
          publicado: publicaciones.has(r.id),
          fecha_publicacion: publicaciones.get(r.id) ?? null,
        };
      }),
    );

    return paginate(items, filters.page, filters.limit, total);
  },

  async listarPorSeccion(filters: { periodoId?: string; page: number; limit: number }, user: JwtClaims) {
    assertAdminOnly(user);
    const periodoId = await resolverPeriodoId(filters.periodoId);
    const { rows, total } = await HorarioPublicacionRepository.listarSecciones({ periodoId, page: filters.page, limit: filters.limit });

    const ids = rows.map((r) => r.id);
    const publicaciones = await HorarioPublicacionRepository.publicacionesDeSecciones(ids, periodoId);

    const items = await Promise.all(
      rows.map(async (r) => {
        const bloques = await HorarioPublicacionRepository.bloquesVivosDeSeccion(r.id, periodoId);
        return {
          id: r.id,
          nombre: r.nombre,
          grado: r.grado.nombre,
          nivel: r.grado.nivel.nombre,
          total_bloques: bloques.length,
          publicado: publicaciones.has(r.id),
          fecha_publicacion: publicaciones.get(r.id) ?? null,
        };
      }),
    );

    return paginate(items, filters.page, filters.limit, total);
  },

  async publicarParaDocente(docenteId: string, periodoIdInput: string | undefined, user: JwtClaims) {
    assertAdminOnly(user);
    const periodoId = await resolverPeriodoId(periodoIdInput);

    const docente = await prisma.docente.findUnique({ where: { id: docenteId }, select: { id: true, perfil_usuario_id: true } });
    if (!docente) throw new NotFoundError('Docente');

    const bloques = await HorarioPublicacionRepository.bloquesVivosDeDocente(docenteId, periodoId);
    if (bloques.length === 0) {
      throw new BusinessRuleError('SIN_BLOQUES', 'El docente no tiene bloques de horario para publicar en este período.');
    }

    const resultado = await HorarioPublicacionRepository.publicar('DOCENTE', docenteId, periodoId, user.perfilId, bloques);

    await AuditService.log({
      usuarioId: user.perfilId,
      tipo: 'UPDATE',
      modulo: 'horarios',
      entidadAfectada: 'horario_publicacion',
      entidadId: docenteId,
      newValue: { tipo: 'DOCENTE', periodoId, total_bloques: bloques.length },
    });

    await NotificacionService.notificarEvento({
      evento: NotificationEvents.HORARIO_ACTUALIZADO,
      actor:  { perfilId: user.perfilId, rol: user.rol, nombre: user.nombre },
      contexto: { docenteId, destinatariosExplicitos: [docente.perfil_usuario_id] },
    });

    return resultado;
  },

  async publicarParaSeccion(seccionId: string, periodoIdInput: string | undefined, user: JwtClaims) {
    assertAdminOnly(user);
    const periodoId = await resolverPeriodoId(periodoIdInput);

    const seccion = await prisma.seccion.findUnique({ where: { id: seccionId }, select: { id: true, nombre: true, grado: { select: { nombre: true } } } });
    if (!seccion) throw new NotFoundError('Sección');

    const bloques = await HorarioPublicacionRepository.bloquesVivosDeSeccion(seccionId, periodoId);
    if (bloques.length === 0) {
      throw new BusinessRuleError('SIN_BLOQUES', 'La sección no tiene bloques de horario para publicar en este período.');
    }

    const resultado = await HorarioPublicacionRepository.publicar('SECCION', seccionId, periodoId, user.perfilId, bloques);

    await AuditService.log({
      usuarioId: user.perfilId,
      tipo: 'UPDATE',
      modulo: 'horarios',
      entidadAfectada: 'horario_publicacion',
      entidadId: seccionId,
      newValue: { tipo: 'SECCION', periodoId, total_bloques: bloques.length },
    });

    await NotificacionService.notificarEvento({
      evento: NotificationEvents.HORARIO_ACTUALIZADO,
      actor:  { perfilId: user.perfilId, rol: user.rol, nombre: user.nombre },
      contexto: { seccionId, seccionNombre: `${seccion.grado.nombre} "${seccion.nombre}"` },
    });

    return resultado;
  },

  async despublicarDocente(docenteId: string, periodoIdInput: string | undefined, user: JwtClaims) {
    assertAdminOnly(user);
    const periodoId = await resolverPeriodoId(periodoIdInput);
    await HorarioPublicacionRepository.despublicar('DOCENTE', docenteId, periodoId);
    await AuditService.log({
      usuarioId: user.perfilId,
      tipo: 'UPDATE',
      modulo: 'horarios',
      entidadAfectada: 'horario_publicacion',
      entidadId: docenteId,
      newValue: { tipo: 'DOCENTE', periodoId, publicado: false },
    });
    return { id: docenteId, despublicado: true };
  },

  async despublicarSeccion(seccionId: string, periodoIdInput: string | undefined, user: JwtClaims) {
    assertAdminOnly(user);
    const periodoId = await resolverPeriodoId(periodoIdInput);
    await HorarioPublicacionRepository.despublicar('SECCION', seccionId, periodoId);
    await AuditService.log({
      usuarioId: user.perfilId,
      tipo: 'UPDATE',
      modulo: 'horarios',
      entidadAfectada: 'horario_publicacion',
      entidadId: seccionId,
      newValue: { tipo: 'SECCION', periodoId, publicado: false },
    });
    return { id: seccionId, despublicado: true };
  },

  /** Horario publicado de un docente. Secretaría NO tiene acceso (decisión de negocio). */
  async horarioPublicadoDeDocente(docenteId: string, periodoIdInput: string | undefined, user: JwtClaims) {
    assertAccess(user.rol === 'Admin' || (user.rol === 'Docente' && user.entidadId === docenteId));
    const periodoId = await resolverPeriodoId(periodoIdInput);
    const publicado = await HorarioPublicacionRepository.obtenerPublicado('DOCENTE', docenteId, periodoId);
    if (!publicado) throw new NotFoundError('Horario publicado del docente');

    // Un docente puede enseñar en más de un nivel: se calculan los niveles
    // distintos entre sus asignaciones vigentes y se traen sus descansos.
    const asignaciones = await prisma.asignacionDocente.findMany({
      where: { docente_id: docenteId, periodo_id: periodoId, activo: true },
      select: { seccion: { select: { grado: { select: { nivel_id: true } } } } },
    });
    const nivelIds = [...new Set(asignaciones.map((a) => a.seccion.grado.nivel_id))];
    const [descansos, jornadas] = await Promise.all([
      nivelIds.length ? HorarioDescansoRepository.listarPorNiveles(nivelIds, periodoId) : Promise.resolve([]),
      nivelIds.length ? NivelHorarioConfigRepository.listarPorNiveles(nivelIds, periodoId) : Promise.resolve([]),
    ]);

    return { ...publicado, descansos, jornadas };
  },

  /**
   * Horario publicado de la sección de un alumno. La sección se resuelve
   * SIEMPRE en el servidor a partir de user.entidadId — nunca se confía en
   * un seccionId enviado por el cliente (evita que un alumno vea el
   * horario de otra sección cambiando el id en la URL).
   */
  async horarioPublicadoDeAlumno(alumnoId: string, periodoIdInput: string | undefined, user: JwtClaims) {
    assertAccess(user.rol === 'Admin' || (user.rol === 'Alumno' && user.entidadId === alumnoId));

    const alumno = await prisma.alumno.findUnique({
      where: { id: alumnoId },
      select: { seccion_id: true, seccion: { select: { grado: { select: { nivel_id: true } } } } },
    });
    if (!alumno) throw new NotFoundError('Alumno');

    const periodoId = await resolverPeriodoId(periodoIdInput);
    const publicado = await HorarioPublicacionRepository.obtenerPublicado('SECCION', alumno.seccion_id, periodoId);
    if (!publicado) throw new NotFoundError('Horario publicado de la sección');

    const [descansos, jornadas] = await Promise.all([
      HorarioDescansoRepository.listarPorNiveles([alumno.seccion.grado.nivel_id], periodoId),
      NivelHorarioConfigRepository.listarPorNiveles([alumno.seccion.grado.nivel_id], periodoId),
    ]);

    return { ...publicado, descansos, jornadas };
  },
};
