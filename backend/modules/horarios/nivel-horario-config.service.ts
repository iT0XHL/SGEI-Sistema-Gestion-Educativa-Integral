// ============================================================
//  modules/horarios/nivel-horario-config.service.ts
//  Jornada escolar (hora de inicio + duración de la hora escolar)
//  por Nivel. Lectura abierta a cualquier rol autenticado, solo
//  Admin puede editarla — mismo criterio que HorarioDescansoService.
// ============================================================
import { ForbiddenError } from '@/errors/http-errors';
import { AuditService } from '@/modules/auditoria/audit.service';
import { NivelHorarioConfigRepository, type JornadaConfigRow } from './nivel-horario-config.repository';
import type { JwtClaims } from '@/lib/jwt';

export const NivelHorarioConfigService = {
  obtener(nivelId: string, periodoId: string): Promise<JornadaConfigRow> {
    return NivelHorarioConfigRepository.getOrDefault(nivelId, periodoId);
  },

  listarPorNiveles(nivelIds: string[], periodoId: string): Promise<JornadaConfigRow[]> {
    return NivelHorarioConfigRepository.listarPorNiveles(nivelIds, periodoId);
  },

  async actualizar(
    input: { nivel_id: string; periodo_id: string; hora_inicio_jornada: string; duracion_hora_min: number; total_horas_dia: number },
    user: JwtClaims,
  ): Promise<JornadaConfigRow> {
    if (user.rol !== 'Admin') {
      throw new ForbiddenError('INSUFFICIENT_ROLE', 'Solo Administración configura la jornada escolar.');
    }

    const resultado = await NivelHorarioConfigRepository.upsert({
      nivelId: input.nivel_id,
      periodoId: input.periodo_id,
      horaInicioJornada: input.hora_inicio_jornada,
      duracionHoraMin: input.duracion_hora_min,
      totalHorasDia: input.total_horas_dia,
    });

    await AuditService.log({
      usuarioId: user.perfilId,
      tipo: 'UPDATE',
      modulo: 'horarios',
      entidadAfectada: 'nivel_horario_config',
      entidadId: input.nivel_id,
      newValue: { hora_inicio_jornada: input.hora_inicio_jornada, duracion_hora_min: input.duracion_hora_min, total_horas_dia: input.total_horas_dia },
    });

    return resultado;
  },
};
