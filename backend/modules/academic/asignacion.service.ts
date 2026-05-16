// ============================================================
//  modules/academic/asignacion.service.ts
//  Asignaciones docente–curso–sección y bloques de horario.
//  Los cruces de horario los valida el trigger
//  tg_validar_cruce_horario (RAISE EXCEPTION → SCHEDULE_CONFLICT).
// ============================================================
import { NotFoundError } from '@/errors/http-errors';
import { AsignacionRepo, HorarioRepo } from './academic.repository';
import type {
  CreateAsignacionInput,
  CreateHorarioInput,
} from '@/schemas/academic.schema';

export const AsignacionService = {
  list(filters: { periodoId?: string; seccionId?: string; docenteId?: string }) {
    return AsignacionRepo.list(filters);
  },

  create(input: CreateAsignacionInput) {
    // Las FK del DDL validan que docente/curso/sección/período existan.
    return AsignacionRepo.create({
      docente_id: input.docente_id,
      curso_id: input.curso_id,
      seccion_id: input.seccion_id,
      periodo_id: input.periodo_id,
    });
  },

  async remove(id: string) {
    const asignacion = await AsignacionRepo.findById(id);
    if (!asignacion) throw new NotFoundError('Asignación docente');
    await AsignacionRepo.desactivar(id);
    return { id, desactivada: true };
  },
};

export const HorarioService = {
  list(filters: { periodoId?: string; seccionId?: string; docenteId?: string }) {
    return HorarioRepo.list(filters);
  },

  /** Crea un bloque; si hay cruce, el trigger lanza la excepción. */
  async create(input: CreateHorarioInput) {
    const asignacion = await AsignacionRepo.findById(input.asignacion_id);
    if (!asignacion) throw new NotFoundError('Asignación docente');
    const { id } = await HorarioRepo.create({
      asignacionId: input.asignacion_id,
      diaSemana: input.dia_semana,
      horaInicio: input.hora_inicio,
      horaFin: input.hora_fin,
      aula: input.aula ?? null,
    });
    return {
      id,
      asignacion_id: input.asignacion_id,
      dia_semana: input.dia_semana,
      hora_inicio: input.hora_inicio,
      hora_fin: input.hora_fin,
      aula: input.aula ?? null,
    };
  },

  async remove(id: string) {
    try {
      await HorarioRepo.delete(id);
    } catch {
      throw new NotFoundError('Bloque de horario');
    }
    return { id, eliminado: true };
  },
};
