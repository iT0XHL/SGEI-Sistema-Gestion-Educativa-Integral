import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import type { RecepcionRow } from './libreta.schema';

export interface LibretaRow {
  alumno_id:        string;
  alumno_nombre:    string;
  grado:            string;
  seccion:          string;
  curso:            string;
  competencia:      string;
  tipo_competencia: string;
  bimestre:         number;
  nombre_bimestre:  string;
  nota_vigesimal:   number | null;
  nota_literal:     string | null;
  tipo_evaluacion:  string;
  observacion:      string | null;
  cerrada:          boolean;
  fecha_registro:   Date | null;
  bloquea_libreta:  boolean;
}

export const LibretaRepository = {
  async obtener(alumnoId: string, bimestreId?: string): Promise<LibretaRow[]> {
    const rows = await prisma.$queryRaw<LibretaRow[]>`
      SELECT
        alumno_id,
        alumno_nombre,
        grado,
        seccion,
        curso,
        competencia,
        tipo_competencia,
        bimestre,
        nombre_bimestre,
        nota_vigesimal,
        nota_literal,
        tipo_evaluacion,
        observacion,
        cerrada,
        fecha_registro,
        bloquea_libreta
      FROM academic_schema.mv_libreta_alumno
      WHERE alumno_id = ${Prisma.sql`${alumnoId}::uuid`}
        ${bimestreId ? Prisma.sql`AND bimestre = (
            SELECT numero FROM academic_schema.bimestre WHERE id = ${bimestreId}::uuid
          )` : Prisma.sql``}
      ORDER BY curso, bimestre, competencia
    `;
    return rows.map((r) => ({
      ...r,
      nota_vigesimal: r.nota_vigesimal !== null ? parseFloat(String(r.nota_vigesimal)) : null,
    }));
  },

  /**
   * Contexto institucional + del estudiante para la cabecera del PDF (formato
   * MINEDU). No depende del rol: es el marco institucional de la libreta.
   */
  async metaPdf(alumnoId: string) {
    const alumno = await prisma.alumno.findUnique({
      where: { id: alumnoId },
      select: {
        dni: true,
        codigo_siagie: true,
        periodo_id: true,
        seccion: { select: { grado: { select: { nivel: { select: { nombre: true } } } } } },
      },
    });
    const institucion = await prisma.institucionEducativa.findFirst({
      where: { activo: true },
      orderBy: { created_at: 'asc' },
    });

    let anio: number | null = null;
    let periodos: number[] = [];
    if (alumno?.periodo_id) {
      const periodo = await prisma.periodoAcademico.findUnique({
        where: { id: alumno.periodo_id },
        select: { anio: true },
      });
      anio = periodo?.anio ?? null;
      const bims = await prisma.bimestre.findMany({
        where: { periodo_id: alumno.periodo_id },
        select: { numero: true },
        orderBy: { numero: 'asc' },
      });
      periodos = bims.map((b) => b.numero);
    }

    return {
      dni: alumno?.dni ?? null,
      codigo_estudiante: alumno?.codigo_siagie ?? null,
      nivel: alumno?.seccion?.grado?.nivel?.nombre ?? null,
      anio,
      periodos,
      institucion: institucion
        ? {
            nombre: institucion.nombre,
            codigo_modular: institucion.codigo_modular,
            codigo_ugel: institucion.codigo_ugel,
            nombre_ugel: institucion.nombre_ugel,
            departamento: institucion.departamento,
            modalidad: institucion.modalidad,
          }
        : undefined,
    };
  },

  async bloqueoActivo(alumnoId: string): Promise<boolean> {
    const rows = await prisma.$queryRaw<[{ bloquea: boolean }]>`
      SELECT financial_schema.fn_bloquea_libreta(${alumnoId}::uuid) AS bloquea
    `;
    return rows[0]?.bloquea ?? false;
  },

  async estadoRecepcion(filters: {
    periodoId?: string;
    bimestreId?: string;
    nivelId?: string;
    gradoId?: string;
    seccionId?: string;
    cursoId?: string;
    docenteId?: string;
  }): Promise<RecepcionRow[]> {
    // Se construyen fragmentos Prisma.sql con parámetros ENLAZADOS (evita el bug
    // anterior de $1 sin binding y previene inyección SQL).
    const conditions: Prisma.Sql[] = [];
    if (filters.periodoId)  conditions.push(Prisma.sql`b.periodo_id = ${filters.periodoId}::uuid`);
    if (filters.bimestreId) conditions.push(Prisma.sql`n.bimestre_id = ${filters.bimestreId}::uuid`);
    if (filters.seccionId)  conditions.push(Prisma.sql`a.seccion_id = ${filters.seccionId}::uuid`);
    if (filters.gradoId)    conditions.push(Prisma.sql`s.grado_id = ${filters.gradoId}::uuid`);
    if (filters.nivelId)    conditions.push(Prisma.sql`g.nivel_id = ${filters.nivelId}::uuid`);
    if (filters.cursoId)    conditions.push(Prisma.sql`comp.curso_id = ${filters.cursoId}::uuid`);
    if (filters.docenteId)  conditions.push(Prisma.sql`n.docente_id = ${filters.docenteId}::uuid`);

    const where = conditions.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
      : Prisma.empty;

    const rows = await prisma.$queryRaw<RecepcionRow[]>`
      SELECT
        d.id                             AS docente_id,
        d.nombres || ' ' || d.apellido_paterno AS docente_nombre,
        c.id                             AS curso_id,
        c.nombre                         AS curso_nombre,
        g.nombre                         AS grado,
        s.id                             AS seccion_id,
        s.nombre                         AS seccion_nombre,
        b.numero                         AS bimestre_numero,
        b.nombre                         AS bimestre_nombre,
        COUNT(DISTINCT a.id)::integer             AS total_alumnos,
        (COUNT(DISTINCT comp.id) * COUNT(DISTINCT a.id))::integer AS notas_esperadas,
        COUNT(DISTINCT n.id)::integer             AS notas_registradas,
        BOOL_OR(n.cerrada)               AS cerrada,
        CASE
          WHEN COUNT(DISTINCT n.id) = 0
            THEN 'Pendiente'
          WHEN COUNT(DISTINCT n.id) < COUNT(DISTINCT comp.id) * COUNT(DISTINCT a.id)
            THEN 'Parcial'
          WHEN BOOL_OR(n.cerrada) = TRUE
            THEN 'Cerrado por docente'
          ELSE 'Completo'
        END                              AS estado
      FROM academic_schema.asignacion_docente ad
      JOIN academic_schema.docente          d   ON d.id  = ad.docente_id
      JOIN academic_schema.curso            c   ON c.id  = ad.curso_id
      JOIN academic_schema.seccion          s   ON s.id  = ad.seccion_id
      JOIN academic_schema.grado            g   ON g.id  = s.grado_id
      JOIN academic_schema.bimestre         b   ON b.periodo_id = ad.periodo_id
      LEFT JOIN academic_schema.alumno      a   ON a.seccion_id = ad.seccion_id AND a.periodo_id = ad.periodo_id
      LEFT JOIN academic_schema.competencia comp ON comp.curso_id = ad.curso_id
      LEFT JOIN academic_schema.nota        n   ON n.alumno_id = a.id
                                               AND n.competencia_id = comp.id
                                               AND n.bimestre_id = b.id
                                               AND n.docente_id = d.id
      ${where}
      GROUP BY d.id, d.nombres, d.apellido_paterno, c.id, c.nombre, g.nombre, s.id, s.nombre, b.numero, b.nombre
      ORDER BY g.nombre, s.nombre, c.nombre, d.nombres
    `;
    return rows;
  },

  async resumenSeccion(seccionId: string, bimestreId?: string) {
    const rows = await prisma.$queryRaw<{
      alumno_id: string;
      alumno_nombre: string;
      total_competencias: number;
      notas_registradas: number;
      notas_completas: boolean;
      libreta_estado: string | null;
      libreta_id: string | null;
      bloquea: boolean;
    }[]>`
      SELECT
        a.id                    AS alumno_id,
        a.nombres || ' ' || a.apellido_paterno AS alumno_nombre,
        COUNT(DISTINCT comp.id)::integer AS total_competencias,
        COUNT(DISTINCT n.id)::integer    AS notas_registradas,
        COUNT(DISTINCT n.id) = COUNT(DISTINCT comp.id) AS notas_completas,
        l.estado::text          AS libreta_estado,
        l.id                    AS libreta_id,
        financial_schema.fn_bloquea_libreta(a.id) AS bloquea
      FROM academic_schema.alumno a
      CROSS JOIN academic_schema.competencia comp
      JOIN academic_schema.asignacion_docente ad ON ad.curso_id = comp.curso_id AND ad.seccion_id = a.seccion_id AND ad.periodo_id = a.periodo_id
      LEFT JOIN academic_schema.nota n ON n.alumno_id = a.id AND n.competencia_id = comp.id ${bimestreId ? Prisma.sql`AND n.bimestre_id = ${bimestreId}::uuid` : Prisma.sql``}
      LEFT JOIN academic_schema.libreta l ON l.alumno_id = a.id ${bimestreId ? Prisma.sql`AND l.bimestre_id = ${bimestreId}::uuid` : Prisma.sql``}
      WHERE a.seccion_id = ${seccionId}::uuid AND a.activo = TRUE
      GROUP BY a.id, a.nombres, a.apellido_paterno, l.estado, l.id
      ORDER BY a.apellido_paterno, a.nombres
    `;
    return rows;
  },

  async crearLibreta(data: {
    alumnoId: string;
    periodoId: string;
    bimestreId: string;
    generadaPor: string;
  }) {
    // Cabecera + SNAPSHOT inmutable de las notas (§10): si luego cambian las
    // notas originales, la libreta generada conserva los valores del momento.
    return prisma.$transaction(async (tx) => {
      const libreta = await tx.libreta.create({
        data: {
          alumno_id:        data.alumnoId,
          periodo_id:       data.periodoId,
          bimestre_id:      data.bimestreId,
          estado:           'BORRADOR',
          generada_por:     data.generadaPor,
          fecha_generacion: new Date(),
        },
      });

      const detalles = await tx.$queryRaw<Array<{
        curso_id: string; curso_nombre: string;
        competencia_id: string; competencia_nombre: string;
        tipo_competencia: string | null; bimestre_numero: number;
        nota_vigesimal: string | null; nota_literal: string | null;
        orden_competencia: number | null; observacion: string | null;
      }>>`
        SELECT comp.curso_id, c.nombre AS curso_nombre,
               comp.id AS competencia_id, comp.nombre AS competencia_nombre,
               comp.tipo AS tipo_competencia, b.numero AS bimestre_numero,
               n.nota_vigesimal::text AS nota_vigesimal,
               n.nota_literal::text   AS nota_literal,
               comp.orden AS orden_competencia, n.observacion
        FROM   academic_schema.nota        n
        JOIN   academic_schema.competencia comp ON comp.id = n.competencia_id
        JOIN   academic_schema.curso       c    ON c.id   = comp.curso_id
        JOIN   academic_schema.bimestre    b    ON b.id   = n.bimestre_id
        WHERE  n.alumno_id = ${data.alumnoId}::uuid
          AND  n.bimestre_id = ${data.bimestreId}::uuid
        ORDER BY c.nombre, comp.orden
      `;

      if (detalles.length > 0) {
        await tx.libretaDetalle.createMany({
          data: detalles.map((d) => ({
            libreta_id:                  libreta.id,
            curso_id:                    d.curso_id,
            curso_nombre_snapshot:       d.curso_nombre,
            competencia_id:              d.competencia_id,
            competencia_nombre_snapshot: d.competencia_nombre,
            tipo_competencia:            d.tipo_competencia ?? 'regular',
            bimestre_numero:             d.bimestre_numero,
            nota_vigesimal:              d.nota_vigesimal ?? null,
            nota_literal:                (d.nota_literal as never) ?? null,
            orden_competencia:           d.orden_competencia ?? 0,
            observacion:                 d.observacion ?? null,
          })),
        });
      }

      return libreta;
    });
  },

  /**
   * Snapshot PUBLICADO del alumno, mapeado a LibretaRow (mismo contrato que la
   * vista en vivo, pero inmutable). Se usa para servir la libreta al alumno solo
   * cuando está PUBLICADA (§14, §23).
   */
  async obtenerSnapshotPublicado(alumnoId: string, bimestreId?: string): Promise<LibretaRow[]> {
    const rows = await prisma.$queryRaw<LibretaRow[]>`
      SELECT
        l.alumno_id,
        al.nombres || ' ' || al.apellido_paterno AS alumno_nombre,
        g.nombre  AS grado,
        s.nombre  AS seccion,
        d.curso_nombre_snapshot       AS curso,
        d.competencia_nombre_snapshot AS competencia,
        d.tipo_competencia,
        d.bimestre_numero AS bimestre,
        b.nombre          AS nombre_bimestre,
        d.nota_vigesimal::text AS nota_vigesimal,
        d.nota_literal::text   AS nota_literal,
        'final'::text     AS tipo_evaluacion,
        d.observacion,
        TRUE              AS cerrada,
        l.fecha_publicacion AS fecha_registro,
        FALSE             AS bloquea_libreta
      FROM academic_schema.libreta          l
      JOIN academic_schema.libreta_detalle  d  ON d.libreta_id = l.id
      JOIN academic_schema.alumno           al ON al.id = l.alumno_id
      JOIN academic_schema.seccion          s  ON s.id  = al.seccion_id
      JOIN academic_schema.grado            g  ON g.id  = s.grado_id
      JOIN academic_schema.bimestre         b  ON b.id  = l.bimestre_id
      WHERE l.alumno_id = ${alumnoId}::uuid
        AND l.estado = 'PUBLICADA'
        ${bimestreId ? Prisma.sql`AND l.bimestre_id = ${bimestreId}::uuid` : Prisma.empty}
      ORDER BY d.orden_curso, d.curso_nombre_snapshot, d.orden_competencia
    `;
    return rows.map((r) => ({
      ...r,
      nota_vigesimal: r.nota_vigesimal !== null ? parseFloat(String(r.nota_vigesimal)) : null,
    }));
  },

  async findBimestrePeriodo(bimestreId: string) {
    return prisma.bimestre.findUnique({
      where: { id: bimestreId },
      select: { periodo_id: true, numero: true },
    });
  },

  async findLibretaByAlumnoBimestre(alumnoId: string, bimestreId: string) {
    const bimestre = await prisma.bimestre.findUniqueOrThrow({
      where: { id: bimestreId },
      select: { periodo_id: true },
    });
    return prisma.libreta.findUnique({
      where: {
        alumno_id_periodo_id_bimestre_id: {
          alumno_id:  alumnoId,
          periodo_id: bimestre.periodo_id,
          bimestre_id: bimestreId,
        },
      },
    });
  },

  async cambiarEstado(
    id: string,
    estado: string,
    usuarioId: string,
    observacion?: string | null,
  ) {
    const updateData: Record<string, unknown> = {
      estado,
      updated_at: new Date(),
    };
    if (estado === 'APROBADA') {
      updateData.aprobada_por = usuarioId;
      updateData.fecha_aprobacion = new Date();
    }
    if (estado === 'PUBLICADA') {
      updateData.publicada_por = usuarioId;
      updateData.fecha_publicacion = new Date();
    }

    await prisma.$transaction(async (tx) => {
      // Capturar el estado ANTERIOR antes de actualizar (si se lee después,
      // ya sería el nuevo y la traza quedaría incorrecta).
      const previo = await tx.libreta.findUnique({
        where:  { id },
        select: { estado: true },
      });

      await tx.libreta.update({
        where: { id },
        data:  updateData,
      });

      await tx.libretaRevision.create({
        data: {
          libreta_id:      id,
          estado_anterior: previo?.estado ?? null,
          estado_nuevo:    estado as never,
          observacion:     observacion ?? null,
          usuario_id:      usuarioId,
        },
      });
    });

    return prisma.libreta.findUnique({ where: { id } });
  },

  async listarPorSeccion(seccionId: string, bimestreId: string) {
    return prisma.libreta.findMany({
      where: {
        bimestre_id: bimestreId,
        alumno: { seccion_id: seccionId },
      },
      include: {
        alumno: {
          select: { nombres: true, apellido_paterno: true, apellido_materno: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  },

  async findById(id: string) {
    return prisma.libreta.findUnique({ where: { id } });
  },

  async docenteEnsenhaAlumno(docenteId: string, alumnoId: string, bimestreId?: string): Promise<boolean> {
    const row = await prisma.$queryRaw<[{ exists: boolean }]>`
      SELECT EXISTS (
        SELECT 1
        FROM academic_schema.asignacion_docente ad
        JOIN academic_schema.alumno a ON a.seccion_id = ad.seccion_id AND a.periodo_id = ad.periodo_id
        WHERE ad.docente_id = ${docenteId}::uuid
          AND a.id = ${alumnoId}::uuid
          ${bimestreId ? Prisma.sql`AND ad.periodo_id = (SELECT periodo_id FROM academic_schema.bimestre WHERE id = ${bimestreId}::uuid)` : Prisma.sql``}
      ) AS exists
    `;
    return row[0]?.exists ?? false;
  },
};
