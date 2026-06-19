// ============================================================
//  modules/materiales/materiales.service.ts
//  RBAC:
//    Docente  → CRUD en sus propios materiales (secciones asignadas)
//    Alumno   → lectura de materiales visibles de su sección
//    Admin    → lectura global, puede editar/eliminar cualquiera
//    Secretaria → sin acceso
// ============================================================
import { ForbiddenError, NotFoundError } from '@/errors/http-errors';
import { AuditService } from '@/modules/auditoria/audit.service';
import { NotificacionService } from '@/modules/notificaciones/notificacion.service';
import { NotificationEvents } from '@/modules/notificaciones/notificacion.events';
import { StorageService } from '@/services/storage.service';
import { BUCKETS } from '@/storage/buckets';
import { AsistenciaAlumnosRepository } from '@/modules/asistencias/asistencia-alumnos.repository';
import { prisma } from '@/lib/prisma';
import { MaterialesRepository } from './materiales.repository';
import { TIPOS_CON_ARCHIVO } from './materiales.types';
import type { JwtClaims } from '@/lib/jwt';
import type { CreateMaterialInput, UpdateMaterialInput, ListMaterialesQuery } from './materiales.schema';

async function assertDocenteEnSeccion(docenteId: string, seccionId: string) {
  const tieneAcceso = await AsistenciaAlumnosRepository.docenteTieneAsignacion(docenteId, seccionId);
  if (!tieneAcceso) {
    throw new ForbiddenError('SECCION_NO_ASIGNADA', 'No tienes una asignación activa en esta sección.');
  }
}

async function getAlumnoSeccionId(alumnoEntidadId: string): Promise<string> {
  const alumno = await prisma.alumno.findUnique({
    where: { id: alumnoEntidadId },
    select: { seccion_id: true },
  });
  if (!alumno) throw new NotFoundError('Alumno');
  return alumno.seccion_id;
}

/**
 * Notifica MATERIAL_PUBLICADO a los alumnos de la sección (§6).
 * Solo se notifica si el material es visible (no borradores, §26.1).
 */
async function notificarMaterialPublicado(
  material: { id: string; seccion_id: string; titulo: string; visible: boolean },
  user: JwtClaims,
): Promise<void> {
  if (!material.visible) return;
  await NotificacionService.notificarEvento({
    evento: NotificationEvents.MATERIAL_PUBLICADO,
    actor:  { perfilId: user.perfilId, rol: user.rol, nombre: user.nombre },
    contexto: {
      seccionId:      material.seccion_id,
      materialId:     material.id,
      materialTitulo: material.titulo,
    },
  });
}

export const MaterialesService = {
  async list(filters: ListMaterialesQuery, user: JwtClaims) {
    if (user.rol === 'Secretaria') {
      throw new ForbiddenError('INSUFFICIENT_ROLE', 'Secretaría no tiene acceso a materiales.');
    }

    if (user.rol === 'Alumno') {
      const seccionId = await getAlumnoSeccionId(user.entidadId);
      return MaterialesRepository.list({ seccionId, visible: true, cursoId: filters.cursoId });
    }

    if (user.rol === 'Docente') {
      return MaterialesRepository.list({
        docenteId: user.entidadId,
        seccionId: filters.seccionId,
        cursoId: filters.cursoId,
        visible: filters.visible,
      });
    }

    // Admin: lista global con todos los filtros.
    return MaterialesRepository.list(filters);
  },

  async get(id: string, user: JwtClaims) {
    if (user.rol === 'Secretaria') {
      throw new ForbiddenError('INSUFFICIENT_ROLE', 'Secretaría no tiene acceso a materiales.');
    }
    const material = await MaterialesRepository.findById(id);
    if (!material) throw new NotFoundError('Material');

    if (user.rol === 'Alumno') {
      const seccionId = await getAlumnoSeccionId(user.entidadId);
      if (material.seccion_id !== seccionId || !material.visible) {
        throw new ForbiddenError('ACCESS_DENIED', 'No tienes acceso a este material.');
      }
    }

    if (user.rol === 'Docente' && material.docente_id !== user.entidadId) {
      throw new ForbiddenError('ACCESS_DENIED', 'No eres el autor de este material.');
    }

    return material;
  },

  /** Crea material cuya URL es una dirección externa (enlace/video). */
  async createFromUrl(input: CreateMaterialInput, user: JwtClaims) {
    if (user.rol !== 'Docente' && user.rol !== 'Admin') {
      throw new ForbiddenError('INSUFFICIENT_ROLE', 'Solo Docente y Admin pueden crear materiales.');
    }
    const docenteId = user.rol === 'Docente' ? user.entidadId : (input.docente_id ?? user.entidadId);
    if (user.rol === 'Docente') {
      await assertDocenteEnSeccion(docenteId, input.seccion_id);
    }

    const material = await MaterialesRepository.create({
      docente_id: docenteId,
      curso_id: input.curso_id,
      seccion_id: input.seccion_id,
      titulo: input.titulo,
      descripcion: input.descripcion ?? null,
      tipo: input.tipo,
      url: input.url,
      visible: input.visible,
    });

    await AuditService.log({
      usuarioId: user.perfilId,
      tipo: 'CREATE',
      modulo: 'materiales',
      entidadAfectada: 'material',
      entidadId: material.id,
      newValue: { titulo: material.titulo, tipo: material.tipo },
    });

    await notificarMaterialPublicado(material, user);
    return material;
  },

  /** Crea material subiendo un archivo a Supabase Storage. */
  async createFromFile(
    data: { curso_id: string; seccion_id: string; titulo: string; descripcion?: string | null; tipo: 'PDF' | 'imagen' | 'otro'; visible: boolean },
    file: File,
    user: JwtClaims,
  ) {
    if (user.rol !== 'Docente' && user.rol !== 'Admin') {
      throw new ForbiddenError('INSUFFICIENT_ROLE', 'Solo Docente y Admin pueden subir materiales.');
    }
    const docenteId = user.entidadId;
    if (user.rol === 'Docente') {
      await assertDocenteEnSeccion(docenteId, data.seccion_id);
    }

    const objectPath = await StorageService.upload(
      BUCKETS.MATERIALES,
      docenteId,
      file,
    );

    const material = await MaterialesRepository.create({
      docente_id: docenteId,
      curso_id: data.curso_id,
      seccion_id: data.seccion_id,
      titulo: data.titulo,
      descripcion: data.descripcion ?? null,
      tipo: data.tipo,
      url: objectPath,
      visible: data.visible,
    });

    await AuditService.log({
      usuarioId: user.perfilId,
      tipo: 'CREATE',
      modulo: 'materiales',
      entidadAfectada: 'material',
      entidadId: material.id,
      newValue: { titulo: material.titulo, tipo: material.tipo },
    });

    await notificarMaterialPublicado(material, user);
    return material;
  },

  async update(id: string, input: UpdateMaterialInput, user: JwtClaims) {
    const material = await MaterialesRepository.findById(id);
    if (!material) throw new NotFoundError('Material');

    if (user.rol === 'Docente' && material.docente_id !== user.entidadId) {
      throw new ForbiddenError('ACCESS_DENIED', 'No eres el autor de este material.');
    }
    if (user.rol !== 'Docente' && user.rol !== 'Admin') {
      throw new ForbiddenError('INSUFFICIENT_ROLE', 'Sin permisos para editar materiales.');
    }

    return MaterialesRepository.update(id, {
      ...(input.titulo !== undefined ? { titulo: input.titulo } : {}),
      ...(input.descripcion !== undefined ? { descripcion: input.descripcion } : {}),
      ...(input.tipo !== undefined ? { tipo: input.tipo } : {}),
      ...(input.url !== undefined ? { url: input.url } : {}),
      ...(input.visible !== undefined ? { visible: input.visible } : {}),
    });
  },

  async delete(id: string, user: JwtClaims) {
    const material = await MaterialesRepository.findById(id);
    if (!material) throw new NotFoundError('Material');

    if (user.rol === 'Docente' && material.docente_id !== user.entidadId) {
      throw new ForbiddenError('ACCESS_DENIED', 'No eres el autor de este material.');
    }
    if (user.rol !== 'Docente' && user.rol !== 'Admin') {
      throw new ForbiddenError('INSUFFICIENT_ROLE', 'Sin permisos para eliminar materiales.');
    }

    // Si es un archivo en Storage, eliminarlo también.
    if (TIPOS_CON_ARCHIVO.includes(material.tipo) && StorageService.isConfigured()) {
      await StorageService.delete(BUCKETS.MATERIALES, material.url);
    }

    await MaterialesRepository.delete(id);

    await AuditService.log({
      usuarioId: user.perfilId,
      tipo: 'DELETE',
      modulo: 'materiales',
      entidadAfectada: 'material',
      entidadId: id,
      oldValue: { titulo: material.titulo },
    });

    return { id };
  },

  /**
   * Genera URL firmada temporal (300 s) para materiales almacenados en Storage.
   * Para materiales con URL externa (enlace/video), retorna la URL directamente.
   */
  async getArchivoUrl(id: string, user: JwtClaims): Promise<{ url: string; tipo: string; es_firmada: boolean }> {
    const material = await this.get(id, user);

    if (!TIPOS_CON_ARCHIVO.includes(material.tipo)) {
      return { url: material.url, tipo: material.tipo, es_firmada: false };
    }

    const signedUrl = await StorageService.getSignedUrl(BUCKETS.MATERIALES, material.url);
    return { url: signedUrl, tipo: material.tipo, es_firmada: true };
  },
};
