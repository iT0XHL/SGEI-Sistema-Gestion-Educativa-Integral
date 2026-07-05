// ============================================================
//  modules/horarios/horario-descanso.service.ts
//  Recreo y Refrigerio/Almuerzo por Nivel. A diferencia del
//  borrador de Horario, no tiene flujo de publicación: se sirve
//  siempre en vivo (lectura abierta a cualquier rol autenticado),
//  solo Admin puede editarlo.
//
//  Recreo/Refrigerio son anclas FIJAS a cualquier hora que el Admin
//  elija — no requieren "calzar" con nada, porque los bloques de
//  clase se calculan alrededor de ellas (ver backend/lib/horario-slots.ts),
//  no al revés.
// ============================================================
import { ForbiddenError } from '@/errors/http-errors';
import { AuditService } from '@/modules/auditoria/audit.service';
import { HorarioDescansoRepository, type DescansoRow } from './horario-descanso.repository';
import type { JwtClaims } from '@/lib/jwt';

export const HorarioDescansoService = {
  listarPorNiveles(nivelIds: string[], periodoId: string): Promise<DescansoRow[]> {
    return HorarioDescansoRepository.listarPorNiveles(nivelIds, periodoId);
  },

  async upsert(
    input: { nivel_id: string; periodo_id: string; tipo: 'RECREO' | 'REFRIGERIO'; hora_inicio: string; hora_fin: string },
    user: JwtClaims,
  ): Promise<DescansoRow> {
    if (user.rol !== 'Admin') {
      throw new ForbiddenError('INSUFFICIENT_ROLE', 'Solo Administración configura el recreo y el refrigerio.');
    }

    const resultado = await HorarioDescansoRepository.upsert({
      nivelId: input.nivel_id,
      periodoId: input.periodo_id,
      tipo: input.tipo,
      horaInicio: input.hora_inicio,
      horaFin: input.hora_fin,
    });

    await AuditService.log({
      usuarioId: user.perfilId,
      tipo: 'UPDATE',
      modulo: 'horarios',
      entidadAfectada: 'horario_descanso',
      entidadId: input.nivel_id,
      newValue: { tipo: input.tipo, hora_inicio: input.hora_inicio, hora_fin: input.hora_fin },
    });

    return resultado;
  },
};
