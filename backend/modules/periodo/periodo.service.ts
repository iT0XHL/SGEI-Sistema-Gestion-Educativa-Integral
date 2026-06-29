import { paginate } from '@/lib/response';
import { NotFoundError, ConflictError, BusinessRuleError } from '@/errors/http-errors';
import { AuditService } from '@/modules/auditoria/audit.service';
import { PeriodoRepository, BimestreRepository, type ListFilters, type BimestreFilters } from './periodo.repository';
import type { CreatePeriodoInput, UpdatePeriodoInput, CreateBimestreInput, UpdateBimestreInput } from '@/schemas/periodo.schema';
import { prisma } from '@/lib/prisma';

export interface PeriodoDTO {
  id: string;
  anio: number;
  nombre: string;
  fecha_inicio: Date;
  fecha_fin: Date;
  activo: boolean;
}

export interface BimestreDTO {
  id: string;
  periodo_id: string;
  numero: number;
  nombre: string;
  fecha_inicio: Date;
  fecha_fin: Date;
  cerrado: boolean;
  periodo?: { nombre: string; anio: number };
}

export const PeriodoService = {
  async list(filters: ListFilters) {
    const { rows, total } = await PeriodoRepository.list(filters);
    return paginate(rows, filters.page, filters.limit, total);
  },

  async get(id: string): Promise<PeriodoDTO> {
    const row = await PeriodoRepository.findById(id);
    if (!row) throw new NotFoundError('Período académico');
    return row;
  },

  /**
   * Período + bimestre activos (configuración global).
   * Accesible por CUALQUIER rol autenticado (Admin, Docente, Alumno,
   * Secretaria): el período activo es un ajuste global, no depende de la
   * sesión. Devuelve null si no hay período activo configurado.
   */
  async getActivo(): Promise<{ periodo: PeriodoDTO | null; bimestre: BimestreDTO | null }> {
    const periodo = await prisma.periodoAcademico.findFirst({
      where: { activo: true },
      orderBy: { anio: 'desc' },
    });
    if (!periodo) return { periodo: null, bimestre: null };

    const bimestre = await prisma.bimestre.findFirst({
      where: { periodo_id: periodo.id, cerrado: false },
      orderBy: { numero: 'asc' },
    });

    return {
      periodo: {
        id: periodo.id,
        anio: periodo.anio,
        nombre: periodo.nombre,
        fecha_inicio: periodo.fecha_inicio,
        fecha_fin: periodo.fecha_fin,
        activo: periodo.activo,
      },
      bimestre: bimestre ?? null,
    };
  },

  async create(input: CreatePeriodoInput, perfilId: string): Promise<PeriodoDTO> {
    const existing = await prisma.periodoAcademico.findUnique({
      where: { anio: input.anio },
      select: { id: true },
    });
    if (existing) throw new ConflictError(`Ya existe un período para el año ${input.anio}`);

    const result = await PeriodoRepository.create(input, perfilId);

    await AuditService.log({
      usuarioId: perfilId,
      tipo: 'CREATE',
      modulo: 'periodo',
      entidadAfectada: 'periodo_academico',
      entidadId: result.id,
      newValue: { anio: input.anio, nombre: input.nombre },
    });

    return result;
  },

  async update(id: string, input: UpdatePeriodoInput, perfilId: string): Promise<PeriodoDTO> {
    const current = await PeriodoRepository.findById(id);
    if (!current) throw new NotFoundError('Período académico');

    const result = await PeriodoRepository.update(id, input, perfilId);

    await AuditService.log({
      usuarioId: perfilId,
      tipo: 'UPDATE',
      modulo: 'periodo',
      entidadAfectada: 'periodo_academico',
      entidadId: id,
    });

    return result;
  },

  async setActivo(id: string, activo: boolean, perfilId: string): Promise<PeriodoDTO> {
    const current = await PeriodoRepository.findById(id);
    if (!current) throw new NotFoundError('Período académico');

    // Si se activa, desactivar otros períodos
    if (activo) {
      await prisma.periodoAcademico.updateMany({
        where: { NOT: { id } },
        data: { activo: false },
      });
    }

    const result = await PeriodoRepository.setActivo(id, activo, perfilId);

    await AuditService.log({
      usuarioId: perfilId,
      tipo: 'UPDATE',
      modulo: 'periodo',
      entidadAfectada: 'periodo_academico',
      entidadId: id,
      newValue: { activo },
    });

    return result;
  },

  async delete(id: string, perfilId: string) {
    const current = await PeriodoRepository.findById(id);
    if (!current) throw new NotFoundError('Período académico');

    await PeriodoRepository.delete(id, perfilId);

    await AuditService.log({
      usuarioId: perfilId,
      tipo: 'DELETE',
      modulo: 'periodo',
      entidadAfectada: 'periodo_academico',
      entidadId: id,
    });

    return { id, eliminado: true };
  },
};

export const BimestreService = {
  async list(filters: BimestreFilters) {
    const { rows, total } = await BimestreRepository.list(filters);
    return paginate(rows, filters.page, filters.limit, total);
  },

  async get(id: string): Promise<BimestreDTO> {
    const row = await BimestreRepository.findById(id);
    if (!row) throw new NotFoundError('Bimestre');
    return row;
  },

  async create(input: CreateBimestreInput, perfilId: string): Promise<BimestreDTO> {
    const existing = await prisma.bimestre.findUnique({
      where: { periodo_id_numero: { periodo_id: input.periodo_id, numero: input.numero } },
      select: { id: true },
    });
    if (existing) throw new ConflictError(`Ya existe bimestre ${input.numero} en este período`);

    const result = await BimestreRepository.create(input, perfilId);

    await AuditService.log({
      usuarioId: perfilId,
      tipo: 'CREATE',
      modulo: 'bimestres',
      entidadAfectada: 'bimestre',
      entidadId: result.id,
      newValue: { numero: input.numero, nombre: input.nombre },
    });

    return result;
  },

  async update(id: string, input: UpdateBimestreInput, perfilId: string): Promise<BimestreDTO> {
    const current = await BimestreRepository.findById(id);
    if (!current) throw new NotFoundError('Bimestre');

    const result = await BimestreRepository.update(id, input, perfilId);

    await AuditService.log({
      usuarioId: perfilId,
      tipo: 'UPDATE',
      modulo: 'bimestres',
      entidadAfectada: 'bimestre',
      entidadId: id,
    });

    return result;
  },

  async delete(id: string, perfilId: string) {
    const current = await BimestreRepository.findById(id);
    if (!current) throw new NotFoundError('Bimestre');

    await BimestreRepository.delete(id, perfilId);

    await AuditService.log({
      usuarioId: perfilId,
      tipo: 'DELETE',
      modulo: 'bimestres',
      entidadAfectada: 'bimestre',
      entidadId: id,
    });

    return { id, eliminado: true };
  },

  async cerrar(id: string, adminPerfilId: string) {
    const bimestre = await this.get(id);
    if (bimestre.cerrado) {
      throw new BusinessRuleError('BIMESTRE_CERRADO', 'El bimestre ya está cerrado.');
    }

    await prisma.$executeRaw`SELECT set_config('app.current_user_id', ${adminPerfilId}, true)`;
    const actualizado = await BimestreRepository.cerrar(id, adminPerfilId);

    await AuditService.log({
      usuarioId: adminPerfilId,
      tipo: 'UPDATE',
      modulo: 'bimestres',
      entidadAfectada: 'bimestre',
      entidadId: id,
      oldValue: { cerrado: false },
      newValue: { cerrado: true },
    });

    return actualizado;
  },
};
