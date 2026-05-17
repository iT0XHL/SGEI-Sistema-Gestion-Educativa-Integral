// ============================================================
//  modules/materiales/materiales.repository.ts
// ============================================================
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

const materialInclude = {
  docente: {
    select: {
      id: true,
      nombres: true,
      apellido_paterno: true,
    },
  },
  curso: {
    select: { id: true, nombre: true },
  },
  seccion: {
    select: {
      id: true,
      nombre: true,
      grado: { select: { id: true, nombre: true } },
    },
  },
} satisfies Prisma.MaterialInclude;

export const MaterialesRepository = {
  list(filters: {
    seccionId?: string;
    cursoId?: string;
    docenteId?: string;
    visible?: boolean;
  }) {
    const where: Prisma.MaterialWhereInput = {};
    if (filters.seccionId) where.seccion_id = filters.seccionId;
    if (filters.cursoId) where.curso_id = filters.cursoId;
    if (filters.docenteId) where.docente_id = filters.docenteId;
    if (filters.visible !== undefined) where.visible = filters.visible;

    return prisma.material.findMany({
      where,
      include: materialInclude,
      orderBy: { fecha_publicacion: 'desc' },
    });
  },

  findById(id: string) {
    return prisma.material.findUnique({ where: { id }, include: materialInclude });
  },

  create(data: Prisma.MaterialUncheckedCreateInput) {
    return prisma.material.create({ data, include: materialInclude });
  },

  update(id: string, data: Prisma.MaterialUncheckedUpdateInput) {
    return prisma.material.update({ where: { id }, data, include: materialInclude });
  },

  delete(id: string) {
    return prisma.material.delete({ where: { id } });
  },
};
