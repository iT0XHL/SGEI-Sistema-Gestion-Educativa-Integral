import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { paginate } from '@/lib/response';
import { NotFoundError, ConflictError } from '@/errors/http-errors';
import { AuditService } from '@/modules/auditoria/audit.service';
import { NotificacionService } from '@/modules/notificaciones/notificacion.service';
import { NotificationEvents } from '@/modules/notificaciones/notificacion.events';
import { DocentesRepository, type ListFilters } from './docentes.repository';
import { AsignacionService, HorarioService } from '@/modules/academic/asignacion.service';
import { withAuditContext } from '@/lib/audit-context';
import type { CreateDocenteInput, UpdateDocenteInput } from '@/schemas/personas.schema';
import { randomUUID } from 'crypto';

export interface DocenteDTO {
  id: string;
  dni: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  especialidad: string;
  telefono: string;
  email_institucional: string | null;
  fecha_nacimiento: Date | null;
  sexo: string | null;
  titulo_profesional: string | null;
  fecha_ingreso: Date | null;
  activo: boolean;
  usuario_login?: string;
}

export const DocentesService = {
  async list(filters: ListFilters) {
    const { rows, total } = await DocentesRepository.list(filters);
    const dtos = rows.map((r) => ({
      id: r.id,
      dni: r.dni,
      nombres: r.nombres,
      apellido_paterno: r.apellido_paterno,
      apellido_materno: r.apellido_materno,
      especialidad: r.especialidad,
      telefono: r.telefono,
      email_institucional: r.email_institucional,
      fecha_nacimiento: r.fecha_nacimiento,
      sexo: r.sexo,
      titulo_profesional: r.titulo_profesional,
      fecha_ingreso: r.fecha_ingreso,
      activo: r.activo,
      usuario_login: r.perfil?.credencial.usuario_login,
    }));
    return paginate(dtos, filters.page, filters.limit, total);
  },

  async get(docenteId: string): Promise<DocenteDTO> {
    const row = await DocentesRepository.findById(docenteId);
    if (!row) throw new NotFoundError('Docente');
    return {
      id: row.id,
      dni: row.dni,
      nombres: row.nombres,
      apellido_paterno: row.apellido_paterno,
      apellido_materno: row.apellido_materno,
      especialidad: row.especialidad,
      telefono: row.telefono,
      email_institucional: row.email_institucional,
      fecha_nacimiento: row.fecha_nacimiento,
      sexo: row.sexo,
      titulo_profesional: row.titulo_profesional,
      fecha_ingreso: row.fecha_ingreso,
      activo: row.activo,
      usuario_login: row.perfil?.credencial.usuario_login,
    };
  },

  async create(input: CreateDocenteInput, adminPerfilId: string): Promise<DocenteDTO> {
    const existing = await DocentesRepository.findByDNI(input.dni);
    if (existing) throw new ConflictError('Ya existe un docente con ese DNI');

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
        rol: 'Docente',
        entidad_tipo: 'docente',
        entidad_id: randomUUID(),
      },
      select: { id: true },
    });

    const docente = await DocentesRepository.create(
      { ...input, perfilUsuarioId: perfil.id },
      adminPerfilId,
    );

    await prisma.perfilUsuario.update({
      where: { id: perfil.id },
      data: { entidad_id: docente.id },
    });

    await AuditService.log({
      usuarioId: adminPerfilId,
      tipo: 'CREATE',
      modulo: 'docentes',
      entidadAfectada: 'docente',
      entidadId: docente.id,
      newValue: { nombres: input.nombres, dni: input.dni },
    });

    // Notificar: secretarías, administradores y el docente creado (§6 DOCENTE_CREADO).
    await NotificacionService.notificarEvento({
      evento: NotificationEvents.DOCENTE_CREADO,
      actor:  { perfilId: adminPerfilId },
      contexto: {
        docenteId:     docente.id,
        docenteNombre: `${input.nombres} ${input.apellido_paterno}`,
      },
    });

    return { ...docente, usuario_login: input.usuario_login };
  },

  async update(
    docenteId: string,
    input: UpdateDocenteInput,
    adminPerfilId: string,
  ): Promise<DocenteDTO> {
    const current = await DocentesRepository.findById(docenteId);
    if (!current) throw new NotFoundError('Docente');

    if (input.dni && input.dni !== current.dni) {
      const existing = await DocentesRepository.findByDNI(input.dni);
      if (existing) throw new ConflictError('Ya existe otro docente con ese DNI');
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

    await DocentesRepository.update(docenteId, input, adminPerfilId);

    await AuditService.log({
      usuarioId: adminPerfilId,
      tipo: 'UPDATE',
      modulo: 'docentes',
      entidadAfectada: 'docente',
      entidadId: docenteId,
    });

    // Notificar a administradores y secretarías (§6 DOCENTE_ACTUALIZADO).
    await NotificacionService.notificarEvento({
      evento: NotificationEvents.DOCENTE_ACTUALIZADO,
      actor:  { perfilId: adminPerfilId },
      contexto: {
        docenteId:     docenteId,
        docenteNombre: `${input.nombres ?? current.nombres} ${input.apellido_paterno ?? current.apellido_paterno}`,
      },
      idempotencyExtra: String(Date.now()),
    });

    return this.get(docenteId);
  },

  async setActivo(docenteId: string, activo: boolean, adminPerfilId: string): Promise<DocenteDTO> {
    const current = await DocentesRepository.findById(docenteId);
    if (!current) throw new NotFoundError('Docente');

    await DocentesRepository.setActivo(docenteId, activo, adminPerfilId);

    await AuditService.log({
      usuarioId: adminPerfilId,
      tipo: 'UPDATE',
      modulo: 'docentes',
      entidadAfectada: 'docente',
      entidadId: docenteId,
      newValue: { activo },
    });

    return this.get(docenteId);
  },

  /** Asignaciones docente–curso–sección activas del docente. */
  async asignaciones(docenteId: string) {
    const docente = await DocentesRepository.findById(docenteId);
    if (!docente) throw new NotFoundError('Docente');
    return AsignacionService.list({ docenteId });
  },

  /** Bloques de horario del docente (todas sus secciones/cursos). */
  async horario(docenteId: string) {
    const docente = await DocentesRepository.findById(docenteId);
    if (!docente) throw new NotFoundError('Docente');
    return HorarioService.list({ docenteId });
  },

  /**
   * Admin resetea la contraseña del docente sin conocer la actual y
   * desbloquea la cuenta (intentos fallidos / bloqueado_hasta).
   * El UPDATE de credencial dispara tg_audit_credencial → withAuditContext.
   */
  async adminResetPassword(
    docenteId: string,
    input: { password_nueva: string },
    adminPerfilId: string,
  ): Promise<void> {
    const current = await DocentesRepository.findById(docenteId);
    if (!current) throw new NotFoundError('Docente');
    const credencialId = current.perfil?.credencial.id;
    if (!credencialId) throw new NotFoundError('Credencial del docente');

    const hash = await hashPassword(input.password_nueva);
    await withAuditContext(adminPerfilId, (tx) =>
      tx.credencial.update({
        where: { id: credencialId },
        data: { password_hash: hash, intentos_fallidos: 0, bloqueado_hasta: null },
      }),
    );
  },
};
