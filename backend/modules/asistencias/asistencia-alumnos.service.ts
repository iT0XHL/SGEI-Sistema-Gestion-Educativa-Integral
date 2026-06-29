// ============================================================
//  modules/asistencias/asistencia-alumnos.service.ts
//  RBAC:
//    Docente → solo sus secciones asignadas
//    Admin   → cualquier sección
//    Alumno  → solo lectura de su propia asistencia
// ============================================================
import { ForbiddenError, NotFoundError, BusinessRuleError } from '@/errors/http-errors';
import { AuditService } from '@/modules/auditoria/audit.service';
import { AsistenciaAlumnosRepository } from './asistencia-alumnos.repository';
import type { JwtClaims } from '@/lib/jwt';
import type {
  GuardarAsistenciaInput,
  ActualizarAsistenciaInput,
  ListarAsistenciaQuery,
} from './asistencia-alumnos.schema';

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/**
 * Calcula el día de la semana de una fecha 'YYYY-MM-DD' en UTC para
 * evitar desfases por zona horaria. Retorna 0=Dom … 6=Sáb (coincide
 * con horario.dia_semana donde 1=Lun … 5=Vie).
 */
function diaSemanaDe(fecha: string): number {
  return new Date(`${fecha}T00:00:00Z`).getUTCDay();
}

/** La asistencia solo existe en días lectivos: lunes (1) a viernes (5). */
function assertDiaLectivo(fecha: string): number {
  const dow = diaSemanaDe(fecha);
  if (dow === 0 || dow === 6) {
    throw new BusinessRuleError(
      'DIA_NO_LECTIVO',
      `No se puede registrar asistencia en ${DIAS_SEMANA[dow]}; solo días lectivos (lunes a viernes).`,
    );
  }
  return dow;
}

/** No se permite registrar asistencia de una fecha futura. */
function assertFechaNoFutura(fecha: string): void {
  const hoy = new Date().toISOString().slice(0, 10);
  if (fecha > hoy) {
    throw new BusinessRuleError(
      'FECHA_FUTURA',
      'No se puede registrar asistencia de una fecha futura.',
    );
  }
}

export const AsistenciaAlumnosService = {
  async list(filters: ListarAsistenciaQuery, user: JwtClaims) {
    // Alumno solo ve su propia asistencia.
    if (user.rol === 'Alumno') {
      return AsistenciaAlumnosRepository.list({
        alumnoId: user.entidadId,
        ...(filters.estado ? { estado: filters.estado } : {}),
        ...(filters.fechaDesde ? { fechaDesde: new Date(filters.fechaDesde) } : {}),
        ...(filters.fechaHasta ? { fechaHasta: new Date(filters.fechaHasta) } : {}),
        ...(filters.fecha ? { fecha: new Date(filters.fecha) } : {}),
        limit: filters.limit,
        offset: filters.offset,
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
      ...(filters.estado ? { estado: filters.estado } : {}),
      ...(filters.fecha ? { fecha: new Date(filters.fecha) } : {}),
      ...(filters.fechaDesde ? { fechaDesde: new Date(filters.fechaDesde) } : {}),
      ...(filters.fechaHasta ? { fechaHasta: new Date(filters.fechaHasta) } : {}),
      limit: filters.limit,
      offset: filters.offset,
    });
  },

  async guardar(input: GuardarAsistenciaInput, user: JwtClaims) {
    // Solo Docente y Admin pueden registrar.
    if (user.rol !== 'Docente' && user.rol !== 'Admin') {
      throw new ForbiddenError('INSUFFICIENT_ROLE', 'Solo docentes y Admin pueden registrar asistencia.');
    }

    // ── Validaciones de consistencia institucional ──────────────
    // 1) La clase solo existe en días lectivos (lunes a viernes).
    const diaSemana = assertDiaLectivo(input.fecha);
    // 2) No se registra asistencia de fechas futuras.
    assertFechaNoFutura(input.fecha);

    // 3) El docente solo gestiona secciones donde tiene asignación
    //    activa y, además, clase programada ese día en el horario.
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

      const tieneClase = await AsistenciaAlumnosRepository.docenteTieneClaseEnDia(
        user.entidadId,
        input.seccion_id,
        diaSemana,
      );
      if (!tieneClase) {
        throw new BusinessRuleError(
          'SIN_CLASE_PROGRAMADA',
          `No tienes clases programadas en esta sección el ${DIAS_SEMANA[diaSemana]}; no puedes registrar asistencia fuera de tu horario.`,
        );
      }
    }

    // 4) Todos los alumnos deben pertenecer (estar matriculados y
    //    activos) en la sección indicada.
    const alumnosSeccion = await AsistenciaAlumnosRepository.alumnosDeSeccion(input.seccion_id);
    if (alumnosSeccion.size === 0) {
      throw new BusinessRuleError(
        'SECCION_SIN_ALUMNOS',
        'La sección no tiene alumnos activos matriculados.',
      );
    }
    const ajenos = input.registros.filter((r) => !alumnosSeccion.has(r.alumno_id));
    if (ajenos.length > 0) {
      throw new BusinessRuleError(
        'ALUMNO_NO_PERTENECE',
        `${ajenos.length} alumno(s) no pertenecen a esta sección y no pueden registrarse.`,
      );
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
