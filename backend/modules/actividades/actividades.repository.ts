// ============================================================
//  modules/actividades/actividades.repository.ts
// ============================================================
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

const actividadInclude = {
  docente: { select: { id: true, nombres: true, apellido_paterno: true } },
  curso: { select: { id: true, nombre: true } },
  seccion: {
    select: {
      id: true,
      nombre: true,
      grado: { select: { id: true, nombre: true } },
    },
  },
} satisfies Prisma.ActividadInclude;

const entregaInclude = {
  alumno: {
    select: {
      id: true,
      nombres: true,
      apellido_paterno: true,
      apellido_materno: true,
      dni: true,
    },
  },
  actividad: { select: { id: true, titulo: true, puntaje_maximo: true } },
} satisfies Prisma.EntregaActividadInclude;

export const ActividadesRepository = {
  list(filters: { seccionId?: string; cursoId?: string; docenteId?: string; tipo?: Prisma.ActividadWhereInput['tipo'] }) {
    const where: Prisma.ActividadWhereInput = {};
    if (filters.seccionId) where.seccion_id = filters.seccionId;
    if (filters.cursoId) where.curso_id = filters.cursoId;
    if (filters.docenteId) where.docente_id = filters.docenteId;
    if (filters.tipo !== undefined) where.tipo = filters.tipo;

    return prisma.actividad.findMany({
      where,
      include: actividadInclude,
      orderBy: { fecha_limite: 'asc' },
    });
  },

  findById(id: string) {
    return prisma.actividad.findUnique({ where: { id }, include: actividadInclude });
  },

  create(data: Prisma.ActividadUncheckedCreateInput) {
    return prisma.actividad.create({ data, include: actividadInclude });
  },

  update(id: string, data: Prisma.ActividadUncheckedUpdateInput) {
    return prisma.actividad.update({ where: { id }, data, include: actividadInclude });
  },

  delete(id: string) {
    return prisma.actividad.delete({ where: { id } });
  },

  // ── Entregas ─────────────────────────────────────────────────

  listEntregas(actividadId: string) {
    return prisma.entregaActividad.findMany({
      where: { actividad_id: actividadId },
      include: entregaInclude,
      orderBy: { fecha_entrega: 'asc' },
    });
  },

  findEntregaById(id: string) {
    return prisma.entregaActividad.findUnique({ where: { id }, include: entregaInclude });
  },

  findEntregaByAlumnoAndActividad(alumnoId: string, actividadId: string) {
    return prisma.entregaActividad.findUnique({
      where: { actividad_id_alumno_id: { actividad_id: actividadId, alumno_id: alumnoId } },
      include: entregaInclude,
    });
  },

  createEntrega(data: Prisma.EntregaActividadUncheckedCreateInput) {
    return prisma.entregaActividad.create({ data, include: entregaInclude });
  },

  updateEntrega(id: string, data: Prisma.EntregaActividadUncheckedUpdateInput) {
    return prisma.entregaActividad.update({ where: { id }, data, include: entregaInclude });
  },
};
