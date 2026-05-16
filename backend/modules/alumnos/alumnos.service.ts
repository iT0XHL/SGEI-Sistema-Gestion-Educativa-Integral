// ============================================================
//  modules/alumnos/alumnos.service.ts
//  Regla: el cupo_maximo de la sección no puede superarse.
// ============================================================
import { hashPassword } from '@/lib/password';
import { paginate } from '@/lib/response';
import { withAuditContext } from '@/lib/audit-context';
import { NotFoundError, ConflictError, BusinessRuleError } from '@/errors/http-errors';
import { AuditService } from '@/modules/auditoria/audit.service';
import { SeccionRepo, AsignacionRepo } from '@/modules/academic/academic.repository';
import { AlumnosRepository } from './alumnos.repository';
import type {
  CreateAlumnoInput,
  UpdateAlumnoInput,
  ListAlumnosQuery,
} from '@/schemas/personas.schema';

/** Verifica que la sección tenga cupo disponible. */
async function assertCupoDisponible(seccionId: string): Promise<void> {
  const seccion = await SeccionRepo.findById(seccionId);
  if (!seccion) throw new NotFoundError('Sección');
  const ocupados = await AlumnosRepository.countActivosEnSeccion(seccionId);
  if (ocupados >= seccion.cupo_maximo) {
    throw new BusinessRuleError(
      'CUPO_SECCION_LLENO',
      `La sección alcanzó su cupo máximo (${seccion.cupo_maximo} alumnos).`,
    );
  }
}

export const AlumnosService = {
  async list(filters: ListAlumnosQuery) {
    const [rows, total] = await AlumnosRepository.list(filters);
    return paginate(rows, filters.page, filters.limit, total);
  },

  async get(id: string) {
    const alumno = await AlumnosRepository.findById(id);
    if (!alumno) throw new NotFoundError('Alumno');
    return alumno;
  },

  async create(input: CreateAlumnoInput, actorPerfilId: string) {
    const dniExistente = await AlumnosRepository.findByDni(input.dni);
    if (dniExistente) {
      throw new ConflictError(`Ya existe un alumno con DNI ${input.dni}.`);
    }
    await assertCupoDisponible(input.seccion_id);

    const passwordHash = await hashPassword(input.password);
    const alumno = await AlumnosRepository.createWithAccount({
      usuarioLogin: input.usuario_login,
      passwordHash,
      alumno: {
        seccion_id: input.seccion_id,
        periodo_id: input.periodo_id,
        dni: input.dni,
        codigo_siagie: input.codigo_siagie ?? null,
        nombres: input.nombres,
        apellido_paterno: input.apellido_paterno,
        apellido_materno: input.apellido_materno,
        fecha_nacimiento: input.fecha_nacimiento,
        sexo: input.sexo,
        direccion: input.direccion ?? null,
        distrito: input.distrito ?? null,
        telefono_emergencia: input.telefono_emergencia ?? null,
        grupo_sanguineo: input.grupo_sanguineo ?? null,
        condicion_especial: input.condicion_especial ?? null,
      },
    });
    await AuditService.log({
      usuarioId: actorPerfilId,
      tipo: 'CREATE',
      modulo: 'alumnos',
      entidadAfectada: 'alumno',
      entidadId: alumno.id,
      newValue: { dni: alumno.dni, nombres: alumno.nombres },
    });
    return alumno;
  },

  async update(id: string, input: UpdateAlumnoInput) {
    const actual = await this.get(id);
    // Si cambia de sección, validar cupo de la sección destino.
    if (input.seccion_id && input.seccion_id !== actual.seccion_id) {
      await assertCupoDisponible(input.seccion_id);
    }
    return AlumnosRepository.update(id, input);
  },

  /** Desactiva el alumno y bloquea su acceso. */
  async deactivate(id: string, actorPerfilId: string) {
    const alumno = await this.get(id);
    const credencialId = await AlumnosRepository.getCredencialId(id);
    if (!credencialId) throw new NotFoundError('Credencial del alumno');

    await withAuditContext(actorPerfilId, (tx) =>
      AlumnosRepository.deactivate(tx, id, credencialId),
    );
    await AuditService.log({
      usuarioId: actorPerfilId,
      tipo: 'UPDATE',
      modulo: 'alumnos',
      entidadAfectada: 'alumno',
      entidadId: id,
      oldValue: { activo: alumno.activo },
      newValue: { activo: false },
    });
    return { id, activo: false };
  },

  /** Activa/desactiva el bloqueo manual de la libreta (solo Admin). */
  async setBloqueoManual(id: string, bloqueo: boolean, adminPerfilId: string) {
    const alumno = await this.get(id);
    const actualizado = await AlumnosRepository.setBloqueoManual(id, bloqueo);
    await AuditService.log({
      usuarioId: adminPerfilId,
      tipo: 'UPDATE',
      modulo: 'alumnos',
      entidadAfectada: 'alumno',
      entidadId: id,
      oldValue: { bloqueo_manual: alumno.bloqueo_manual },
      newValue: { bloqueo_manual: bloqueo },
    });
    return actualizado;
  },

  /** Cursos (asignaciones) de la sección del alumno. */
  async cursos(id: string) {
    const alumno = await this.get(id);
    return AsignacionRepo.list({
      seccionId: alumno.seccion_id,
      periodoId: alumno.periodo_id,
    });
  },
};
