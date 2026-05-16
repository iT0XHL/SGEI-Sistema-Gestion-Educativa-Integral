// ============================================================
//  modules/docentes/docentes.repository.ts
//  Un docente = credencial + perfil_usuario + academic_schema.docente.
// ============================================================
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { Tx } from '@/lib/audit-context';

export interface DocenteData {
  dni: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  especialidad: string;
  telefono: string;
  email_institucional?: string | null;
  fecha_nacimiento?: Date | null;
  sexo?: string | null;
  titulo_profesional?: string | null;
  fecha_ingreso?: Date | null;
}

export const DocentesRepository = {
  list(filters: { q?: string; activo?: boolean; page: number; limit: number }) {
    const where: Prisma.DocenteWhereInput = {};
    if (filters.activo !== undefined) where.activo = filters.activo;
    if (filters.q) {
      where.OR = [
        { nombres: { contains: filters.q, mode: 'insensitive' } },
        { apellido_paterno: { contains: filters.q, mode: 'insensitive' } },
        { apellido_materno: { contains: filters.q, mode: 'insensitive' } },
        { dni: { contains: filters.q } },
      ];
    }
    return Promise.all([
      prisma.docente.findMany({
        where,
        orderBy: [{ apellido_paterno: 'asc' }, { nombres: 'asc' }],
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.docente.count({ where }),
    ]);
  },

  findById(id: string) {
    return prisma.docente.findUnique({ where: { id } });
  },

  findByDni(dni: string) {
    return prisma.docente.findUnique({ where: { dni } });
  },

  /**
   * Crea credencial + perfil + docente de forma atómica.
   * El id del docente se pre-genera para resolver la dependencia
   * perfil_usuario.entidad_id ↔ docente.id sin un segundo UPDATE.
   */
  createWithAccount(input: {
    usuarioLogin: string;
    passwordHash: string;
    docente: DocenteData;
  }) {
    const docenteId = randomUUID();
    return prisma.$transaction(async (tx) => {
      const cred = await tx.credencial.create({
        data: {
          usuario_login: input.usuarioLogin,
          password_hash: input.passwordHash,
        },
      });
      const perfil = await tx.perfilUsuario.create({
        data: {
          credencial_id: cred.id,
          rol: 'Docente',
          entidad_tipo: 'docente',
          entidad_id: docenteId,
        },
      });
      return tx.docente.create({
        data: {
          id: docenteId,
          perfil_usuario_id: perfil.id,
          ...input.docente,
        },
      });
    });
  },

  update(id: string, data: Prisma.DocenteUpdateInput) {
    return prisma.docente.update({ where: { id }, data });
  },

  /** Baja lógica: desactiva docente + su credencial (corre en Tx auditada). */
  async deactivate(tx: Tx, id: string, credencialId: string) {
    await tx.docente.update({ where: { id }, data: { activo: false } });
    await tx.credencial.update({ where: { id: credencialId }, data: { activo: false } });
  },

  /** Devuelve el credencial_id asociado al docente. */
  async getCredencialId(docenteId: string): Promise<string | null> {
    const docente = await prisma.docente.findUnique({
      where: { id: docenteId },
      select: { perfil: { select: { credencial_id: true } } },
    });
    return docente?.perfil.credencial_id ?? null;
  },
};
