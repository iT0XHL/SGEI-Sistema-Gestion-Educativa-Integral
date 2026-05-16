// ============================================================
//  modules/academic/periodo.service.ts
//  Períodos académicos, bimestres y escala literal.
//  Reglas de negocio respaldadas por triggers del DDL:
//   · tg_un_periodo_activo    — un solo período activo.
//   · tg_cerrar_notas_bimestre — al cerrar bimestre, cierra notas.
// ============================================================
import { NotFoundError, ConflictError, BusinessRuleError } from '@/errors/http-errors';
import { AuditService } from '@/modules/auditoria/audit.service';
import { PeriodoRepo, BimestreRepo, EscalaRepo } from './academic.repository';
import type {
  CreatePeriodoInput,
  CreateBimestreInput,
  UpdateBimestreInput,
  UpsertEscalaInput,
} from '@/schemas/academic.schema';

export const PeriodoService = {
  list() {
    return PeriodoRepo.list();
  },

  async get(id: string) {
    const periodo = await PeriodoRepo.findById(id);
    if (!periodo) throw new NotFoundError('Período académico');
    return periodo;
  },

  async create(input: CreatePeriodoInput) {
    const existente = await PeriodoRepo.findByAnio(input.anio);
    if (existente) {
      throw new ConflictError(`Ya existe un período para el año ${input.anio}.`);
    }
    return PeriodoRepo.create({
      anio: input.anio,
      nombre: input.nombre,
      fecha_inicio: input.fecha_inicio,
      fecha_fin: input.fecha_fin,
      activo: input.activo,
    });
  },

  /** Activa un período; el trigger desactiva automáticamente los demás. */
  async activar(id: string, adminPerfilId: string) {
    await this.get(id);
    const periodo = await PeriodoRepo.activar(id);
    await AuditService.log({
      usuarioId: adminPerfilId,
      tipo: 'UPDATE',
      modulo: 'academic.periodo',
      entidadAfectada: 'periodo_academico',
      entidadId: id,
      newValue: { activo: true },
    });
    return periodo;
  },
};

export const BimestreService = {
  list(periodoId?: string) {
    return BimestreRepo.list(periodoId);
  },

  async get(id: string) {
    const bimestre = await BimestreRepo.findById(id);
    if (!bimestre) throw new NotFoundError('Bimestre');
    return bimestre;
  },

  async create(input: CreateBimestreInput) {
    const periodo = await PeriodoRepo.findById(input.periodo_id);
    if (!periodo) throw new NotFoundError('Período académico');
    return BimestreRepo.create({
      periodo_id: input.periodo_id,
      numero: input.numero,
      nombre: input.nombre,
      fecha_inicio: input.fecha_inicio,
      fecha_fin: input.fecha_fin,
    });
  },

  async update(id: string, input: UpdateBimestreInput) {
    const bimestre = await this.get(id);
    if (bimestre.cerrado) {
      throw new BusinessRuleError(
        'BIMESTRE_CERRADO',
        'No se puede editar un bimestre cerrado.',
      );
    }
    const fechaInicio = input.fecha_inicio ?? bimestre.fecha_inicio;
    const fechaFin = input.fecha_fin ?? bimestre.fecha_fin;
    if (fechaFin <= fechaInicio) {
      throw new BusinessRuleError(
        'FECHAS_INVALIDAS',
        'fecha_fin debe ser posterior a fecha_inicio.',
      );
    }
    return BimestreRepo.update(id, {
      ...(input.nombre !== undefined ? { nombre: input.nombre } : {}),
      ...(input.fecha_inicio !== undefined ? { fecha_inicio: input.fecha_inicio } : {}),
      ...(input.fecha_fin !== undefined ? { fecha_fin: input.fecha_fin } : {}),
    });
  },

  /** Cierra el bimestre; el trigger cierra todas sus notas. */
  async cerrar(id: string, adminPerfilId: string) {
    const bimestre = await this.get(id);
    if (bimestre.cerrado) {
      throw new BusinessRuleError('BIMESTRE_CERRADO', 'El bimestre ya está cerrado.');
    }
    const actualizado = await BimestreRepo.cerrar(id);
    await AuditService.log({
      usuarioId: adminPerfilId,
      tipo: 'UPDATE',
      modulo: 'academic.bimestre',
      entidadAfectada: 'bimestre',
      entidadId: id,
      oldValue: { cerrado: false },
      newValue: { cerrado: true },
    });
    return actualizado;
  },
};

export const EscalaService = {
  list(periodoId: string) {
    return EscalaRepo.listByPeriodo(periodoId);
  },

  /** Crea/actualiza las 4 filas de escala (validación 0–20 ya hecha en Zod). */
  async upsert(input: UpsertEscalaInput) {
    const periodo = await PeriodoRepo.findById(input.periodo_id);
    if (!periodo) throw new NotFoundError('Período académico');
    return EscalaRepo.upsertMany(input.periodo_id, input.escalas);
  },

  /** Verifica que la escala cubra exactamente 0–20 sin huecos. */
  async cobertura(periodoId: string) {
    const escalas = await EscalaRepo.listByPeriodo(periodoId);
    if (escalas.length < 4) {
      return {
        completa: false,
        cubre_0_20: false,
        escalas_definidas: escalas.length,
        mensaje: `Faltan escalas: definidas ${escalas.length} de 4 (AD, A, B, C).`,
      };
    }
    let cursor = 0;
    let cubre = true;
    for (const e of escalas) {
      const inf = Number(e.rango_inferior);
      const sup = Number(e.rango_superior);
      if (Math.abs(inf - cursor) > 0.001) cubre = false;
      cursor = sup;
    }
    if (Math.abs(cursor - 20) > 0.001) cubre = false;
    return {
      completa: true,
      cubre_0_20: cubre,
      escalas_definidas: 4,
      mensaje: cubre
        ? 'La escala cubre correctamente el rango 0–20.'
        : 'La escala tiene huecos o superposiciones en el rango 0–20.',
    };
  },
};
