// ============================================================
//  modules/asistencias/asistencia-docentes.service.ts
//  Solo Admin puede gestionar asistencia de docentes (SQL + RLS).
// ============================================================
import { ForbiddenError, NotFoundError } from '@/errors/http-errors';
import { AuditService } from '@/modules/auditoria/audit.service';
import { AsistenciaDocentesRepository } from './asistencia-docentes.repository';
import type { JwtClaims } from '@/lib/jwt';
import type {
  GuardarAsistenciaDocenteInput,
  ActualizarAsistenciaDocenteInput,
  ListarAsistenciaDocenteQuery,
} from './asistencia-docentes.schema';

function assertAdmin(user: JwtClaims) {
  if (user.rol !== 'Admin') {
    throw new ForbiddenError('INSUFFICIENT_ROLE', 'Solo Admin puede gestionar asistencia de docentes.');
  }
}

export const AsistenciaDocentesService = {
  async list(filters: ListarAsistenciaDocenteQuery, user: JwtClaims) {
    assertAdmin(user);
    return AsistenciaDocentesRepository.list({
      docenteId: filters.docenteId,
      ...(filters.fecha ? { fecha: new Date(filters.fecha) } : {}),
      ...(filters.fechaDesde ? { fechaDesde: new Date(filters.fechaDesde) } : {}),
      ...(filters.fechaHasta ? { fechaHasta: new Date(filters.fechaHasta) } : {}),
    });
  },

  async guardar(input: GuardarAsistenciaDocenteInput, user: JwtClaims) {
    assertAdmin(user);
    const affected = await AsistenciaDocentesRepository.upsertBatch(input, user.perfilId);
    await AuditService.log({
      usuarioId: user.perfilId,
      tipo: 'CREATE',
      modulo: 'asistencias',
      entidadAfectada: 'asistencia_docente',
      entidadId: null,
      newValue: { fecha: input.fecha, total_registros: affected },
    });
    return { registros_guardados: affected, fecha: input.fecha };
  },

  async actualizar(id: string, input: ActualizarAsistenciaDocenteInput, user: JwtClaims) {
    assertAdmin(user);
    const registro = await AsistenciaDocentesRepository.findById(id);
    if (!registro) throw new NotFoundError('Registro de asistencia de docente');
    return AsistenciaDocentesRepository.update(id, {
      ...(input.estado !== undefined ? { estado: input.estado } : {}),
      ...(input.justificacion !== undefined ? { justificacion: input.justificacion } : {}),
      hora_registro: new Date(),
    });
  },

  async eliminar(id: string, user: JwtClaims) {
    assertAdmin(user);
    const registro = await AsistenciaDocentesRepository.findById(id);
    if (!registro) throw new NotFoundError('Registro de asistencia de docente');
    await AsistenciaDocentesRepository.delete(id);
    return { id };
  },
};
