// ============================================================
//  modules/asistencias/asistencia-alumnos.service.ts
//  RBAC:
//    Docente → solo sus secciones asignadas
//    Admin   → cualquier sección
//    Alumno  → solo lectura de su propia asistencia
// ============================================================
import { ForbiddenError, NotFoundError } from '@/errors/http-errors';
import { AuditService } from '@/modules/auditoria/audit.service';
import { AsistenciaAlumnosRepository } from './asistencia-alumnos.repository';
import type { JwtClaims } from '@/lib/jwt';
import type {
  GuardarAsistenciaInput,
  ActualizarAsistenciaInput,
  ListarAsistenciaQuery,
} from './asistencia-alumnos.schema';

export const AsistenciaAlumnosService = {
  async list(filters: ListarAsistenciaQuery, user: JwtClaims) {
    // Alumno solo ve su propia asistencia.
    if (user.rol === 'Alumno') {
      return AsistenciaAlumnosRepository.list({
        alumnoId: user.entidadId,
        ...(filters.fechaDesde ? { fechaDesde: new Date(filters.fechaDesde) } : {}),
        ...(filters.fechaHasta ? { fechaHasta: new Date(filters.fechaHasta) } : {}),
        ...(filters.fecha ? { fecha: new Date(filters.fecha) } : {}),
      });
    }

    // Docente solo ve secciones donde tiene asignación.
    if (user.rol === 'Docente') {
      if (!filters.seccionId) {
        throw new ForbiddenError(
          'SECCION_REQUERIDA',
          'El docente debe especificar seccionId.',
        );
      }
      const tieneAcceso = await AsistenciaAlumnosRepository.docenteTieneAsignacion(
        user.entidadId,
        filters.seccionId,
      );
      if (!tieneAcceso) {
        throw new ForbiddenError(
          'SECCION_NO_ASIGNADA',
          'No tienes una asignación activa en esta sección.',
        );
      }
    }

    return AsistenciaAlumnosRepository.list({
      seccionId: filters.seccionId,
      alumnoId: filters.alumnoId,
      ...(filters.fecha ? { fecha: new Date(filters.fecha) } : {}),
      ...(filters.fechaDesde ? { fechaDesde: new Date(filters.fechaDesde) } : {}),
      ...(filters.fechaHasta ? { fechaHasta: new Date(filters.fechaHasta) } : {}),
    });
  },

  async guardar(input: GuardarAsistenciaInput, user: JwtClaims) {
    // Solo Docente y Admin pueden registrar.
    if (user.rol !== 'Docente' && user.rol !== 'Admin') {
      throw new ForbiddenError('INSUFFICIENT_ROLE', 'Solo docentes y Admin pueden registrar asistencia.');
    }

    if (user.rol === 'Docente') {
      const tieneAcceso = await AsistenciaAlumnosRepository.docenteTieneAsignacion(
        user.entidadId,
        input.seccion_id,
      );
      if (!tieneAcceso) {
        throw new ForbiddenError(
          'SECCION_NO_ASIGNADA',
          'No tienes una asignación activa en esta sección.',
        );
      }
    }

    // Para Admin, registrado_por debe ser un docente_id válido.
    // Usamos entidadId del usuario; si es Admin, se espera que sea un
    // docente_id enviado en el body (o se omite el registrado_por y
    // se delega al docente encargado). Por ahora usamos el entidadId.
    const docenteId = user.entidadId;

    const affected = await AsistenciaAlumnosRepository.upsertBatch(input, docenteId);

    await AuditService.log({
      usuarioId: user.perfilId,
      tipo: 'CREATE',
      modulo: 'asistencias',
      entidadAfectada: 'asistencia',
      entidadId: null,
      newValue: {
        seccion_id: input.seccion_id,
        fecha: input.fecha,
        total_registros: affected,
      },
    });

    return { registros_guardados: affected, fecha: input.fecha, seccion_id: input.seccion_id };
  },

  async actualizar(id: string, input: ActualizarAsistenciaInput, user: JwtClaims) {
    const registro = await AsistenciaAlumnosRepository.findById(id);
    if (!registro) throw new NotFoundError('Registro de asistencia');

    if (user.rol === 'Docente') {
      const tieneAcceso = await AsistenciaAlumnosRepository.docenteTieneAsignacion(
        user.entidadId,
        registro.seccion_id,
      );
      if (!tieneAcceso) {
        throw new ForbiddenError('SECCION_NO_ASIGNADA', 'No tienes acceso a este registro.');
      }
    }

    return AsistenciaAlumnosRepository.update(id, {
      ...(input.estado !== undefined ? { estado: input.estado } : {}),
      ...(input.justificacion !== undefined ? { justificacion: input.justificacion } : {}),
      hora_registro: new Date(),
    });
  },

  async eliminar(id: string, user: JwtClaims) {
    if (user.rol !== 'Admin') {
      throw new ForbiddenError('INSUFFICIENT_ROLE', 'Solo Admin puede eliminar registros de asistencia.');
    }
    const registro = await AsistenciaAlumnosRepository.findById(id);
    if (!registro) throw new NotFoundError('Registro de asistencia');
    await AsistenciaAlumnosRepository.delete(id);
    return { id };
  },

  async resumen(seccionId: string, user: JwtClaims) {
    if (user.rol === 'Alumno') {
      throw new ForbiddenError('INSUFFICIENT_ROLE', 'Los alumnos no pueden ver resúmenes de sección.');
    }
    if (user.rol === 'Docente') {
      const tieneAcceso = await AsistenciaAlumnosRepository.docenteTieneAsignacion(
        user.entidadId,
        seccionId,
      );
      if (!tieneAcceso) {
        throw new ForbiddenError('SECCION_NO_ASIGNADA', 'No tienes acceso a esta sección.');
      }
    }
    const rows = await AsistenciaAlumnosRepository.resumenPorSeccion(seccionId);
    // Convertir BigInt a number para serialización JSON.
    return rows.map((r) => ({
      ...r,
      total_presentes: Number(r.total_presentes),
      total_faltas: Number(r.total_faltas),
      total_tardanzas: Number(r.total_tardanzas),
      total_justificados: Number(r.total_justificados),
      total_dias_registrados: Number(r.total_dias_registrados),
      porcentaje_asistencia: r.porcentaje_asistencia ? parseFloat(String(r.porcentaje_asistencia)) : null,
    }));
  },
};
