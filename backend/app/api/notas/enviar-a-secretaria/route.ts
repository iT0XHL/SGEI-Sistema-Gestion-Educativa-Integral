import { type NextRequest } from 'next/server';
import { withRole } from '@/lib/auth';
import { parseBody } from '@/lib/request';
import { ok, errorResponse } from '@/lib/response';
import { ForbiddenError, NotFoundError, BusinessRuleError } from '@/errors/http-errors';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { withAuditContext } from '@/lib/audit-context';
import { AuditService } from '@/modules/auditoria/audit.service';
import { NotificacionService } from '@/modules/notificaciones/notificacion.service';
import { NotificationEvents } from '@/modules/notificaciones/notificacion.events';

const EnviarNotasSchema = z.object({
  docenteId: z.string().uuid(),
  bimestreId: z.string().uuid(),
});

export const POST = withRole(['Docente', 'Admin'], async (req, ctx) => {
  try {
    const body = await parseBody(req, EnviarNotasSchema);

    if (ctx.user.rol === 'Docente' && ctx.user.entidadId !== body.docenteId) {
      throw new ForbiddenError('ACCESO_DENEGADO', 'Solo puedes enviar tus propias notas.');
    }

    const bimestre = await prisma.bimestre.findUnique({
      where: { id: body.bimestreId },
      select: { cerrado: true, nombre: true },
    });
    if (!bimestre) throw new NotFoundError('Bimestre');
    if (bimestre.cerrado) throw new BusinessRuleError('BIMESTRE_CERRADO', 'El bimestre ya está cerrado.');

    const result = await withAuditContext(ctx.user.perfilId, async (tx) => {
      // Solo se cierran las notas AÚN ABIERTAS: reintentar sobre notas ya
      // cerradas dispararía el trigger tg_bloquear_nota_cerrada. Si todas ya
      // están cerradas, count = 0 (ya fueron enviadas) y no se re-notifica.
      return await tx.nota.updateMany({
        where: {
          docente_id:  body.docenteId,
          bimestre_id: body.bimestreId,
          cerrada:     false,
        },
        data: { cerrada: true },
      });
    });

    await AuditService.log({
      usuarioId:       ctx.user.perfilId,
      tipo:            'UPDATE',
      modulo:          'notas',
      entidadAfectada: 'nota',
      entidadId:       null,
      newValue: { docenteId: body.docenteId, bimestreId: body.bimestreId, notas_cerradas: result.count },
    });

    // Notifica a secretarías y administradores que el docente cerró/envió sus
    // notas del bimestre (§8/§21). idempotencyExtra por (docente, bimestre)
    // evita duplicados ante doble envío.
    if (result.count > 0) {
      await NotificacionService.notificarEvento({
        evento: NotificationEvents.NOTAS_ENVIADAS_A_SECRETARIA,
        actor:  { perfilId: ctx.user.perfilId, rol: ctx.user.rol, nombre: ctx.user.nombre },
        contexto: { docenteId: body.docenteId, bimestreNombre: bimestre.nombre },
        idempotencyExtra: `${body.docenteId}:${body.bimestreId}`,
      });
    }

    return ok({ count: result.count }, `Notas enviadas a secretaría (${result.count} cerradas).`);
  } catch (e) {
    return errorResponse(e);
  }
});
