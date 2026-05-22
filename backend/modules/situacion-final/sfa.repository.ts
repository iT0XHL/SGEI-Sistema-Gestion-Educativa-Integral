import { prisma } from '@/lib/prisma';
import { withAuditContext } from '@/lib/audit-context';
import type { UpsertSfaInput, ListarSfaFilter } from './sfa.schema';

export const SfaRepository = {
  async upsert(input: UpsertSfaInput, registradoPor: string, perfilId: string) {
    return withAuditContext(perfilId, (tx) =>
      tx.situacionFinalAlumno.upsert({
        where: {
          alumno_id_periodo_id: {
            alumno_id:  input.alumno_id,
            periodo_id: input.periodo_id,
          },
        },
        create: {
          alumno_id:                 input.alumno_id,
          periodo_id:                input.periodo_id,
          situacion_final:           input.situacion_final as never,
          numero_areas_desaprobadas: input.numero_areas_desaprobadas ?? 0,
          comportamiento:            input.comportamiento ?? null,
          motivo_retiro:             input.motivo_retiro ?? null,
          observaciones:             input.observaciones ?? null,
          registrado_por:            registradoPor,
        },
        update: {
          situacion_final:           input.situacion_final as never,
          numero_areas_desaprobadas: input.numero_areas_desaprobadas ?? 0,
          comportamiento:            input.comportamiento ?? null,
          motivo_retiro:             input.motivo_retiro ?? null,
          observaciones:             input.observaciones ?? null,
          registrado_por:            registradoPor,
          fecha_registro:            new Date(),
        },
        include: {
          alumno:      { select: { nombres: true, apellido_paterno: true, apellido_materno: true, dni: true } },
          periodo:     { select: { nombre: true } },
          registrador: { select: { rol: true } },
        },
      }),
    );
  },

  async findByAlumno(alumnoId: string, periodoId: string) {
    return prisma.situacionFinalAlumno.findUnique({
      where: {
        alumno_id_periodo_id: { alumno_id: alumnoId, periodo_id: periodoId },
      },
      include: {
        alumno:  { select: { nombres: true, apellido_paterno: true, apellido_materno: true, dni: true } },
        periodo: { select: { nombre: true } },
      },
    });
  },

  async listar(filters: ListarSfaFilter) {
    return prisma.situacionFinalAlumno.findMany({
      where: {
        ...(filters.periodoId ? { periodo_id: filters.periodoId } : {}),
        ...(filters.alumnoId  ? { alumno_id:  filters.alumnoId  } : {}),
        ...(filters.seccionId
          ? { alumno: { seccion_id: filters.seccionId } }
          : {}),
      },
      include: {
        alumno: {
          select: {
            id:               true,
            nombres:          true,
            apellido_paterno: true,
            apellido_materno: true,
            dni:              true,
            seccion_id:       true,
          },
        },
        periodo: { select: { nombre: true, anio: true } },
      },
      orderBy: [
        { alumno: { apellido_paterno: 'asc' } },
        { alumno: { apellido_materno: 'asc' } },
      ],
    });
  },

  async eliminar(alumnoId: string, periodoId: string, perfilId: string) {
    return withAuditContext(perfilId, (tx) =>
      tx.situacionFinalAlumno.delete({
        where: {
          alumno_id_periodo_id: { alumno_id: alumnoId, periodo_id: periodoId },
        },
      }),
    );
  },
};
