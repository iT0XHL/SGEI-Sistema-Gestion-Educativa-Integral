import { withRole } from '@/lib/auth';
import { ok } from '@/lib/response';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const GET = withRole(['Secretaria', 'Admin'], async () => {
  const periodo = await prisma.periodoAcademico.findFirst({ where: { activo: true } });

  if (!periodo) {
    return ok({
      periodo: null,
      resumen_financiero: {
        vouchers_pendientes: 0,
        vouchers_aprobados:  0,
        vouchers_rechazados: 0,
        total_recaudado:     0,
        total_deuda:         0,
        alumnos_al_dia:      0,
        alumnos_con_deuda:   0,
        morosos:             0,
      },
      recaudacion_mensual: [],
      total_alumnos:       0,
      total_listos_siagie: 0,
    });
  }

  const periodoId = periodo.id;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    boletasPorEstado,
    totalRecaudado,
    totalDeuda,
    pagosPendientes,
    pagosMorosos,
    recaudacionMensual,
    totalAlumnos,
    alumnosConSiagie,
  ] = await Promise.all([
    prisma.boletaPago.groupBy({
      by:      ['estado_revision'],
      where:   { pago: { periodo_id: periodoId } },
      _count:  { _all: true },
    }),

    prisma.pago.aggregate({
      where:  { periodo_id: periodoId, estado: 'Pagado' },
      _sum:   { monto: true },
    }),

    prisma.pago.aggregate({
      where:  { periodo_id: periodoId, estado: { in: ['Pendiente', 'En_Revision'] } },
      _sum:   { monto: true },
    }),

    prisma.pago.findMany({
      where:   { periodo_id: periodoId, estado: { in: ['Pendiente', 'En_Revision'] } },
      select:  { alumno_id: true },
      distinct: ['alumno_id'],
    }),

    prisma.pago.findMany({
      where: {
        periodo_id: periodoId,
        estado: { not: 'Pagado' },
        fecha_vencimiento: { lt: today },
      },
      select:   { alumno_id: true },
      distinct: ['alumno_id'],
    }),

    prisma.pago.groupBy({
      by:       ['mes'],
      where:    { periodo_id: periodoId, estado: 'Pagado', mes: { not: null } },
      _sum:     { monto: true },
      orderBy:  { mes: 'asc' },
    }),

    prisma.alumno.count({ where: { periodo_id: periodoId, activo: true } }),

    prisma.alumno.count({
      where: { periodo_id: periodoId, activo: true, codigo_siagie: { not: null } },
    }),
  ]);

  let vouchersPendientes = 0;
  let vouchersAprobados  = 0;
  let vouchersRechazados = 0;
  for (const row of boletasPorEstado) {
    if      (row.estado_revision === 'En_Revision') vouchersPendientes = row._count._all;
    else if (row.estado_revision === 'Aprobada')    vouchersAprobados  = row._count._all;
    else if (row.estado_revision === 'Rechazada')   vouchersRechazados = row._count._all;
  }

  const alumnosConDeuda = pagosPendientes.length;
  const morosos         = pagosMorosos.length;
  const alumnosAlDia    = Math.max(0, totalAlumnos - alumnosConDeuda);

  const recaudacion = recaudacionMensual.map(r => ({
    mes:   r.mes!,
    monto: Number(r._sum.monto ?? 0),
  }));

  return ok({
    periodo: {
      id:     periodo.id,
      nombre: periodo.nombre,
      anio:   periodo.anio,
    },
    resumen_financiero: {
      vouchers_pendientes: vouchersPendientes,
      vouchers_aprobados:  vouchersAprobados,
      vouchers_rechazados: vouchersRechazados,
      total_recaudado:     Number(totalRecaudado._sum.monto ?? 0),
      total_deuda:         Number(totalDeuda._sum.monto ?? 0),
      alumnos_al_dia:      alumnosAlDia,
      alumnos_con_deuda: alumnosConDeuda,
      morosos,
    },
    recaudacion_mensual: recaudacion,
    total_alumnos: totalAlumnos,
    total_listos_siagie: alumnosConSiagie,
  });
});
