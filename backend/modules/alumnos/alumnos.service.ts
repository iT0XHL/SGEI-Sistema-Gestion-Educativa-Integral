import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { paginate } from '@/lib/response';
import { NotFoundError, ConflictError } from '@/errors/http-errors';
import { AuditService } from '@/modules/auditoria/audit.service';
import { NotificacionService } from '@/modules/notificaciones/notificacion.service';
import { NotificationEvents } from '@/modules/notificaciones/notificacion.events';
import { AlumnosRepository, type ListFilters } from './alumnos.repository';
import { withAuditContext } from '@/lib/audit-context';
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
  bloqueo_manual: boolean;
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
      bloqueo_manual: row.bloqueo_manual,
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

    // Notificar: administradores, secretarías y el alumno creado (§6 ALUMNO_CREADO).
    await NotificacionService.notificarEvento({
      evento: NotificationEvents.ALUMNO_CREADO,
      actor:  { perfilId: adminPerfilId },
      contexto: {
        alumnoId:     alumno.id,
        alumnoNombre: `${input.nombres} ${input.apellido_paterno}`,
      },
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

    // Notificar: administradores, secretarías y el alumno afectado (§6 ALUMNO_ACTUALIZADO).
    await NotificacionService.notificarEvento({
      evento: NotificationEvents.ALUMNO_ACTUALIZADO,
      actor:  { perfilId: adminPerfilId },
      contexto: {
        alumnoId:     alumnoId,
        alumnoNombre: `${input.nombres ?? current.nombres} ${input.apellido_paterno ?? current.apellido_paterno}`,
      },
      idempotencyExtra: String(Date.now()),
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

  /**
   * Admin/Secretaria resetea la contraseña del alumno sin conocer la actual
   * y desbloquea la cuenta. El UPDATE de credencial dispara tg_audit_credencial.
   */
  async adminResetPassword(
    alumnoId: string,
    input: { password_nueva: string },
    adminPerfilId: string,
  ): Promise<void> {
    const current = await AlumnosRepository.findById(alumnoId);
    if (!current) throw new NotFoundError('Alumno');
    const credencialId = current.perfil?.credencial.id;
    if (!credencialId) throw new NotFoundError('Credencial del alumno');

    const hash = await hashPassword(input.password_nueva);
    await withAuditContext(adminPerfilId, (tx) =>
      tx.credencial.update({
        where: { id: credencialId },
        data: { password_hash: hash, intentos_fallidos: 0, bloqueado_hasta: null },
      }),
    );
  },

  /**
   * Bloqueo manual de la libreta (alumno.bloqueo_manual). TRUE impide la
   * descarga aunque no haya deuda (ver fn_bloquea_libreta en el DDL).
   */
  async setBloqueoManual(
    alumnoId: string,
    bloqueado: boolean,
    adminPerfilId: string,
  ): Promise<AlumnoDTO> {
    const current = await AlumnosRepository.findById(alumnoId);
    if (!current) throw new NotFoundError('Alumno');

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

  /**
   * Cursos del alumno = asignaciones docente-curso activas de su sección en su
   * período. Devuelve la forma que espera el frontend (AsignacionDocente[]).
   */
  async cursos(alumnoId: string) {
    const alumno = await prisma.alumno.findUnique({
      where:  { id: alumnoId },
      select: { seccion_id: true, periodo_id: true },
    });
    if (!alumno) throw new NotFoundError('Alumno');

    return prisma.asignacionDocente.findMany({
      where: {
        seccion_id: alumno.seccion_id,
        periodo_id: alumno.periodo_id,
        activo:     true,
      },
      select: {
        id:         true,
        docente_id: true,
        curso_id:   true,
        seccion_id: true,
        periodo_id: true,
        activo:     true,
        docente: { select: { id: true, nombres: true, apellido_paterno: true } },
        curso:   { select: { id: true, nombre: true } },
        seccion: { select: { id: true, nombre: true } },
      },
      orderBy: { curso: { nombre: 'asc' } },
    });
  },
};
