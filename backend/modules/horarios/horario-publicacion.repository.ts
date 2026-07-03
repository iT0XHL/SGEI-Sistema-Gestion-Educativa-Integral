// ============================================================
//  modules/horarios/horario-publicacion.repository.ts
//  Acceso a datos del snapshot de publicación de horarios.
//  Reutiliza HorarioRepo.list() (academic.repository.ts) como
//  única fuente de los bloques "borrador" en vez de duplicar el
//  JOIN crudo. Las columnas TIME del snapshot también se leen/
//  escriben con SQL crudo, igual que en HorarioRepo, porque Prisma
//  maneja mal el tipo TIME (ver comentario en academic.repository.ts).
// ============================================================
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { HorarioRepo } from '@/modules/academic/academic.repository';

export interface ListarConEstadoFilters {
  periodoId: string;
  page: number;
  limit: number;
}

interface PublicacionBloqueRow {
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  aula: string | null;
  curso: string;
  docente: string;
  seccion: string;
  grado: string;
  nivel: string;
}

export const HorarioPublicacionRepository = {
  async listarDocentes(filters: ListarConEstadoFilters) {
    const where: Prisma.DocenteWhereInput = {
      asignaciones: { some: { periodo_id: filters.periodoId, activo: true } },
    };
    const [rows, total] = await Promise.all([
      prisma.docente.findMany({
        where,
        select: { id: true, nombres: true, apellido_paterno: true, apellido_materno: true },
        orderBy: { apellido_paterno: 'asc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.docente.count({ where }),
    ]);
    return { rows, total };
  },

  async listarSecciones(filters: ListarConEstadoFilters) {
    const where: Prisma.SeccionWhereInput = { periodo_id: filters.periodoId };
    const [rows, total] = await Promise.all([
      prisma.seccion.findMany({
        where,
        select: {
          id: true,
          nombre: true,
          grado: { select: { nombre: true, nivel: { select: { nombre: true } } } },
        },
        orderBy: [{ grado: { orden: 'asc' } }, { nombre: 'asc' }],
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.seccion.count({ where }),
    ]);
    return { rows, total };
  },

  /** Estado de publicación (fecha o null) para un lote de docentes. */
  async publicacionesDeDocentes(docenteIds: string[], periodoId: string) {
    if (docenteIds.length === 0) return new Map<string, Date>();
    const rows = await prisma.horarioPublicacion.findMany({
      where: { tipo: 'DOCENTE', docente_id: { in: docenteIds }, periodo_id: periodoId },
      select: { docente_id: true, fecha_publicacion: true },
    });
    return new Map(rows.map((r) => [r.docente_id as string, r.fecha_publicacion]));
  },

  /** Estado de publicación (fecha o null) para un lote de secciones. */
  async publicacionesDeSecciones(seccionIds: string[], periodoId: string) {
    if (seccionIds.length === 0) return new Map<string, Date>();
    const rows = await prisma.horarioPublicacion.findMany({
      where: { tipo: 'SECCION', seccion_id: { in: seccionIds }, periodo_id: periodoId },
      select: { seccion_id: true, fecha_publicacion: true },
    });
    return new Map(rows.map((r) => [r.seccion_id as string, r.fecha_publicacion]));
  },

  /** Bloques "borrador" vivos de un docente/sección en el período (delegado). */
  bloquesVivosDeDocente(docenteId: string, periodoId: string) {
    return HorarioRepo.list({ periodoId, docenteId });
  },
  bloquesVivosDeSeccion(seccionId: string, periodoId: string) {
    return HorarioRepo.list({ periodoId, seccionId });
  },

  /**
   * Publica (upsert total) el horario de un docente o sección: sobrescribe
   * la fila de horario_publicacion y reemplaza todos sus bloques por los
   * bloques vivos actuales. Sin versionado histórico (decisión de negocio).
   */
  async publicar(
    tipo: 'DOCENTE' | 'SECCION',
    entidadId: string,
    periodoId: string,
    publicadoPor: string,
    bloques: Awaited<ReturnType<typeof HorarioRepo.list>>,
  ) {
    return prisma.$transaction(async (tx) => {
      const filtroEntidad = tipo === 'DOCENTE' ? { docente_id: entidadId } : { seccion_id: entidadId };
      const existente = await tx.horarioPublicacion.findFirst({
        where: { tipo, periodo_id: periodoId, ...filtroEntidad },
        select: { id: true },
      });

      let publicacionId: string;
      if (existente) {
        publicacionId = existente.id;
        await tx.horarioPublicacion.update({
          where: { id: publicacionId },
          data: { publicado_por: publicadoPor, fecha_publicacion: new Date() },
        });
        await tx.horarioPublicacionBloque.deleteMany({ where: { publicacion_id: publicacionId } });
      } else {
        const creada = await tx.horarioPublicacion.create({
          data: {
            tipo,
            periodo_id: periodoId,
            publicado_por: publicadoPor,
            ...filtroEntidad,
          },
          select: { id: true },
        });
        publicacionId = creada.id;
      }

      for (const b of bloques) {
        await tx.$executeRaw`
          INSERT INTO academic_schema.horario_publicacion_bloque
            (publicacion_id, horario_id_origen, dia_semana, hora_inicio, hora_fin,
             aula_snapshot, curso_nombre_snapshot, docente_nombre_snapshot,
             seccion_nombre_snapshot, grado_nombre_snapshot, nivel_nombre_snapshot)
          VALUES (
            ${publicacionId}::uuid, ${b.id}::uuid, ${b.dia_semana}::smallint,
            ${b.hora_inicio}::time, ${b.hora_fin}::time, ${b.aula},
            ${b.curso}, ${b.docente}, ${b.seccion}, ${b.grado}, ${b.nivel}
          )
        `;
      }

      return { id: publicacionId, fecha_publicacion: new Date(), total_bloques: bloques.length };
    });
  },

  async despublicar(tipo: 'DOCENTE' | 'SECCION', entidadId: string, periodoId: string) {
    const filtroEntidad = tipo === 'DOCENTE' ? { docente_id: entidadId } : { seccion_id: entidadId };
    await prisma.horarioPublicacion.deleteMany({ where: { tipo, periodo_id: periodoId, ...filtroEntidad } });
  },

  async obtenerPublicado(tipo: 'DOCENTE' | 'SECCION', entidadId: string, periodoId: string) {
    const filtroEntidad = tipo === 'DOCENTE' ? { docente_id: entidadId } : { seccion_id: entidadId };
    const publicacion = await prisma.horarioPublicacion.findFirst({
      where: { tipo, periodo_id: periodoId, ...filtroEntidad },
      select: { id: true, fecha_publicacion: true },
    });
    if (!publicacion) return null;

    const bloques = await prisma.$queryRaw<PublicacionBloqueRow[]>`
      SELECT dia_semana,
             to_char(hora_inicio, 'HH24:MI') AS hora_inicio,
             to_char(hora_fin,    'HH24:MI') AS hora_fin,
             aula_snapshot           AS aula,
             curso_nombre_snapshot   AS curso,
             docente_nombre_snapshot AS docente,
             seccion_nombre_snapshot AS seccion,
             grado_nombre_snapshot   AS grado,
             nivel_nombre_snapshot   AS nivel
      FROM   academic_schema.horario_publicacion_bloque
      WHERE  publicacion_id = ${publicacion.id}::uuid
      ORDER  BY dia_semana, hora_inicio
    `;

    return { fecha_publicacion: publicacion.fecha_publicacion, bloques };
  },
};
