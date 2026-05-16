// ============================================================
//  lib/audit-context.ts — Contexto de auditoría para triggers.
//
//  Los triggers tg_audit_nota / tg_audit_pago / tg_audit_boleta /
//  tg_audit_credencial leen `app.current_user_id` para registrar
//  quién hizo el cambio en audit_schema.sesion_auditoria
//  (cuya columna usuario_id es NOT NULL).
//
//  REGLA: toda operación de ESCRITURA sobre nota, pago,
//  boleta_pago o credencial DEBE ejecutarse dentro de
//  withAuditContext(perfilId, ...), o el trigger fallará.
//
//  Se usa set_config(..., is_local = true) en lugar de
//  `SET LOCAL` porque SET no admite parámetros enlazados.
// ============================================================
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export type Tx = Prisma.TransactionClient;

export function withAuditContext<T>(
  perfilId: string,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    // Variable de sesión local a esta transacción.
    await tx.$executeRaw`SELECT set_config('app.current_user_id', ${perfilId}, true)`;
    return fn(tx);
  });
}
