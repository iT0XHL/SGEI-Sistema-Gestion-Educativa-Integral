import { prisma } from '@/lib/prisma';
import { withAuditContext } from '@/lib/audit-context';
import type {
  CreateEscalaInput, UpdateEscalaInput,
  CreateInstitucionInput, UpdateInstitucionInput,
  CreateCompetenciaInput, UpdateCompetenciaInput,
} from '@/schemas/config.schema';

export const EscalaRepository = {
  async list(periodoId?: string) {
    return prisma.configEscalaLiteral.findMany({
      where: periodoId ? { periodo_id: periodoId } : undefined,
      include: { periodo: true },
      orderBy: { escala: 'asc' },
    });
  },

  async create(input: CreateEscalaInput, perfilId: string) {
    return withAuditContext(perfilId, async (tx) => {
      return tx.configEscalaLiteral.create({
        data: {
          periodo_id: input.periodo_id,
          escala: input.escala,
          rango_inferior: input.rango_inferior,
          rango_superior: input.rango_superior,
        },
        include: { periodo: true },
      });
    });
  },

  async update(id: string, input: UpdateEscalaInput, perfilId: string) {
    return withAuditContext(perfilId, async (tx) => {
      return tx.configEscalaLiteral.update({
        where: { id },
        data: input,
        include: { periodo: true },
      });
    });
  },

  async delete(id: string, perfilId: string) {
    return withAuditContext(perfilId, async (tx) => {
      return tx.configEscalaLiteral.delete({ where: { id } });
    });
  },
};

export const InstitucionRepository = {
  async get() {
    return prisma.institucionEducativa.findFirst();
  },

  async update(id: string, input: UpdateInstitucionInput, perfilId: string) {
    return withAuditContext(perfilId, async (tx) => {
      return tx.institucionEducativa.update({
        where: { id },
        data: input,
      });
    });
  },
};

export const CompetenciaRepository = {
  async list(cursoId?: string) {
    return prisma.competencia.findMany({
      where: cursoId ? { curso_id: cursoId } : undefined,
      include: { curso: true },
      orderBy: { orden: 'asc' },
    });
  },

  async findById(id: string) {
    return prisma.competencia.findUnique({
      where: { id },
      include: { curso: true },
    });
  },

  async create(input: CreateCompetenciaInput, perfilId: string) {
    return withAuditContext(perfilId, async (tx) => {
      return tx.competencia.create({
        data: {
          curso_id: input.curso_id,
          nombre: input.nombre,
          descripcion: input.descripcion || null,
          tipo: input.tipo,
          orden: input.orden,
        },
        include: { curso: true },
      });
    });
  },

  async update(id: string, input: UpdateCompetenciaInput, perfilId: string) {
    return withAuditContext(perfilId, async (tx) => {
      return tx.competencia.update({
        where: { id },
        data: input,
        include: { curso: true },
      });
    });
  },

  async delete(id: string, perfilId: string) {
    return withAuditContext(perfilId, async (tx) => {
      return tx.competencia.delete({ where: { id } });
    });
  },
};
