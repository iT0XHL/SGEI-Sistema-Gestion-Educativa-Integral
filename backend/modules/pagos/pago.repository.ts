import { prisma } from '@/lib/prisma';
import { withAuditContext } from '@/lib/audit-context';
import { Prisma } from '@prisma/client';
import type { CreatePagoInput } from './pago.schema';

export interface EstadoPagoRow {
  alumno_id:          string;
  alumno_nombre:      string;
  grado:              string;
  seccion:            string;
  pago_id:            string;
  concepto:           string;
  mes:                number | null;
  monto:              number;
  estado:             string;
  fecha_vencimiento:  string;
  fecha_pago:         string | null;
  estado_boleta:      string | null;
  observacion_rechazo: string | null;
}

export const PagoRepository = {
  async create(input: CreatePagoInput, generadoPor: string, perfilId: string) {
    return withAuditContext(perfilId, async (tx) => {
      return tx.pago.create({
        data: {
          alumno_id:         input.alumno_id,
          concepto_id:       input.concepto_id,
          periodo_id:        input.periodo_id,
          mes:               input.mes ?? null,
          monto:             input.monto,
          fecha_vencimiento: new Date(input.fecha_vencimiento),
          generado_por:      generadoPor,
        },
        include: {
          concepto: true,
          alumno:   { select: { nombres: true, apellido_paterno: true } },
        },
      });
    });
  },

  async findMany(filters: {
    alumnoId?:  string;
    periodoId?: string;
    estado?:    string;
    mes?:       number;
  }) {
    return prisma.pago.findMany({
      where: {
        ...(filters.alumnoId  ? { alumno_id:  filters.alumnoId }  : {}),
        ...(filters.periodoId ? { periodo_id: filters.periodoId } : {}),
        ...(filters.estado    ? { estado: filters.estado as never } : {}),
        ...(filters.mes !== undefined ? { mes: filters.mes }   : {}),
      },
      include: {
        concepto: { select: { nombre: true, monto_base: true } },
        alumno:   { select: { nombres: true, apellido_paterno: true, seccion_id: true } },
        boleta:   true,
      },
      orderBy: [{ mes: 'asc' }, { fecha_vencimiento: 'asc' }],
    });
  },

  async findOne(id: string) {
    return prisma.pago.findUnique({
      where: { id },
      include: {
        concepto: true,
        alumno:   { select: { nombres: true, apellido_paterno: true } },
        boleta:   true,
      },
    });
  },

  async estadoPagosAlumno(alumnoId: string): Promise<EstadoPagoRow[]> {
    const rows = await prisma.$queryRaw<EstadoPagoRow[]>`
      SELECT
        alumno_id,
        alumno_nombre,
        grado,
        seccion,
        pago_id,
        concepto,
        mes,
        monto::float   AS monto,
        estado,
        fecha_vencimiento::text,
        fecha_pago::text,
        estado_boleta,
        observacion_rechazo
      FROM financial_schema.v_estado_pagos_alumno
      WHERE alumno_id = ${Prisma.sql`${alumnoId}::uuid`}
      ORDER BY mes ASC NULLS LAST, fecha_vencimiento ASC
    `;
    return rows;
  },

  async listarConceptos() {
    return prisma.conceptoPago.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
    });
  },
};
