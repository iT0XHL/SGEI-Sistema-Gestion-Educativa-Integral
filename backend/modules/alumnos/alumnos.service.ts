import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { paginate } from '@/lib/response';
import { NotFoundError, ConflictError } from '@/errors/http-errors';
import { withAuditContext } from '@/lib/audit-context';
import { revokeUserTokens } from '@/lib/token-blacklist';
import { AuditService } from '@/modules/auditoria/audit.service';
import { AlumnosRepository, type ListFilters } from './alumnos.repository';
import { desambiguarNombres } from './nombre-desambiguado.util';
import { NotificacionService } from '@/modules/notificaciones/notificacion.service';
import { NotificationEvents } from '@/modules/notificaciones/notificacion.events';
import type { JwtClaims } from '@/lib/jwt';
import type { CreateAlumnoInput, UpdateAlumnoInput } from '@/schemas/personas.schema';


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
  sufijo_homonimo?: string;
}

export const AlumnosService = {
  async list(filters: ListFilters) {
    const { rows, total } = await AlumnosRepository.list(filters);
    const sufijos = desambiguarNombres(rows);
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
      sufijo_homonimo: sufijos.get(r.id),
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

  async create(input: CreateAlumnoInput, user: JwtClaims): Promise<AlumnoDTO> {
    const adminPerfilId = user.perfilId;
    const existing = await prisma.alumno.findFirst({
      where: { dni: input.dni },
      select: { id: true },
    });
    if (existing) throw new ConflictError('Ya existe un alumno con ese DNI');

    const existingLogin = await prisma.credencial.findUnique({
      where: { usuario_login: input.usuario_login },
      select: { id: true },
    });
    if (existingLogin) throw new ConflictError('Ya existe una cuenta con ese correo');

    const passwordHash = await hashPassword(input.password);

    return prisma.$transaction(async (tx) => {
      const cred = await tx.credencial.create({
        // Cuenta nueva: se obliga a cambiar la contraseña en el primer login.
        data: { usuario_login: input.usuario_login, password_hash: passwordHash, debe_cambiar_password: true },
        select: { id: true },
      });

      const perfil = await tx.perfilUsuario.create({
        data: {
          credencial_id: cred.id,
          rol: 'Alumno',
          entidad_tipo: 'alumno',
          entidad_id: '00000000-0000-0000-0000-000000000000',
        },
        select: { id: true },
      });

      await tx.$executeRaw`SELECT set_config('app.current_user_id', ${adminPerfilId}, true)`;

      const alumno = await tx.alumno.create({
        data: {
          perfil_usuario_id: perfil.id,
          seccion_id: input.seccion_id,
          periodo_id: input.periodo_id,
          dni: input.dni,
          nombres: input.nombres,
          apellido_paterno: input.apellido_paterno,
          apellido_materno: input.apellido_materno,
          fecha_nacimiento: new Date(input.fecha_nacimiento),
          sexo: input.sexo,
          direccion: input.direccion ?? null,
          distrito: input.distrito ?? null,
          telefono_emergencia: input.telefono_emergencia ?? null,
          grupo_sanguineo: input.grupo_sanguineo ?? null,
          condicion_especial: input.condicion_especial ?? null,
          codigo_siagie: input.codigo_siagie ?? null,
        },
        select: {
          id: true,
          dni: true,
          nombres: true,
          apellido_paterno: true,
          apellido_materno: true,
          fecha_nacimiento: true,
          sexo: true,
          direccion: true,
          distrito: true,
          telefono_emergencia: true,
          grupo_sanguineo: true,
          condicion_especial: true,
          codigo_siagie: true,
          activo: true,
        },
      });

      await tx.perfilUsuario.update({
        where: { id: perfil.id },
        data: { entidad_id: alumno.id },
      });

      await AuditService.logWithinTx(tx, {
        usuarioId: adminPerfilId,
        tipo: 'CREATE',
        modulo: 'alumnos',
        entidadAfectada: 'alumno',
        entidadId: alumno.id,
        newValue: { nombres: input.nombres, dni: input.dni },
      });

      return { ...alumno, usuario_login: input.usuario_login };
    }).then(async (alumno) => {
      await NotificacionService.notificarEvento({
        evento: NotificationEvents.ALUMNO_CREADO,
        actor:  { perfilId: user.perfilId, rol: user.rol, nombre: user.nombre },
        contexto: { alumnoId: alumno.id, seccionId: input.seccion_id, alumnoNombre: input.nombres },
      });
      return alumno;
    });
  },

  async update(
    alumnoId: string,
    input: UpdateAlumnoInput,
    actor: JwtClaims,
  ): Promise<AlumnoDTO> {
    const adminPerfilId = actor.perfilId;
    const current = await AlumnosRepository.findById(alumnoId);
    if (!current) throw new NotFoundError('Alumno');

    if (input.dni && input.dni !== current.dni) {
      const existing = await prisma.alumno.findFirst({
        where: { dni: input.dni },
        select: { id: true },
      });
      if (existing) throw new ConflictError('Ya existe otro alumno con ese DNI');
    }

    const alumno = await prisma.$transaction(async (tx) => {
      if (input.usuario_login && input.usuario_login !== current.perfil?.credencial.usuario_login) {
        const existing = await tx.credencial.findUnique({
          where: { usuario_login: input.usuario_login },
          select: { id: true },
        });
        if (existing) throw new ConflictError('Ya existe otra cuenta con ese correo');

        await tx.credencial.update({
          where: { id: current.perfil.credencial.id },
          data: { usuario_login: input.usuario_login },
        });
      }

      await tx.$executeRaw`SELECT set_config('app.current_user_id', ${adminPerfilId}, true)`;

      await tx.alumno.update({
        where: { id: alumnoId },
        data: {
          ...(input.nombres && { nombres: input.nombres }),
          ...(input.apellido_paterno && { apellido_paterno: input.apellido_paterno }),
          ...(input.apellido_materno && { apellido_materno: input.apellido_materno }),
          ...(input.dni && { dni: input.dni }),
          ...(input.fecha_nacimiento && { fecha_nacimiento: new Date(input.fecha_nacimiento) }),
          ...(input.sexo && { sexo: input.sexo }),
          ...(input.direccion !== undefined && { direccion: input.direccion }),
          ...(input.distrito !== undefined && { distrito: input.distrito }),
          ...(input.telefono_emergencia !== undefined && { telefono_emergencia: input.telefono_emergencia }),
          ...(input.grupo_sanguineo !== undefined && { grupo_sanguineo: input.grupo_sanguineo }),
          ...(input.condicion_especial !== undefined && { condicion_especial: input.condicion_especial }),
          ...(input.codigo_siagie !== undefined && { codigo_siagie: input.codigo_siagie }),
          ...(input.seccion_id && { seccion_id: input.seccion_id }),
        },
      });

      await AuditService.logWithinTx(tx, {
        usuarioId: adminPerfilId,
        tipo: 'UPDATE',
        modulo: 'alumnos',
        entidadAfectada: 'alumno',
        entidadId: alumnoId,
      });

      return this.get(alumnoId);
    });

    await NotificacionService.notificarEvento({
      evento: NotificationEvents.ALUMNO_ACTUALIZADO,
      actor:  { perfilId: actor.perfilId, rol: actor.rol, nombre: actor.nombre },
      contexto: {
        alumnoId,
        alumnoNombre: `${alumno.nombres} ${alumno.apellido_paterno}`.trim(),
      },
    });

    return alumno;
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

  async adminResetPassword(alumnoId: string, input: { password_nueva: string }, adminPerfilId: string) {
    const alumno = await AlumnosRepository.findById(alumnoId);
    if (!alumno) throw new NotFoundError('Alumno');
    if (!alumno.perfil_usuario_id) throw new NotFoundError('Perfil de usuario del alumno');

    const perfil = await prisma.perfilUsuario.findUnique({
      where: { id: alumno.perfil_usuario_id },
      select: { credencial: { select: { id: true } } },
    });
    if (!perfil) throw new NotFoundError('Credencial del alumno');

    const hash = await hashPassword(input.password_nueva);
    await withAuditContext(adminPerfilId, (tx) =>
      tx.credencial.update({
        where: { id: perfil.credencial.id },
        data: { password_hash: hash, debe_cambiar_password: true },
      }),
    );
    // Invalida la sesión activa del alumno: al volver a entrar se le forzará
    // el cambio de contraseña (debe_cambiar_password = true).
    revokeUserTokens(alumno.perfil_usuario_id);
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

  /** Cursos (asignaciones docente-curso) de la sección del alumno en su período. */
  async cursos(alumnoId: string) {
    const alumno = await AlumnosRepository.findById(alumnoId);
    if (!alumno) throw new NotFoundError('Alumno');

    return prisma.asignacionDocente.findMany({
      where: { seccion_id: alumno.seccion_id, periodo_id: alumno.periodo_id, activo: true },
      include: {
        docente: { select: { id: true, nombres: true, apellido_paterno: true } },
        curso:   { select: { id: true, nombre: true } },
        seccion: {
          select: {
            id: true, nombre: true, grado_id: true,
            grado: { select: { id: true, nombre: true, nivel: { select: { id: true, nombre: true } } } },
          },
        },
      },
    });
  },
};
