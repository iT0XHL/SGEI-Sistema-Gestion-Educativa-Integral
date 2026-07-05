// ============================================================
//  GET /api/cron/notificaciones-diarias
//  Disparado una vez al día por Vercel Cron (ver vercel.json).
//  Genera notificaciones basadas en tiempo (no en una mutación):
//   · PAGO_POR_VENCER    — pagos que vencen en exactamente 3 días.
//   · ASISTENCIA_PENDIENTE — docentes con asignación activa que aún
//     no registraron su asistencia de hoy.
//
//  Protegido con CRON_SECRET (header Authorization: Bearer <secreto>),
//  igual al patrón estándar de Vercel Cron.
// ============================================================
import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { env } from '@/config/env';
import { NotificacionService } from '@/modules/notificaciones/notificacion.service';
import { NotificationEvents } from '@/modules/notificaciones/notificacion.events';

export const dynamic = 'force-dynamic';

const SISTEMA_ACTOR = { perfilId: '', rol: 'Admin', nombre: 'Sistema' };

function inicioDelDia(offsetDias: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offsetDias);
  return d;
}

export async function GET(req: NextRequest) {
  if (!env.CRON_SECRET) {
    return NextResponse.json({ success: false, error: 'CRON_SECRET no configurado' }, { status: 503 });
  }
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  }

  // ── Pagos que vencen en exactamente 3 días ─────────────────────────────────
  const objetivo = inicioDelDia(3);
  const finObjetivo = inicioDelDia(4);
  const pagosPorVencer = await prisma.pago.findMany({
    where: {
      estado: { not: 'Pagado' },
      fecha_vencimiento: { gte: objetivo, lt: finObjetivo },
    },
    select: { id: true, alumno_id: true },
  });

  for (const pago of pagosPorVencer) {
    await NotificacionService.notificarEvento({
      evento: NotificationEvents.PAGO_POR_VENCER,
      actor:  SISTEMA_ACTOR,
      contexto: { alumnoId: pago.alumno_id, pagoId: pago.id },
    });
  }

  // ── Docentes con asignación activa sin asistencia registrada hoy ───────────
  const hoy = inicioDelDia(0);
  const [docentesActivos, asistenciasHoy] = await Promise.all([
    prisma.docente.findMany({
      where: { activo: true, asignaciones: { some: { activo: true } } },
      select: { id: true },
    }),
    prisma.asistenciaDocente.findMany({
      where: { fecha: hoy },
      select: { docente_id: true },
    }),
  ]);
  const yaRegistrados = new Set(asistenciasHoy.map((a) => a.docente_id));
  const docentesPendientes = docentesActivos.filter((d) => !yaRegistrados.has(d.id));

  for (const docente of docentesPendientes) {
    await NotificacionService.notificarEvento({
      evento: NotificationEvents.ASISTENCIA_PENDIENTE,
      actor:  SISTEMA_ACTOR,
      contexto: { docenteId: docente.id },
    });
  }

  return NextResponse.json({
    success: true,
    pagos_por_vencer_notificados: pagosPorVencer.length,
    docentes_notificados: docentesPendientes.length,
  });
}
