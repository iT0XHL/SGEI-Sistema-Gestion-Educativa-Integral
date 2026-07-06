import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { paginate } from '@/lib/response';
import { NotFoundError, ConflictError } from '@/errors/http-errors';
import { withAuditContext } from '@/lib/audit-context';
import { AuditService } from '@/modules/auditoria/audit.service';
import { DocentesRepository, type ListFilters } from './docentes.repository';
import type { CreateDocenteInput, UpdateDocenteInput } from '@/schemas/personas.schema';

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

    return prisma.$transaction(async (tx) => {
      const cred = await tx.credencial.create({
        data: { usuario_login: input.usuario_login, password_hash: passwordHash },
        select: { id: true },
      });

      const perfil = await tx.perfilUsuario.create({
        data: {
          credencial_id: cred.id,
          rol: 'Docente',
          entidad_tipo: 'docente',
          entidad_id: '00000000-0000-0000-0000-000000000000',
        },
        select: { id: true },
      });

      await tx.$executeRaw`SELECT set_config('app.current_user_id', ${adminPerfilId}, true)`;

      const docente = await tx.docente.create({
        data: {
          perfil_usuario_id: perfil.id,
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
        select: {
          id: true,
          dni: true,
          nombres: true,
          apellido_paterno: true,
          apellido_materno: true,
          especialidad: true,
          telefono: true,
          email_institucional: true,
          fecha_nacimiento: true,
          sexo: true,
          titulo_profesional: true,
          fecha_ingreso: true,
          activo: true,
        },
      });

      await tx.perfilUsuario.update({
        where: { id: perfil.id },
        data: { entidad_id: docente.id },
      });

      await AuditService.logWithinTx(tx, {
        usuarioId: adminPerfilId,
        tipo: 'CREATE',
        modulo: 'docentes',
        entidadAfectada: 'docente',
        entidadId: docente.id,
        newValue: { nombres: input.nombres, dni: input.dni },
      });

      return { ...docente, usuario_login: input.usuario_login };
    });
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

    return prisma.$transaction(async (tx) => {
      if (input.usuario_login && input.usuario_login !== current.perfil?.credencial.usuario_login) {
        const existing = await tx.credencial.findUnique({
          where: { usuario_login: input.usuario_login },
          select: { id: true },
        });
        if (existing) throw new ConflictError('Ya existe otra cuenta con ese correo');

        await tx.$executeRaw`SELECT set_config('app.current_user_id', ${adminPerfilId}, true)`;
        await tx.credencial.update({
          where: { id: current.perfil.credencial.id },
          data: { usuario_login: input.usuario_login },
        });
      }

      await tx.$executeRaw`SELECT set_config('app.current_user_id', ${adminPerfilId}, true)`;
      await tx.docente.update({
        where: { id: docenteId },
        data: {
          ...(input.nombres && { nombres: input.nombres }),
          ...(input.apellido_paterno && { apellido_paterno: input.apellido_paterno }),
          ...(input.apellido_materno && { apellido_materno: input.apellido_materno }),
          ...(input.dni && { dni: input.dni }),
          ...(input.especialidad && { especialidad: input.especialidad }),
          ...(input.telefono && { telefono: input.telefono }),
          ...(input.email_institucional !== undefined && { email_institucional: input.email_institucional }),
          ...(input.fecha_nacimiento !== undefined && { fecha_nacimiento: input.fecha_nacimiento }),
          ...(input.sexo !== undefined && { sexo: input.sexo }),
          ...(input.titulo_profesional !== undefined && { titulo_profesional: input.titulo_profesional }),
          ...(input.fecha_ingreso !== undefined && { fecha_ingreso: input.fecha_ingreso }),
        },
      });

      await AuditService.logWithinTx(tx, {
        usuarioId: adminPerfilId,
        tipo: 'UPDATE',
        modulo: 'docentes',
        entidadAfectada: 'docente',
        entidadId: docenteId,
      });

      return this.get(docenteId);
    });
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

  async asignaciones(_docenteId: string) {
    throw new Error('No implementado en FASE 1');
  },

  async adminResetPassword(docenteId: string, input: { password_nueva: string }, adminPerfilId: string) {
    const docente = await DocentesRepository.findById(docenteId);
    if (!docente) throw new NotFoundError('Docente');
    if (!docente.perfil?.credencial.id) throw new NotFoundError('Credencial del docente');

    const hash = await hashPassword(input.password_nueva);
    await withAuditContext(adminPerfilId, (tx) =>
      tx.credencial.update({
        where: { id: docente.perfil.credencial.id },
        data: { password_hash: hash, debe_cambiar_password: true },
      }),
    );
  },
};
