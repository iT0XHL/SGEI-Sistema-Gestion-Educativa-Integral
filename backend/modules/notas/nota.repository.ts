import { prisma } from '@/lib/prisma';
import { withAuditContext } from '@/lib/audit-context';
import type { NotaItem, UpdateNotaInput, DesbloquearNotaInput } from './nota.schema';

export const NotaRepository = {
  async upsertBatch(notas: NotaItem[], docenteId: string, perfilId: string) {
    return withAuditContext(perfilId, async (tx) => {
      const results = [];
      for (const n of notas) {
        const result = await tx.nota.upsert({
          where: {
            alumno_id_competencia_id_bimestre_id: {
              alumno_id:      n.alumno_id,
              competencia_id: n.competencia_id,
              bimestre_id:    n.bimestre_id,
            },
          },
          update: {
            nota_vigesimal: n.nota_vigesimal,
            ...(n.tipo_evaluacion ? { tipo_evaluacion: n.tipo_evaluacion } : {}),
            ...(n.observacion !== undefined ? { observacion: n.observacion } : {}),
          },
          create: {
            alumno_id:      n.alumno_id,
            competencia_id: n.competencia_id,
            bimestre_id:    n.bimestre_id,
            docente_id:     docenteId,
            nota_vigesimal: n.nota_vigesimal,
            // Placeholder — trigger tg_set_nota_literal overrides this immediately
            nota_literal:   'C',
            tipo_evaluacion: n.tipo_evaluacion ?? 'Final',
            observacion:    n.observacion ?? null,
          },
        });
        results.push(result);
      }
      return results;
    });
  },

  async findMany(filters: {
    alumnoId?:      string;
    bimestreId?:    string;
    competenciaId?: string;
    docenteId?:     string;
    cerrada?:       boolean;
  }) {
    return prisma.nota.findMany({
      where: {
        ...(filters.alumnoId      ? { alumno_id:      filters.alumnoId }      : {}),
        ...(filters.bimestreId    ? { bimestre_id:    filters.bimestreId }    : {}),
        ...(filters.competenciaId ? { competencia_id: filters.competenciaId } : {}),
        ...(filters.docenteId     ? { docente_id:     filters.docenteId }     : {}),
        ...(filters.cerrada !== undefined ? { cerrada: filters.cerrada }      : {}),
      },
      include: {
        alumno: {
          select: { nombres: true, apellido_paterno: true, apellido_materno: true },
        },
        competencia: {
          select: {
            nombre: true,
            tipo:   true,
            curso:  { select: { id: true, nombre: true } },
          },
        },
        bimestre: { select: { nombre: true, numero: true } },
      },
      orderBy: [
        { bimestre: { numero: 'asc' } },
        { fecha_registro: 'asc' },
      ],
    });
  },

  async findOne(id: string) {
    return prisma.nota.findUnique({
      where: { id },
      include: {
        alumno:     { select: { nombres: true, apellido_paterno: true } },
        competencia: { select: { nombre: true } },
        bimestre:   { select: { nombre: true, numero: true } },
        historial:  { orderBy: { fecha: 'desc' } },
      },
    });
  },

  async update(id: string, input: UpdateNotaInput, perfilId: string) {
    return withAuditContext(perfilId, async (tx) => {
      return tx.nota.update({
        where: { id },
        data: {
          ...(input.nota_vigesimal  !== undefined ? { nota_vigesimal:  input.nota_vigesimal }  : {}),
          ...(input.tipo_evaluacion               ? { tipo_evaluacion: input.tipo_evaluacion } : {}),
          ...(input.observacion     !== undefined ? { observacion:     input.observacion }     : {}),
        },
      });
    });
  },

  async docenteTieneAcceso(docenteId: string, alumnoId: string) {
    const alumno = await prisma.alumno.findUnique({
      where:  { id: alumnoId },
      select: { seccion_id: true, periodo_id: true },
    });
    if (!alumno) return false;
    const asignacion = await prisma.asignacionDocente.findFirst({
      where: {
        docente_id: docenteId,
        seccion_id: alumno.seccion_id,
        periodo_id: alumno.periodo_id,
        activo:     true,
      },
    });
    return asignacion !== null;
  },

  /**
   * Desbloquear una nota cerrada (Admin only).
   * Requiere que el usuario de la DB sea propietario de la tabla o superuser
   * para poder deshabilitar el trigger tg_bloquear_nota_cerrada.
   * En el entorno Docker local (postgres superuser) esto funciona por defecto.
   */
  async desbloquear(
    notaId:       string,
    input:        DesbloquearNotaInput,
    modificadoPor: string,
    perfilId:     string,
  ) {
    return withAuditContext(perfilId, async (tx) => {
      const nota = await tx.nota.findUniqueOrThrow({ where: { id: notaId } });

      // Registrar historial_nota (trazabilidad MINEDU obligatoria)
      await tx.historialNota.create({
        data: {
          nota_id:          notaId,
          valor_anterior:   nota.nota_vigesimal,
          literal_anterior: nota.nota_literal,
          valor_nuevo:      input.valor_nuevo,
          // El trigger tg_set_nota_literal calculará el literal real tras el UPDATE
          literal_nuevo:    nota.nota_literal,
          modificado_por:   modificadoPor,
          motivo:           input.motivo,
        },
      });

      // Deshabilitar el trigger temporalmente para el UPDATE administrativo.
      // Nota: ALTER TABLE DISABLE TRIGGER es transaccional en PostgreSQL.
      await tx.$executeRaw`ALTER TABLE academic_schema.nota DISABLE TRIGGER tg_bloquear_nota_cerrada`;
      await tx.$executeRaw`
        UPDATE academic_schema.nota
        SET nota_vigesimal = ${input.valor_nuevo}::numeric(4,2),
            cerrada        = FALSE
        WHERE id = ${notaId}::uuid
      `;
      await tx.$executeRaw`ALTER TABLE academic_schema.nota ENABLE TRIGGER tg_bloquear_nota_cerrada`;

      return tx.nota.findUniqueOrThrow({ where: { id: notaId } });
    });
  },
};
