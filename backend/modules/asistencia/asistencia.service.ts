// ============================================================
//  modules/asistencia/asistencia.service.ts — Lógica de negocio
//  para asistencia docente (validaciones, crear, editar, listar).
// ============================================================
import { paginate } from '@/lib/response';
import { NotFoundError, ConflictError } from '@/errors/http-errors';
import { AuditService } from '@/modules/auditoria/audit.service';
import { AsistenciaRepository, type ListFilters } from './asistencia.repository';
import type { CreateAsistenciaInput, UpdateAsistenciaInput } from '@/schemas/asistencia.schema';

export interface AsistenciaDTO {
  id: string;
  docente_id: string;
  docente?: { nombres: string; apellido_paterno: string; apellido_materno: string; dni: string };
  fecha: Date;
  estado: 'P' | 'F' | 'T' | 'J';
  justificacion: string | null;
  hora_registro: Date;
  registrador?: { usuario_login: string };
}

export const AsistenciaService = {
  async list(filters: ListFilters) {
    const { rows, total } = await AsistenciaRepository.list(filters);
    const dtos = rows.map((r) => ({
      id: r.id,
      docente_id: r.docente_id,
      docente: r.docente,
      fecha: r.fecha,
      estado: r.estado,
      justificacion: r.justificacion,
      hora_registro: r.hora_registro,
      registrador: r.registrador ? { usuario_login: r.registrador.credencial.usuario_login } : undefined,
    }));
    return paginate(dtos, filters.page, filters.limit, total);
  },

  async get(asistenciaId: string): Promise<AsistenciaDTO> {
    const row = await AsistenciaRepository.findById(asistenciaId);
    if (!row) throw new NotFoundError('Asistencia');
    return {
      id: row.id,
      docente_id: row.docente_id,
      docente: row.docente,
      fecha: row.fecha,
      estado: row.estado,
      justificacion: row.justificacion,
      hora_registro: row.hora_registro,
      registrador: row.registrador ? { usuario_login: row.registrador.credencial.usuario_login } : undefined,
    };
  },

  async create(input: CreateAsistenciaInput, registradoPorId: string): Promise<AsistenciaDTO> {
    // Validar que no exista asistencia para ese docente y fecha
    const existing = await AsistenciaRepository.findByDocenteAndFecha(input.docente_id, input.fecha);
    if (existing) {
      throw new ConflictError('Ya existe asistencia registrada para este docente en esta fecha');
    }

    const result = await AsistenciaRepository.create(input, registradoPorId);

    await AuditService.log({
      usuarioId: registradoPorId,
      tipo: 'CREATE',
      modulo: 'asistencia',
      entidadAfectada: 'asistencia_docente',
      entidadId: result.id,
      newValue: { estado: input.estado, fecha: input.fecha },
    });

    return {
      id: result.id,
      docente_id: result.docente_id,
      fecha: result.fecha,
      estado: result.estado,
      justificacion: result.justificacion,
      hora_registro: result.hora_registro,
    };
  },

  async update(
    asistenciaId: string,
    input: UpdateAsistenciaInput,
    registradoPorId: string,
  ): Promise<AsistenciaDTO> {
    const current = await AsistenciaRepository.findById(asistenciaId);
    if (!current) throw new NotFoundError('Asistencia');

    await AsistenciaRepository.update(asistenciaId, input, registradoPorId);

    await AuditService.log({
      usuarioId: registradoPorId,
      tipo: 'UPDATE',
      modulo: 'asistencia',
      entidadAfectada: 'asistencia_docente',
      entidadId: asistenciaId,
      oldValue: { estado: current.estado },
      newValue: { estado: input.estado },
    });

    return this.get(asistenciaId);
  },

  async delete(asistenciaId: string, registradoPorId: string): Promise<{ id: string; eliminado: boolean }> {
    const current = await AsistenciaRepository.findById(asistenciaId);
    if (!current) throw new NotFoundError('Asistencia');

    await AuditService.log({
      usuarioId: registradoPorId,
      tipo: 'DELETE',
      modulo: 'asistencia',
      entidadAfectada: 'asistencia_docente',
      entidadId: asistenciaId,
      oldValue: { estado: current.estado, fecha: current.fecha },
    });

    // Lógica de borrado lógico o físico según requerimientos
    // Por ahora: borrado físico
    await (await import('@/lib/prisma')).prisma.asistenciaDocente.delete({
      where: { id: asistenciaId },
    });

    return { id: asistenciaId, eliminado: true };
  },
};
