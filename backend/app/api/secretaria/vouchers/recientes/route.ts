import { withRole } from '@/lib/auth';
import { ok } from '@/lib/response';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const GET = withRole(['Secretaria', 'Admin'], async () => {
  const vouchers = await prisma.boletaPago.findMany({
    take: 5,
    orderBy: { fecha_subida: 'desc' },
    include: {
      pago: {
        include: {
          alumno: {
            select: {
              id: true,
              nombres: true,
              apellido_paterno: true,
              apellido_materno: true,
              seccion: {
                select: {
                  nombre: true,
                  grado: { select: { nombre: true } },
                },
              },
            },
          },
          concepto: { select: { nombre: true } },
        },
      },
    },
  });

  const data = vouchers.map(v => {
    const alumno  = v.pago.alumno;
    const seccion = alumno.seccion;
    const grado   = seccion.grado;
    const nombreCompleto = `${alumno.nombres} ${alumno.apellido_paterno} ${alumno.apellido_materno}`;
    return {
      id:                v.id,
      pago_id:           v.pago_id,
      url_archivo:       v.url_archivo,
      nombre_archivo:    v.nombre_archivo,
      banco:             v.banco,
      numero_operacion:  v.numero_operacion,
      estado_revision:   v.estado_revision,
      observacion_rechazo: v.observacion_rechazo,
      fecha_subida:      v.fecha_subida.toISOString(),
      fecha_revision:    v.fecha_revision?.toISOString() ?? null,
      alumno: {
        id:               alumno.id,
        nombre_completo:  nombreCompleto,
        grado_seccion:    `${grado.nombre} ${seccion.nombre}`,
      },
      concepto: v.pago.concepto.nombre,
      monto:    Number(v.pago.monto),
      mes:      v.pago.mes,
    };
  });

  return ok(data);
});
