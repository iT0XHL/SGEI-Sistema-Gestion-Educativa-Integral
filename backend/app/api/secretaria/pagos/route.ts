import { withRole } from '@/lib/auth';
import { ok } from '@/lib/response';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const GET = withRole(['Secretaria', 'Admin'], async () => {
  const periodo = await prisma.periodoAcademico.findFirst({ where: { activo: true } });
  if (!periodo) return ok([]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ── Query 1: alumnos + seccion/grado (todo en academic_schema) ──────────
  const alumnos = await prisma.alumno.findMany({
    where:    { periodo_id: periodo.id, activo: true },
    include:  { seccion: { include: { grado: true } } },
    orderBy:  [{ apellido_paterno: 'asc' }, { nombres: 'asc' }],
  });

  if (alumnos.length === 0) return ok([]);

  // ── Query 2: pagos + boleta (todo en financial_schema) ──────────────────
  // Se hace por separado para evitar el cross-schema include academic → financial
  // que puede fallar en Prisma con multiSchema preview.
  const alumnoIds = alumnos.map(a => a.id);
  const pagos = await prisma.pago.findMany({
    where:   { alumno_id: { in: alumnoIds }, periodo_id: periodo.id },
    include: { boleta: { select: { estado_revision: true } } },
  });

  // ── Agrupar pagos por alumno_id ─────────────────────────────────────────
  const pagosByAlumno = new Map<string, typeof pagos>();
  for (const p of pagos) {
    if (!pagosByAlumno.has(p.alumno_id)) {
      pagosByAlumno.set(p.alumno_id, []);
    }
    pagosByAlumno.get(p.alumno_id)!.push(p);
  }

  // ── Mapear respuesta ────────────────────────────────────────────────────
  const data = alumnos.map(alumno => {
    const alumPagos  = pagosByAlumno.get(alumno.id) ?? [];
    const pagados    = alumPagos.filter(p => p.estado === 'Pagado');
    const pendientes = alumPagos.filter(p => p.estado !== 'Pagado');

    const montoPagado    = pagados.reduce((s, p) => s + Number(p.monto), 0);
    const montoPendiente = pendientes.reduce((s, p) => s + Number(p.monto), 0);
    const moroso         = pendientes.some(p => p.fecha_vencimiento < today);
    const tieneBoleta    = alumPagos.some(
      p => p.boleta?.estado_revision === 'En_Revision',
    );

    const proxVenc = [...pendientes].sort(
      (a, b) => a.fecha_vencimiento.getTime() - b.fecha_vencimiento.getTime(),
    )[0];

    return {
      alumno_id:                 alumno.id,
      nombre_completo:           `${alumno.nombres} ${alumno.apellido_paterno}`,
      grado:                     alumno.seccion.grado.nombre,
      seccion:                   alumno.seccion.nombre,
      monto_total:               montoPagado + montoPendiente,
      monto_pagado:              montoPagado,
      monto_pendiente:           montoPendiente,
      cuotas_pagadas:            pagados.length,
      cuotas_total:              alumPagos.length,
      moroso,
      tiene_boleta_pendiente:    tieneBoleta,
      fecha_proxima_vencimiento: proxVenc?.fecha_vencimiento.toISOString() ?? null,
    };
  });

  return ok(data);
});
