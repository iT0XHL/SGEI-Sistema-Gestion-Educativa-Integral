// ============================================================
//  modules/actividades/actividades.service.ts
//  RBAC:
//    Docente  → CRUD de sus actividades (secciones asignadas)
//    Alumno   → lectura de actividades de su sección + subir entrega
//    Admin    → lectura global
//    Secretaria → sin acceso
// ============================================================
import { ForbiddenError, NotFoundError, BusinessRuleError } from '@/errors/http-errors';
import { AuditService } from '@/modules/auditoria/audit.service';
import { NotificacionService } from '@/modules/notificaciones/notificacion.service';
import { NotificationEvents } from '@/modules/notificaciones/notificacion.events';
import { StorageService } from '@/services/storage.service';
import { BUCKETS } from '@/storage/buckets';
import { AsistenciaAlumnosRepository } from '@/modules/asistencias/asistencia-alumnos.repository';
import { prisma } from '@/lib/prisma';
import { ActividadesRepository } from './actividades.repository';
import type { JwtClaims } from '@/lib/jwt';
import type {
  CreateActividadInput,
  UpdateActividadInput,
  ListActividadesQuery,
  SubmitEntregaInput,
  CalificarEntregaInput,
} from './actividades.schema';

async function getAlumnoSeccionId(alumnoEntidadId: string): Promise<string> {
  const alumno = await prisma.alumno.findUnique({
    where: { id: alumnoEntidadId },
    select: { seccion_id: true },
  });
  if (!alumno) throw new NotFoundError('Alumno');
  return alumno.seccion_id;
}

async function assertDocenteEnSeccion(docenteId: string, seccionId: string) {
  const tiene = await AsistenciaAlumnosRepository.docenteTieneAsignacion(docenteId, seccionId);
  if (!tiene) {
    throw new ForbiddenError('SECCION_NO_ASIGNADA', 'No tienes una asignación activa en esta sección.');
  }
}

/** Notifica ACTIVIDAD_PUBLICADA a los alumnos de la sección (§6). */
async function notificarActividadPublicada(
  actividad: { id: string; seccion_id: string; titulo: string },
  user: JwtClaims,
): Promise<void> {
  await NotificacionService.notificarEvento({
    evento: NotificationEvents.ACTIVIDAD_PUBLICADA,
    actor:  { perfilId: user.perfilId, rol: user.rol, nombre: user.nombre },
    contexto: {
      seccionId:       actividad.seccion_id,
      actividadId:     actividad.id,
      actividadTitulo: actividad.titulo,
    },
  });
}

export const ActividadesService = {
  async list(filters: ListActividadesQuery, user: JwtClaims) {
    if (user.rol === 'Secretaria') {
      throw new ForbiddenError('INSUFFICIENT_ROLE', 'Secretaría no tiene acceso a actividades.');
    }

    if (user.rol === 'Alumno') {
      const seccionId = await getAlumnoSeccionId(user.entidadId);
      return ActividadesRepository.list({ seccionId, cursoId: filters.cursoId, tipo: filters.tipo });
    }

    if (user.rol === 'Docente') {
      return ActividadesRepository.list({
        docenteId: user.entidadId,
        seccionId: filters.seccionId,
        cursoId: filters.cursoId,
        tipo: filters.tipo,
      });
    }

    return ActividadesRepository.list(filters);
  },

  async get(id: string, user: JwtClaims) {
    const actividad = await ActividadesRepository.findById(id);
    if (!actividad) throw new NotFoundError('Actividad');

    if (user.rol === 'Alumno') {
      const seccionId = await getAlumnoSeccionId(user.entidadId);
      if (actividad.seccion_id !== seccionId) {
        throw new ForbiddenError('ACCESS_DENIED', 'No tienes acceso a esta actividad.');
      }
    }

    if (user.rol === 'Docente' && actividad.docente_id !== user.entidadId) {
      throw new ForbiddenError('ACCESS_DENIED', 'No eres el autor de esta actividad.');
    }

    return actividad;
  },

  async create(input: CreateActividadInput, user: JwtClaims) {
    if (user.rol !== 'Docente' && user.rol !== 'Admin') {
      throw new ForbiddenError('INSUFFICIENT_ROLE', 'Solo Docente y Admin pueden crear actividades.');
    }
    if (user.rol === 'Docente') {
      await assertDocenteEnSeccion(user.entidadId, input.seccion_id);
    }

    const actividad = await ActividadesRepository.create({
      docente_id: user.entidadId,
      curso_id: input.curso_id,
      seccion_id: input.seccion_id,
      titulo: input.titulo,
      descripcion: input.descripcion ?? null,
      tipo: input.tipo ?? null,
      fecha_limite: new Date(input.fecha_limite),
      puntaje_maximo: input.puntaje_maximo,
      url_adjunto: input.url_adjunto ?? null,
    });

    await AuditService.log({
      usuarioId: user.perfilId,
      tipo: 'CREATE',
      modulo: 'actividades',
      entidadAfectada: 'actividad',
      entidadId: actividad.id,
      newValue: { titulo: actividad.titulo, tipo: actividad.tipo },
    });

    await notificarActividadPublicada(actividad, user);
    return actividad;
  },

  /** Crea actividad con adjunto subido a Storage. */
  async createWithFile(
    data: Omit<CreateActividadInput, 'url_adjunto'>,
    file: File,
    user: JwtClaims,
  ) {
    if (user.rol !== 'Docente' && user.rol !== 'Admin') {
      throw new ForbiddenError('INSUFFICIENT_ROLE', 'Solo Docente y Admin pueden subir adjuntos.');
    }
    if (user.rol === 'Docente') {
      await assertDocenteEnSeccion(user.entidadId, data.seccion_id);
    }

    const objectPath = await StorageService.upload(
      BUCKETS.ACTIVIDADES_ADJUNTOS,
      user.entidadId,
      file,
    );

    const actividad = await ActividadesRepository.create({
      docente_id: user.entidadId,
      curso_id: data.curso_id,
      seccion_id: data.seccion_id,
      titulo: data.titulo,
      descripcion: data.descripcion ?? null,
      tipo: data.tipo ?? null,
      fecha_limite: new Date(data.fecha_limite),
      puntaje_maximo: data.puntaje_maximo,
      url_adjunto: objectPath,
    });

    await notificarActividadPublicada(actividad, user);
    return actividad;
  },

  async update(id: string, input: UpdateActividadInput, user: JwtClaims) {
    const actividad = await ActividadesRepository.findById(id);
    if (!actividad) throw new NotFoundError('Actividad');

    if (user.rol === 'Docente' && actividad.docente_id !== user.entidadId) {
      throw new ForbiddenError('ACCESS_DENIED', 'No eres el autor de esta actividad.');
    }
    if (user.rol !== 'Docente' && user.rol !== 'Admin') {
      throw new ForbiddenError('INSUFFICIENT_ROLE', 'Sin permisos para editar actividades.');
    }

    return ActividadesRepository.update(id, {
      ...(input.titulo !== undefined ? { titulo: input.titulo } : {}),
      ...(input.descripcion !== undefined ? { descripcion: input.descripcion } : {}),
      ...(input.tipo !== undefined ? { tipo: input.tipo } : {}),
      ...(input.fecha_limite !== undefined ? { fecha_limite: new Date(input.fecha_limite) } : {}),
      ...(input.puntaje_maximo !== undefined ? { puntaje_maximo: input.puntaje_maximo } : {}),
      ...(input.url_adjunto !== undefined ? { url_adjunto: input.url_adjunto } : {}),
    });
  },

  async delete(id: string, user: JwtClaims) {
    const actividad = await ActividadesRepository.findById(id);
    if (!actividad) throw new NotFoundError('Actividad');

    if (user.rol === 'Docente' && actividad.docente_id !== user.entidadId) {
      throw new ForbiddenError('ACCESS_DENIED', 'No eres el autor de esta actividad.');
    }
    if (user.rol !== 'Docente' && user.rol !== 'Admin') {
      throw new ForbiddenError('INSUFFICIENT_ROLE', 'Sin permisos para eliminar actividades.');
    }

    // Limpiar adjunto del docente en Storage si existe.
    if (actividad.url_adjunto && StorageService.isConfigured()) {
      await StorageService.delete(BUCKETS.ACTIVIDADES_ADJUNTOS, actividad.url_adjunto);
    }

    await ActividadesRepository.delete(id);

    await AuditService.log({
      usuarioId: user.perfilId,
      tipo: 'DELETE',
      modulo: 'actividades',
      entidadAfectada: 'actividad',
      entidadId: id,
      oldValue: { titulo: actividad.titulo },
    });

    return { id };
  },

  // ── Entregas ────────────────────────────────────────────────

  async listEntregas(actividadId: string, user: JwtClaims) {
    const actividad = await ActividadesRepository.findById(actividadId);
    if (!actividad) throw new NotFoundError('Actividad');

    if (user.rol === 'Alumno') {
      // El alumno solo ve su propia entrega.
      const entrega = await ActividadesRepository.findEntregaByAlumnoAndActividad(
        user.entidadId,
        actividadId,
      );
      return entrega ? [entrega] : [];
    }

    if (user.rol === 'Docente' && actividad.docente_id !== user.entidadId) {
      throw new ForbiddenError('ACCESS_DENIED', 'No eres el autor de esta actividad.');
    }

    return ActividadesRepository.listEntregas(actividadId);
  },

  /** Alumno entrega (JSON sin archivo) */
  async submitEntrega(actividadId: string, input: SubmitEntregaInput, user: JwtClaims) {
    if (user.rol !== 'Alumno') {
      throw new ForbiddenError('INSUFFICIENT_ROLE', 'Solo alumnos pueden entregar.');
    }

    const actividad = await ActividadesRepository.findById(actividadId);
    if (!actividad) throw new NotFoundError('Actividad');

    const seccionAlumno = await getAlumnoSeccionId(user.entidadId);
    if (actividad.seccion_id !== seccionAlumno) {
      throw new ForbiddenError('ACCESS_DENIED', 'Esta actividad no corresponde a tu sección.');
    }

    if (new Date() > actividad.fecha_limite) {
      throw new BusinessRuleError(
        'FUERA_DE_PLAZO',
        'La fecha límite de entrega ya pasó.',
      );
    }

    const existente = await ActividadesRepository.findEntregaByAlumnoAndActividad(
      user.entidadId,
      actividadId,
    );

    if (existente) {
      // Re-entrega: solo actualizar si no ha sido calificada.
      if (existente.estado === 'calificado') {
        throw new BusinessRuleError('ENTREGA_CALIFICADA', 'Tu entrega ya fue calificada y no puede modificarse.');
      }
      return ActividadesRepository.updateEntrega(existente.id, {
        comentario_alumno: input.comentario_alumno ?? null,
        estado: 'entregado',
        fecha_entrega: new Date(),
      });
    }

    return ActividadesRepository.createEntrega({
      actividad_id: actividadId,
      alumno_id: user.entidadId,
      estado: 'entregado',
      comentario_alumno: input.comentario_alumno ?? null,
    });
  },

  /** Alumno entrega con archivo subido a Storage */
  async submitEntregaConArchivo(actividadId: string, comentario: string | null, file: File, user: JwtClaims) {
    if (user.rol !== 'Alumno') {
      throw new ForbiddenError('INSUFFICIENT_ROLE', 'Solo alumnos pueden entregar.');
    }

    const actividad = await ActividadesRepository.findById(actividadId);
    if (!actividad) throw new NotFoundError('Actividad');

    const seccionAlumno = await getAlumnoSeccionId(user.entidadId);
    if (actividad.seccion_id !== seccionAlumno) {
      throw new ForbiddenError('ACCESS_DENIED', 'Esta actividad no corresponde a tu sección.');
    }

    if (new Date() > actividad.fecha_limite) {
      throw new BusinessRuleError('FUERA_DE_PLAZO', 'La fecha límite de entrega ya pasó.');
    }

    const objectPath = await StorageService.upload(
      BUCKETS.ENTREGAS_ALUMNOS,
      `${actividadId}/${user.entidadId}`,
      file,
    );

    const existente = await ActividadesRepository.findEntregaByAlumnoAndActividad(
      user.entidadId,
      actividadId,
    );

    if (existente) {
      if (existente.estado === 'calificado') {
        throw new BusinessRuleError('ENTREGA_CALIFICADA', 'Tu entrega ya fue calificada.');
      }
      // Borrar archivo anterior de Storage.
      if (existente.url_archivo && StorageService.isConfigured()) {
        await StorageService.delete(BUCKETS.ENTREGAS_ALUMNOS, existente.url_archivo);
      }
      return ActividadesRepository.updateEntrega(existente.id, {
        url_archivo: objectPath,
        comentario_alumno: comentario ?? null,
        estado: 'entregado',
        fecha_entrega: new Date(),
      });
    }

    return ActividadesRepository.createEntrega({
      actividad_id: actividadId,
      alumno_id: user.entidadId,
      estado: 'entregado',
      url_archivo: objectPath,
      comentario_alumno: comentario ?? null,
    });
  },

  /** Docente califica una entrega */
  async calificarEntrega(entregaId: string, input: CalificarEntregaInput, user: JwtClaims) {
    if (user.rol !== 'Docente' && user.rol !== 'Admin') {
      throw new ForbiddenError('INSUFFICIENT_ROLE', 'Solo Docente y Admin pueden calificar entregas.');
    }

    const entrega = await ActividadesRepository.findEntregaById(entregaId);
    if (!entrega) throw new NotFoundError('Entrega');

    const actividad = await ActividadesRepository.findById(entrega.actividad_id);
    if (!actividad) throw new NotFoundError('Actividad');

    if (user.rol === 'Docente' && actividad.docente_id !== user.entidadId) {
      throw new ForbiddenError('ACCESS_DENIED', 'No eres el autor de esta actividad.');
    }

    if (input.nota !== undefined && input.nota !== null && actividad.puntaje_maximo) {
      const maxPuntaje = Number(actividad.puntaje_maximo);
      if (input.nota > maxPuntaje) {
        throw new BusinessRuleError(
          'NOTA_EXCEDE_MAXIMO',
          `La nota ${input.nota} excede el puntaje máximo (${maxPuntaje}).`,
        );
      }
    }

    const entregaCalificada = await ActividadesRepository.updateEntrega(entregaId, {
      ...(input.nota !== undefined ? { nota: input.nota } : {}),
      ...(input.observacion_docente !== undefined ? { observacion_docente: input.observacion_docente } : {}),
      estado: input.estado ?? 'calificado',
      fecha_calificacion: new Date(),
    });

    // Notificar al alumno dueño de la entrega (§6 TAREA_CALIFICADA).
    await NotificacionService.notificarEvento({
      evento: NotificationEvents.TAREA_CALIFICADA,
      actor:  { perfilId: user.perfilId, rol: user.rol, nombre: user.nombre },
      contexto: {
        alumnoId:        entrega.alumno_id,
        entregaId,
        actividadId:     actividad.id,
        actividadTitulo: actividad.titulo,
      },
      idempotencyExtra: String(Date.now()),
    });

    return entregaCalificada;
  },

  /** URL firmada del archivo adjunto de la actividad (docente). */
  async getAdjuntoUrl(id: string, user: JwtClaims): Promise<{ url: string; es_firmada: boolean }> {
    const actividad = await this.get(id, user);
    if (!actividad.url_adjunto) {
      throw new NotFoundError('Adjunto de actividad');
    }
    if (!StorageService.isConfigured()) {
      return { url: actividad.url_adjunto, es_firmada: false };
    }
    const signedUrl = await StorageService.getSignedUrl(BUCKETS.ACTIVIDADES_ADJUNTOS, actividad.url_adjunto);
    return { url: signedUrl, es_firmada: true };
  },

  /** URL firmada del archivo de entrega de un alumno. */
  async getEntregaArchivoUrl(entregaId: string, user: JwtClaims): Promise<{ url: string; es_firmada: boolean }> {
    const entrega = await ActividadesRepository.findEntregaById(entregaId);
    if (!entrega) throw new NotFoundError('Entrega');

    if (user.rol === 'Alumno' && entrega.alumno_id !== user.entidadId) {
      throw new ForbiddenError('ACCESS_DENIED', 'No tienes acceso a esta entrega.');
    }

    if (!entrega.url_archivo) throw new NotFoundError('Archivo de entrega');

    if (!StorageService.isConfigured()) {
      return { url: entrega.url_archivo, es_firmada: false };
    }
    const signedUrl = await StorageService.getSignedUrl(BUCKETS.ENTREGAS_ALUMNOS, entrega.url_archivo);
    return { url: signedUrl, es_firmada: true };
  },
};
