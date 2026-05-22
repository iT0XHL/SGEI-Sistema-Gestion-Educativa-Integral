// ============================================================
//  modules/academic/academic.repository.ts
//  Acceso a datos de la estructura académica (academic_schema).
//  Estas tablas NO tienen triggers de auditoría, por lo que no
//  requieren withAuditContext.
//  Excepción técnica: `horario` usa SQL crudo para manejar el
//  tipo TIME y dejar que el trigger tg_validar_cruce_horario
//  valide los cruces.
// ============================================================
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

// ── Institución ───────────────────────────────────────────────
export const InstitucionRepo = {
  getActiva() {
    return prisma.institucionEducativa.findFirst({
      where: { activo: true },
      orderBy: { created_at: 'asc' },
    });
  },
  findById(id: string) {
    return prisma.institucionEducativa.findUnique({ where: { id } });
  },
  update(id: string, data: Prisma.InstitucionEducativaUpdateInput) {
    return prisma.institucionEducativa.update({ where: { id }, data });
  },
};

// ── Período académico ─────────────────────────────────────────
export const PeriodoRepo = {
  list() {
    return prisma.periodoAcademico.findMany({ orderBy: { anio: 'desc' } });
  },
  findById(id: string) {
    return prisma.periodoAcademico.findUnique({ where: { id } });
  },
  findByAnio(anio: number) {
    return prisma.periodoAcademico.findUnique({ where: { anio } });
  },
  create(data: Prisma.PeriodoAcademicoCreateInput) {
    return prisma.periodoAcademico.create({ data });
  },
  /** El trigger tg_un_periodo_activo desactiva los demás períodos. */
  activar(id: string) {
    return prisma.periodoAcademico.update({
      where: { id },
      data: { activo: true },
    });
  },
};

// ── Bimestre ──────────────────────────────────────────────────
export const BimestreRepo = {
  list(periodoId?: string) {
    return prisma.bimestre.findMany({
      where: periodoId ? { periodo_id: periodoId } : undefined,
      orderBy: [{ periodo_id: 'asc' }, { numero: 'asc' }],
    });
  },
  findById(id: string) {
    return prisma.bimestre.findUnique({ where: { id } });
  },
  create(data: Prisma.BimestreUncheckedCreateInput) {
    return prisma.bimestre.create({ data });
  },
  update(id: string, data: Prisma.BimestreUpdateInput) {
    return prisma.bimestre.update({ where: { id }, data });
  },
  /** El trigger tg_cerrar_notas_bimestre cierra las notas asociadas. */
  cerrar(id: string) {
    return prisma.bimestre.update({ where: { id }, data: { cerrado: true } });
  },
};

// ── Escala literal ────────────────────────────────────────────
export const EscalaRepo = {
  listByPeriodo(periodoId: string) {
    return prisma.configEscalaLiteral.findMany({
      where: { periodo_id: periodoId },
      orderBy: { rango_inferior: 'asc' },
    });
  },
  /** Reemplaza las 4 filas de escala del período de forma atómica. */
  upsertMany(
    periodoId: string,
    escalas: Array<{ escala: 'AD' | 'A' | 'B' | 'C'; rango_inferior: number; rango_superior: number }>,
  ) {
    return prisma.$transaction(
      escalas.map((e) =>
        prisma.configEscalaLiteral.upsert({
          where: { periodo_id_escala: { periodo_id: periodoId, escala: e.escala } },
          create: {
            periodo_id: periodoId,
            escala: e.escala,
            rango_inferior: e.rango_inferior,
            rango_superior: e.rango_superior,
          },
          update: {
            rango_inferior: e.rango_inferior,
            rango_superior: e.rango_superior,
          },
        }),
      ),
    );
  },
};

// ── Nivel ─────────────────────────────────────────────────────
export const NivelRepo = {
  list() {
    return prisma.nivel.findMany({ orderBy: { nombre: 'asc' } });
  },
  findById(id: string) {
    return prisma.nivel.findUnique({ where: { id } });
  },
  create(data: Prisma.NivelCreateInput) {
    return prisma.nivel.create({ data });
  },
};

// ── Grado ─────────────────────────────────────────────────────
export const GradoRepo = {
  list(nivelId?: string) {
    return prisma.grado.findMany({
      where: nivelId ? { nivel_id: nivelId } : undefined,
      orderBy: [{ nivel_id: 'asc' }, { orden: 'asc' }],
      include: { nivel: { select: { nombre: true } } },
    });
  },
  findById(id: string) {
    return prisma.grado.findUnique({ where: { id } });
  },
  create(data: Prisma.GradoUncheckedCreateInput) {
    return prisma.grado.create({ data });
  },
};

// ── Sección ───────────────────────────────────────────────────
export const SeccionRepo = {
  list(filters: { periodoId?: string; gradoId?: string }) {
    return prisma.seccion.findMany({
      where: {
        ...(filters.periodoId ? { periodo_id: filters.periodoId } : {}),
        ...(filters.gradoId ? { grado_id: filters.gradoId } : {}),
      },
      orderBy: { nombre: 'asc' },
      include: {
        grado: {
          select: {
            id:    true,
            nombre: true,
            orden:  true,
            nivel:  { select: { id: true, nombre: true } },
          },
        },
      },
    });
  },
  findById(id: string) {
    return prisma.seccion.findUnique({ where: { id } });
  },
  create(data: Prisma.SeccionUncheckedCreateInput) {
    return prisma.seccion.create({ data });
  },
};

// ── Curso ─────────────────────────────────────────────────────
export const CursoRepo = {
  list(nivelId?: string) {
    return prisma.curso.findMany({
      where: nivelId ? { nivel_id: nivelId } : undefined,
      orderBy: { nombre: 'asc' },
      include: { nivel: { select: { nombre: true } } },
    });
  },
  findById(id: string) {
    return prisma.curso.findUnique({ where: { id } });
  },
  create(data: Prisma.CursoUncheckedCreateInput) {
    return prisma.curso.create({ data });
  },
  update(id: string, data: Prisma.CursoUpdateInput) {
    return prisma.curso.update({ where: { id }, data });
  },
};

// ── Competencia ───────────────────────────────────────────────
export const CompetenciaRepo = {
  list(cursoId?: string) {
    return prisma.competencia.findMany({
      where: cursoId ? { curso_id: cursoId } : undefined,
      orderBy: [{ curso_id: 'asc' }, { orden: 'asc' }],
    });
  },
  findById(id: string) {
    return prisma.competencia.findUnique({ where: { id } });
  },
  create(data: Prisma.CompetenciaUncheckedCreateInput) {
    return prisma.competencia.create({ data });
  },
  update(id: string, data: Prisma.CompetenciaUpdateInput) {
    return prisma.competencia.update({ where: { id }, data });
  },
  delete(id: string) {
    return prisma.competencia.delete({ where: { id } });
  },
  reordenar(items: Array<{ id: string; orden: number }>) {
    return prisma.$transaction(
      items.map((it) =>
        prisma.competencia.update({ where: { id: it.id }, data: { orden: it.orden } }),
      ),
    );
  },
};

// ── Asignación docente ────────────────────────────────────────
export const AsignacionRepo = {
  list(filters: { periodoId?: string; seccionId?: string; docenteId?: string }) {
    return prisma.asignacionDocente.findMany({
      where: {
        activo: true,
        ...(filters.periodoId ? { periodo_id: filters.periodoId } : {}),
        ...(filters.seccionId ? { seccion_id: filters.seccionId } : {}),
        ...(filters.docenteId ? { docente_id: filters.docenteId } : {}),
      },
      include: {
        docente: { select: { id: true, nombres: true, apellido_paterno: true } },
        curso: { select: { id: true, nombre: true } },
        seccion: { select: { id: true, nombre: true } },
      },
    });
  },
  findById(id: string) {
    return prisma.asignacionDocente.findUnique({ where: { id } });
  },
  create(data: Prisma.AsignacionDocenteUncheckedCreateInput) {
    return prisma.asignacionDocente.create({ data });
  },
  /** Baja lógica de la asignación. */
  desactivar(id: string) {
    return prisma.asignacionDocente.update({
      where: { id },
      data: { activo: false },
    });
  },
};

// ── Horario ───────────────────────────────────────────────────
// El tipo TIME se maneja con SQL crudo: el INSERT dispara el
// trigger tg_validar_cruce_horario (puede lanzar RAISE EXCEPTION).
interface HorarioRow {
  id: string;
  asignacion_id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  aula: string | null;
  curso: string;
  seccion: string;
  docente: string;
}

export const HorarioRepo = {
  list(filters: { periodoId?: string; seccionId?: string; docenteId?: string }) {
    return prisma.$queryRaw<HorarioRow[]>`
      SELECT h.id, h.asignacion_id, h.dia_semana,
             to_char(h.hora_inicio, 'HH24:MI') AS hora_inicio,
             to_char(h.hora_fin,    'HH24:MI') AS hora_fin,
             h.aula,
             c.nombre  AS curso,
             s.nombre  AS seccion,
             d.nombres || ' ' || d.apellido_paterno AS docente
      FROM   academic_schema.horario             h
      JOIN   academic_schema.asignacion_docente  ad ON ad.id = h.asignacion_id
      JOIN   academic_schema.curso               c  ON c.id  = ad.curso_id
      JOIN   academic_schema.seccion             s  ON s.id  = ad.seccion_id
      JOIN   academic_schema.docente             d  ON d.id  = ad.docente_id
      WHERE  (${filters.periodoId ?? null}::uuid IS NULL OR ad.periodo_id = ${filters.periodoId ?? null}::uuid)
        AND  (${filters.seccionId ?? null}::uuid IS NULL OR ad.seccion_id = ${filters.seccionId ?? null}::uuid)
        AND  (${filters.docenteId ?? null}::uuid IS NULL OR ad.docente_id = ${filters.docenteId ?? null}::uuid)
      ORDER  BY h.dia_semana, h.hora_inicio
    `;
  },

  async create(input: {
    asignacionId: string;
    diaSemana: number;
    horaInicio: string;
    horaFin: string;
    aula: string | null;
  }): Promise<{ id: string }> {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO academic_schema.horario
        (asignacion_id, dia_semana, hora_inicio, hora_fin, aula)
      VALUES (
        ${input.asignacionId}::uuid,
        ${input.diaSemana}::smallint,
        ${input.horaInicio}::time,
        ${input.horaFin}::time,
        ${input.aula}
      )
      RETURNING id
    `;
    return rows[0]!;
  },

  async update(id: string, input: {
    diaSemana?: number;
    horaInicio?: string;
    horaFin?: string;
    aula?: string | null;
  }): Promise<{ id: string }> {
    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (input.diaSemana !== undefined) {
      updates.push(`dia_semana = $${params.length + 1}::smallint`);
      params.push(input.diaSemana);
    }
    if (input.horaInicio !== undefined) {
      updates.push(`hora_inicio = $${params.length + 1}::time`);
      params.push(input.horaInicio);
    }
    if (input.horaFin !== undefined) {
      updates.push(`hora_fin = $${params.length + 1}::time`);
      params.push(input.horaFin);
    }
    if (input.aula !== undefined) {
      updates.push(`aula = $${params.length + 1}`);
      params.push(input.aula);
    }

    if (updates.length === 0) {
      return { id };
    }

    params.push(id);
    const query = `UPDATE academic_schema.horario SET ${updates.join(', ')} WHERE id = $${params.length}::uuid RETURNING id`;
    const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(query, ...params);
    return rows[0] || { id };
  },

  delete(id: string) {
    return prisma.horario.delete({ where: { id } });
  },
};
