// ============================================================
//  modules/auditoria/audit.service.ts
//  Auditoría MANUAL (eventos que los triggers SQL no cubren):
//  LOGIN, LOGOUT, READ_SENSITIVE (descarga de libreta, export
//  SIAGIE), y acciones administrativas relevantes.
//
//  La auditoría AUTOMÁTICA de DML sobre nota/pago/boleta_pago/
//  credencial la hacen los triggers tg_audit_* — no se duplica.
//  audit_schema.sesion_auditoria NO tiene trigger: se inserta
//  directamente sin necesidad de app.current_user_id.
// ============================================================
import { prisma } from '@/lib/prisma';
import type { TipoAccionAuditoria } from '@prisma/client';
import type { Prisma } from '@prisma/client';

export interface AuditLogInput {
  usuarioId: string; // perfil_usuario.id
  tipo: TipoAccionAuditoria;
  modulo: string;
  entidadAfectada: string;
  entidadId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  ip?: string | null;
  userAgent?: string | null;
}

export const AuditService = {
  async log(data: AuditLogInput): Promise<void> {
    await prisma.$executeRaw`
      INSERT INTO audit_schema.sesion_auditoria
        (usuario_id, tipo_accion, modulo, entidad_afectada, entidad_id,
         old_value, new_value, ip_origen, user_agent)
      VALUES (
        ${data.usuarioId}::uuid,
        ${data.tipo}::auth_schema.tipo_accion_auditoria,
        ${data.modulo},
        ${data.entidadAfectada},
        ${data.entidadId ?? null}::uuid,
        ${data.oldValue ? JSON.stringify(data.oldValue) : null}::jsonb,
        ${data.newValue ? JSON.stringify(data.newValue) : null}::jsonb,
        ${data.ip ?? null}::inet,
        ${data.userAgent ?? null}
      )
    `;
  },

  async logWithinTx(tx: Prisma.TransactionClient, data: AuditLogInput): Promise<void> {
    await tx.$executeRaw`
      INSERT INTO audit_schema.sesion_auditoria
        (usuario_id, tipo_accion, modulo, entidad_afectada, entidad_id,
         old_value, new_value, ip_origen, user_agent)
      VALUES (
        ${data.usuarioId}::uuid,
        ${data.tipo}::auth_schema.tipo_accion_auditoria,
        ${data.modulo},
        ${data.entidadAfectada},
        ${data.entidadId ?? null}::uuid,
        ${data.oldValue ? JSON.stringify(data.oldValue) : null}::jsonb,
        ${data.newValue ? JSON.stringify(data.newValue) : null}::jsonb,
        ${data.ip ?? null}::inet,
        ${data.userAgent ?? null}
      )
    `;
  },
};
