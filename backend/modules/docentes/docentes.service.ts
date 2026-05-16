// ============================================================
//  modules/docentes/docentes.service.ts
// ============================================================
import { hashPassword } from '@/lib/password';
import { paginate } from '@/lib/response';
import { withAuditContext } from '@/lib/audit-context';
import { NotFoundError, ConflictError } from '@/errors/http-errors';
import { AuditService } from '@/modules/auditoria/audit.service';
import { AsignacionRepo, HorarioRepo } from '@/modules/academic/academic.repository';
import { DocentesRepository } from './docentes.repository';
import type { CreateDocenteInput, UpdateDocenteInput } from '@/schemas/personas.schema';

export const DocentesService = {
  async list(filters: { q?: string; activo?: boolean; page: number; limit: number }) {
    const [rows, total] = await DocentesRepository.list(filters);
    return paginate(rows, filters.page, filters.limit, total);
  },

  async get(id: string) {
    const docente = await DocentesRepository.findById(id);
    if (!docente) throw new NotFoundError('Docente');
    return docente;
  },

  async create(input: CreateDocenteInput, adminPerfilId: string) {
    const dniExistente = await DocentesRepository.findByDni(input.dni);
    if (dniExistente) {
      throw new ConflictError(`Ya existe un docente con DNI ${input.dni}.`);
    }
    const passwordHash = await hashPassword(input.password);
    const docente = await DocentesRepository.createWithAccount({
      usuarioLogin: input.usuario_login,
      passwordHash,
      docente: {
        dni: input.dni,
        nombres: input.nombres,
        apellido_paterno: input.apellido_paterno,
        apellido_materno: input.apellido_materno,
        especialidad: input.especialidad,
        telefono: input.telefono,
        email_institucional: input.email_institucional ?? null,
        fecha_nacimiento: input.fecha_nacimiento ?? null,
        sexo: input.sexo ?? null,
        titulo_profesional: input.titulo_profesional ?? null,
        fecha_ingreso: input.fecha_ingreso ?? null,
      },
    });
    await AuditService.log({
      usuarioId: adminPerfilId,
      tipo: 'CREATE',
      modulo: 'docentes',
      entidadAfectada: 'docente',
      entidadId: docente.id,
      newValue: { dni: docente.dni, nombres: docente.nombres },
    });
    return docente;
  },

  async update(id: string, input: UpdateDocenteInput) {
    await this.get(id);
    return DocentesRepository.update(id, input);
  },

  /** Desactiva el docente y bloquea su acceso (credencial). */
  async deactivate(id: string, adminPerfilId: string) {
    const docente = await this.get(id);
    const credencialId = await DocentesRepository.getCredencialId(id);
    if (!credencialId) throw new NotFoundError('Credencial del docente');

    await withAuditContext(adminPerfilId, (tx) =>
      DocentesRepository.deactivate(tx, id, credencialId),
    );
    await AuditService.log({
      usuarioId: adminPerfilId,
      tipo: 'UPDATE',
      modulo: 'docentes',
      entidadAfectada: 'docente',
      entidadId: id,
      oldValue: { activo: docente.activo },
      newValue: { activo: false },
    });
    return { id, activo: false };
  },

  async asignaciones(id: string) {
    await this.get(id);
    return AsignacionRepo.list({ docenteId: id });
  },

  async horario(id: string) {
    await this.get(id);
    return HorarioRepo.list({ docenteId: id });
  },
};
