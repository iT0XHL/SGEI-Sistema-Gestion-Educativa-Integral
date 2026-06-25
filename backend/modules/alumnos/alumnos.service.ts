import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { paginate } from '@/lib/response';
import { NotFoundError, ConflictError } from '@/errors/http-errors';
import { AuditService } from '@/modules/auditoria/audit.service';
import { AlumnosRepository, type ListFilters } from './alumnos.repository';
import type { CreateAlumnoInput, UpdateAlumnoInput } from '@/schemas/personas.schema';
import { randomUUID } from 'crypto';

export interface AlumnoDTO {
  id: string;
  dni: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  fecha_nacimiento: Date;
  sexo: string;
  direccion: string | null;
  distrito: string | null;
  telefono_emergencia: string | null;
  grupo_sanguineo: string | null;
  condicion_especial: string | null;
  codigo_siagie: string | null;
  activo: boolean;
  usuario_login?: string;
  seccion?: { nombre: string; grado: { nombre: string } };
}

export const AlumnosService = {
  async list(filters: ListFilters) {
    const { rows, total } = await AlumnosRepository.list(filters);
    const dtos = rows.map((r) => ({
      id: r.id,
      dni: r.dni,
      nombres: r.nombres,
      apellido_paterno: r.apellido_paterno,
      apellido_materno: r.apellido_materno,
      fecha_nacimiento: r.fecha_nacimiento,
      sexo: r.sexo,
      activo: r.activo,
      bloqueo_manual: r.bloqueo_manual,
      usuario_login: r.perfil?.credencial.usuario_login,
      seccion: r.seccion,
    }));
    return paginate(dtos, filters.page, filters.limit, total);
  },

  async get(alumnoId: string): Promise<AlumnoDTO> {
    const row = await AlumnosRepository.findById(alumnoId);
    if (!row) throw new NotFoundError('Alumno');
    return {
      id: row.id,
      dni: row.dni,
      nombres: row.nombres,
      apellido_paterno: row.apellido_paterno,
      apellido_materno: row.apellido_materno,
      fecha_nacimiento: row.fecha_nacimiento,
      sexo: row.sexo,
      direccion: row.direccion,
      distrito: row.distrito,
      telefono_emergencia: row.telefono_emergencia,
      grupo_sanguineo: row.grupo_sanguineo,
      condicion_especial: row.condicion_especial,
      codigo_siagie: row.codigo_siagie,
      activo: row.activo,
      usuario_login: row.perfil?.credencial.usuario_login,
      seccion: row.seccion,
    };
  },

  async create(input: CreateAlumnoInput, adminPerfilId: string): Promise<AlumnoDTO> {
    const existing = await AlumnosRepository.findByDNI(input.dni, input.periodo_id);
    if (existing) throw new ConflictError('Ya existe un alumno con ese DNI en este período');

    const existingLogin = await prisma.credencial.findUnique({
      where: { usuario_login: input.usuario_login },
      select: { id: true },
    });
    if (existingLogin) throw new ConflictError('Ya existe una cuenta con ese correo');

    const passwordHash = await hashPassword(input.password);
    const cred = await prisma.credencial.create({
      data: { usuario_login: input.usuario_login, password_hash: passwordHash },
      select: { id: true },
    });

    const perfil = await prisma.perfilUsuario.create({
      data: {
        credencial_id: cred.id,
        rol: 'Alumno',
        entidad_tipo: 'alumno',
        entidad_id: randomUUID(),
      },
      select: { id: true },
    });

    const alumno = await AlumnosRepository.create(
      { ...input, perfilUsuarioId: perfil.id },
      adminPerfilId,
    );

    await prisma.perfilUsuario.update({
      where: { id: perfil.id },
      data: { entidad_id: alumno.id },
    });

    await AuditService.log({
      usuarioId: adminPerfilId,
      tipo: 'CREATE',
      modulo: 'alumnos',
      entidadAfectada: 'alumno',
      entidadId: alumno.id,
      newValue: { nombres: input.nombres, dni: input.dni },
    });

    return { ...alumno, usuario_login: input.usuario_login };
  },

  async update(
    alumnoId: string,
    input: UpdateAlumnoInput,
    adminPerfilId: string,
  ): Promise<AlumnoDTO> {
    const current = await AlumnosRepository.findById(alumnoId);
    if (!current) throw new NotFoundError('Alumno');

    if (input.dni && input.dni !== current.dni) {
      const existing = await AlumnosRepository.findByDNI(input.dni, current.periodo_id);
      if (existing) throw new ConflictError('Ya existe otro alumno con ese DNI en este período');
    }

    if (input.usuario_login && input.usuario_login !== current.perfil?.credencial.usuario_login) {
      const existing = await prisma.credencial.findUnique({
        where: { usuario_login: input.usuario_login },
        select: { id: true },
      });
      if (existing) throw new ConflictError('Ya existe otra cuenta con ese correo');
      
      await prisma.credencial.update({
        where: { id: current.perfil.credencial.id },
        data: { usuario_login: input.usuario_login },
      });
    }

    await AlumnosRepository.update(alumnoId, input, adminPerfilId);

    await AuditService.log({
      usuarioId: adminPerfilId,
      tipo: 'UPDATE',
      modulo: 'alumnos',
      entidadAfectada: 'alumno',
      entidadId: alumnoId,
    });

    return this.get(alumnoId);
  },

  async setActivo(alumnoId: string, activo: boolean, adminPerfilId: string): Promise<AlumnoDTO> {
    const current = await AlumnosRepository.findById(alumnoId);
    if (!current) throw new NotFoundError('Alumno');

    await AlumnosRepository.setActivo(alumnoId, activo, adminPerfilId);

    await AuditService.log({
      usuarioId: adminPerfilId,
      tipo: 'UPDATE',
      modulo: 'alumnos',
      entidadAfectada: 'alumno',
      entidadId: alumnoId,
      newValue: { activo },
    });

    return this.get(alumnoId);
  },

  async adminResetPassword(_alumnoId: string, _input: unknown, _adminPerfilId: string) {
    throw new Error('No implementado en FASE 1');
  },

  async setBloqueoManual(alumnoId: string, bloqueado: boolean, adminPerfilId: string) {
    const existing = await AlumnosRepository.findById(alumnoId);
    if (!existing) throw new NotFoundError('Alumno');

    await AlumnosRepository.setBloqueoManual(alumnoId, bloqueado, adminPerfilId);

    await AuditService.log({
      usuarioId: adminPerfilId,
      tipo: 'UPDATE',
      modulo: 'alumnos',
      entidadAfectada: 'alumno',
      entidadId: alumnoId,
      newValue: { bloqueo_manual: bloqueado },
    });

    return this.get(alumnoId);
  },

  async cursos(_alumnoId: string) {
    throw new Error('No implementado en FASE 1');
  },
};
