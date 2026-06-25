// ============================================================
//  modules/simulacros/simulacro.repository.ts
//  Acceso a datos del módulo Simulacro de Admisión.
// ============================================================
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const SimulacroRepo = {
  list(periodoId: string) {
    return prisma.simulacro.findMany({
      where: { periodo_id: periodoId },
      orderBy: { numero: 'asc' },
      include: {
        bimestre: { select: { id: true, numero: true, nombre: true } },
        _count: { select: { preguntas: true, examenes: true } },
      },
    });
  },

  findById(id: string) {
    return prisma.simulacro.findUnique({ where: { id } });
  },

  /** Simulacro activo del período (solo puede haber uno). */
  findActivo(periodoId: string) {
    return prisma.simulacro.findFirst({
      where: { periodo_id: periodoId, estado: 'Activo' },
      include: {
        bimestre: { select: { id: true, numero: true, nombre: true } },
      },
    });
  },

  countByPeriodo(periodoId: string) {
    return prisma.simulacro.count({ where: { periodo_id: periodoId } });
  },

  create(data: Prisma.SimulacroUncheckedCreateInput) {
    return prisma.simulacro.create({ data });
  },

  updateEstado(id: string, estado: 'Borrador' | 'Activo' | 'Concluido') {
    return prisma.simulacro.update({ where: { id }, data: { estado } });
  },
};

export const PreguntaRepo = {
  /** Banco completo del simulacro con filtros (curaduría Admin). */
  listCuraduria(simulacroId: string, filters: { gradoId?: string; seccionId?: string; cursoId?: string; nivelId?: string }) {
    return prisma.simulacroPregunta.findMany({
      where: {
        simulacro_id: simulacroId,
        ...(filters.gradoId ? { grado_id: filters.gradoId } : {}),
        ...(filters.seccionId ? { seccion_id: filters.seccionId } : {}),
        ...(filters.cursoId ? { curso_id: filters.cursoId } : {}),
        ...(filters.nivelId ? { grado: { nivel_id: filters.nivelId } } : {}),
      },
      orderBy: [{ grado_id: 'asc' }, { curso_id: 'asc' }, { docente_id: 'asc' }, { orden: 'asc' }],
      include: {
        curso:   { select: { id: true, nombre: true } },
        grado:   { select: { id: true, nombre: true, nivel: { select: { id: true, nombre: true } } } },
        seccion: { select: { id: true, nombre: true } },
        docente: { select: { id: true, nombres: true, apellido_paterno: true } },
      },
    });
  },

  /** Preguntas ya guardadas por un docente para un curso/grado (para editar). */
  listByDocente(simulacroId: string, docenteId: string, filters: { cursoId?: string; gradoId?: string; seccionId?: string }) {
    return prisma.simulacroPregunta.findMany({
      where: {
        simulacro_id: simulacroId,
        docente_id: docenteId,
        ...(filters.cursoId ? { curso_id: filters.cursoId } : {}),
        ...(filters.gradoId ? { grado_id: filters.gradoId } : {}),
        ...(filters.seccionId ? { seccion_id: filters.seccionId } : {}),
      },
      orderBy: { orden: 'asc' },
    });
  },

  /**
   * Reemplaza atómicamente el bloque de 5 preguntas del docente para un
   * curso+grado del simulacro (idempotente: borra las previas e inserta 5).
   */
  replaceBlock(input: {
    simulacroId: string;
    docenteId: string;
    cursoId: string;
    gradoId: string;
    seccionId: string | null;
    preguntas: Array<{
      enunciado: string; imagen_url: string | null;
      alt_a: string; alt_b: string; alt_c: string; alt_d: string; alt_e: string;
      respuesta_correcta: string;
    }>;
  }) {
    return prisma.$transaction(async (tx) => {
      await tx.simulacroPregunta.deleteMany({
        where: {
          simulacro_id: input.simulacroId,
          docente_id: input.docenteId,
          curso_id: input.cursoId,
          grado_id: input.gradoId,
        },
      });
      await tx.simulacroPregunta.createMany({
        data: input.preguntas.map((p, i) => ({
          simulacro_id: input.simulacroId,
          docente_id: input.docenteId,
          curso_id: input.cursoId,
          grado_id: input.gradoId,
          seccion_id: input.seccionId,
          enunciado: p.enunciado,
          imagen_url: p.imagen_url,
          alt_a: p.alt_a, alt_b: p.alt_b, alt_c: p.alt_c, alt_d: p.alt_d, alt_e: p.alt_e,
          respuesta_correcta: p.respuesta_correcta,
          orden: i + 1,
        })),
      });
      return tx.simulacroPregunta.findMany({
        where: {
          simulacro_id: input.simulacroId, docente_id: input.docenteId,
          curso_id: input.cursoId, grado_id: input.gradoId,
        },
        orderBy: { orden: 'asc' },
      });
    });
  },
};

export const ExamenRepo = {
  /** Examen armado de un grado: cursos (con orden) y sus 5 preguntas. */
  getByGrado(simulacroId: string, gradoId: string) {
    return prisma.simulacroExamen.findMany({
      where: { simulacro_id: simulacroId, grado_id: gradoId },
      orderBy: { orden: 'asc' },
      include: {
        curso: { select: { id: true, nombre: true } },
        preguntas: {
          orderBy: { orden: 'asc' },
          include: {
            pregunta: {
              select: {
                id: true, enunciado: true, imagen_url: true,
                alt_a: true, alt_b: true, alt_c: true, alt_d: true, alt_e: true,
                respuesta_correcta: true,
              },
            },
          },
        },
      },
    });
  },

  /** Preguntas válidas del banco para (simulacro, grado, curso). */
  preguntasValidas(simulacroId: string, gradoId: string, cursoId: string, ids: string[]) {
    return prisma.simulacroPregunta.findMany({
      where: { id: { in: ids }, simulacro_id: simulacroId, grado_id: gradoId, curso_id: cursoId },
      select: { id: true },
    });
  },

  /** Reemplaza atómicamente el examen del grado (todos sus cursos). */
  replaceExamenGrado(
    simulacroId: string,
    gradoId: string,
    cursos: Array<{ curso_id: string; orden: number; pregunta_ids: string[] }>,
  ) {
    return prisma.$transaction(async (tx) => {
      // Borra exámenes previos del grado (cascada elimina sus preguntas).
      await tx.simulacroExamen.deleteMany({ where: { simulacro_id: simulacroId, grado_id: gradoId } });
      for (const c of cursos) {
        const examen = await tx.simulacroExamen.create({
          data: { simulacro_id: simulacroId, grado_id: gradoId, curso_id: c.curso_id, orden: c.orden },
        });
        await tx.simulacroExamenPregunta.createMany({
          data: c.pregunta_ids.map((pid, i) => ({ examen_id: examen.id, pregunta_id: pid, orden: i + 1 })),
        });
      }
      return tx.simulacroExamen.count({ where: { simulacro_id: simulacroId, grado_id: gradoId } });
    });
  },
};

export const CargaRepo = {
  /** Asignaciones del docente en el período → base de la cascada Nivel▸Grado▸Sección▸Curso. */
  listAsignaciones(docenteId: string, periodoId: string) {
    return prisma.asignacionDocente.findMany({
      where: { docente_id: docenteId, periodo_id: periodoId, activo: true },
      include: {
        curso:   { select: { id: true, nombre: true, nivel_id: true } },
        seccion: {
          select: {
            id: true, nombre: true,
            grado: { select: { id: true, nombre: true, orden: true, nivel: { select: { id: true, nombre: true } } } },
          },
        },
      },
    });
  },
};
