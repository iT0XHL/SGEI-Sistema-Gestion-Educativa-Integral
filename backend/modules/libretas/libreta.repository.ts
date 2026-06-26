import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import type { LibretaDocxMeta } from '@/word/libreta.docx.builder';

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

export interface ResumenAlumnoLibretaRow {
  alumno_id:          string;
  alumno_nombre:      string;
  total_competencias: number;
  notas_registradas:  number;
  notas_completas:    boolean;
  libreta_estado:     string | null;
  libreta_id:         string | null;
  bloquea:            boolean;
}

export interface LibretaRecord {
  id:           string;
  alumno_id:    string;
  periodo_id:   string;
  bimestre_id:  string;
  estado:       string;
  version:      number;
  bloqueada:    boolean;
}

interface SnapshotRow {
  curso_id:           string;
  curso_nombre:       string;
  competencia_id:     string;
  competencia_nombre: string;
  tipo_competencia:   string;
  bimestre_numero:    number;
  nota_vigesimal:     number | null;
  nota_literal:       string | null;
  orden_competencia:  number | null;
  observacion:        string | null;
}

export const LibretaRepository = {
  async obtener(alumnoId: string, bimestreId?: string): Promise<LibretaRow[]> {
    const rows = await prisma.$queryRaw<LibretaRow[]>`
      SELECT
        alumno_id, alumno_nombre, grado, seccion, curso, competencia,
        tipo_competencia, bimestre, nombre_bimestre, nota_vigesimal, nota_literal,
        tipo_evaluacion, observacion, cerrada, fecha_registro, bloquea_libreta
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

  async bloqueoActivo(alumnoId: string): Promise<boolean> {
    const rows = await prisma.$queryRaw<[{ bloquea: boolean }]>`
      SELECT financial_schema.fn_bloquea_libreta(${alumnoId}::uuid) AS bloquea
    `;
    return rows[0]?.bloquea ?? false;
  },

  /**
   * Refresca la vista materializada de libretas para que refleje las notas al
   * día (la MV no se actualiza sola). CONCURRENTLY no bloquea lecturas; si no es
   * posible (sin índice único), cae a un REFRESH normal.
   */
  async refrescarVista(): Promise<void> {
    try {
      await prisma.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY academic_schema.mv_libreta_alumno`;
    } catch {
      await prisma.$executeRaw`REFRESH MATERIALIZED VIEW academic_schema.mv_libreta_alumno`;
    }
  },

  /**
   * Resumen por sección: cada alumno con su avance de notas, el estado de su
   * libreta (última versión del bimestre) y si está bloqueada por deuda.
   */
  async resumenSeccion(seccionId: string, bimestreId?: string): Promise<ResumenAlumnoLibretaRow[]> {
    await LibretaRepository.refrescarVista();
    const rows = await prisma.$queryRaw<ResumenAlumnoLibretaRow[]>`
      SELECT
        a.id::text AS alumno_id,
        (a.nombres || ' ' || a.apellido_paterno || ' ' || a.apellido_materno) AS alumno_nombre,
        COALESCE(v.total, 0)::int AS total_competencias,
        COALESCE(v.registradas, 0)::int AS notas_registradas,
        (COALESCE(v.total, 0) > 0 AND COALESCE(v.registradas, 0) >= COALESCE(v.total, 0)) AS notas_completas,
        ${bimestreId
          ? Prisma.sql`(SELECT l.estado::text FROM academic_schema.libreta l WHERE l.alumno_id = a.id AND l.bimestre_id = ${bimestreId}::uuid ORDER BY l.version DESC LIMIT 1)`
          : Prisma.sql`NULL::text`} AS libreta_estado,
        ${bimestreId
          ? Prisma.sql`(SELECT l.id::text FROM academic_schema.libreta l WHERE l.alumno_id = a.id AND l.bimestre_id = ${bimestreId}::uuid ORDER BY l.version DESC LIMIT 1)`
          : Prisma.sql`NULL::text`} AS libreta_id,
        financial_schema.fn_bloquea_libreta(a.id) AS bloquea
      FROM academic_schema.alumno a
      LEFT JOIN LATERAL (
        SELECT count(*) AS total, count(ml.nota_vigesimal) AS registradas
        FROM academic_schema.mv_libreta_alumno ml
        WHERE ml.alumno_id = a.id
          ${bimestreId ? Prisma.sql`AND ml.bimestre = (SELECT numero FROM academic_schema.bimestre WHERE id = ${bimestreId}::uuid)` : Prisma.sql``}
      ) v ON true
      WHERE a.seccion_id = ${seccionId}::uuid AND a.activo = true
      ORDER BY a.apellido_paterno, a.apellido_materno
    `;
    return rows.map((r) => ({
      ...r,
      total_competencias: Number(r.total_competencias),
      notas_registradas:  Number(r.notas_registradas),
    }));
  },

  /** Metadatos (institución + estudiante + periodos) para el .docx de la libreta. */
  async metaPdf(alumnoId: string): Promise<LibretaDocxMeta> {
    const inst = await prisma.$queryRaw<Array<{
      nombre: string | null; codigo_modular: string | null; codigo_ugel: string | null;
      nombre_ugel: string | null; departamento: string | null; modalidad: string | null;
    }>>`
      SELECT nombre, codigo_modular, codigo_ugel, nombre_ugel, departamento, modalidad
      FROM academic_schema.institucion_educativa LIMIT 1
    `;
    const al = await prisma.$queryRaw<Array<{ dni: string | null; nivel: string | null; anio: number | null }>>`
      SELECT a.dni,
             n.nombre AS nivel,
             p."año"  AS anio
      FROM academic_schema.alumno a
      JOIN academic_schema.seccion s   ON s.id = a.seccion_id
      JOIN academic_schema.grado g     ON g.id = s.grado_id
      JOIN academic_schema.nivel n     ON n.id = g.nivel_id
      JOIN academic_schema.periodo_academico p ON p.id = a.periodo_id
      WHERE a.id = ${alumnoId}::uuid
      LIMIT 1
    `;
    const periodos = await prisma.$queryRaw<Array<{ numero: number }>>`
      SELECT DISTINCT bimestre AS numero
      FROM academic_schema.mv_libreta_alumno WHERE alumno_id = ${alumnoId}::uuid ORDER BY 1
    `;
    return {
      institucion: inst[0] ?? {},
      nivel: al[0]?.nivel ?? null,
      dni: al[0]?.dni ?? null,
      anio: al[0]?.anio ?? null,
      periodos: periodos.map((p) => Number(p.numero)),
    };
  },

  /** Lee las notas (con IDs) para congelarlas en la libreta. */
  async notasSnapshot(alumnoId: string, bimestreId: string): Promise<SnapshotRow[]> {
    return prisma.$queryRaw<SnapshotRow[]>`
      SELECT
        comp.curso_id::text         AS curso_id,
        c.nombre                    AS curso_nombre,
        n.competencia_id::text      AS competencia_id,
        comp.nombre                 AS competencia_nombre,
        comp.tipo                   AS tipo_competencia,
        b.numero                    AS bimestre_numero,
        n.nota_vigesimal,
        n.nota_literal::text        AS nota_literal,
        comp.orden                  AS orden_competencia,
        n.observacion
      FROM academic_schema.nota n
      JOIN academic_schema.competencia comp ON comp.id = n.competencia_id
      JOIN academic_schema.curso c          ON c.id = comp.curso_id
      JOIN academic_schema.bimestre b       ON b.id = n.bimestre_id
      WHERE n.alumno_id = ${alumnoId}::uuid AND n.bimestre_id = ${bimestreId}::uuid
      ORDER BY c.nombre, comp.orden NULLS LAST, comp.nombre
    `;
  },

  /** Última libreta (cualquier estado) del alumno para un bimestre. */
  async libretaActual(alumnoId: string, bimestreId: string): Promise<LibretaRecord | null> {
    const rows = await prisma.$queryRaw<LibretaRecord[]>`
      SELECT id::text, alumno_id::text, periodo_id::text, bimestre_id::text,
             estado::text, version, bloqueada
      FROM academic_schema.libreta
      WHERE alumno_id = ${alumnoId}::uuid AND bimestre_id = ${bimestreId}::uuid
      ORDER BY version DESC LIMIT 1
    `;
    return rows[0] ?? null;
  },

  async findLibreta(id: string): Promise<LibretaRecord | null> {
    const rows = await prisma.$queryRaw<LibretaRecord[]>`
      SELECT id::text, alumno_id::text, periodo_id::text, bimestre_id::text,
             estado::text, version, bloqueada
      FROM academic_schema.libreta WHERE id = ${id}::uuid LIMIT 1
    `;
    return rows[0] ?? null;
  },

  /**
   * Genera (snapshot) la libreta: borra las versiones previas NO finales del
   * alumno+bimestre e inserta una nueva en BORRADOR con su detalle congelado.
   */
  async crearSnapshot(input: {
    alumnoId: string; bimestreId: string; periodoId: string; generadaPor: string;
    snapshot: SnapshotRow[];
  }): Promise<LibretaRecord> {
    // Orden de curso secuencial (1,2,3…) según el orden del snapshot.
    const ordenCurso = new Map<string, number>();
    let oc = 0;
    for (const r of input.snapshot) if (!ordenCurso.has(r.curso_id)) ordenCurso.set(r.curso_id, ++oc);
    const compCounter = new Map<string, number>();

    return prisma.$transaction(async (tx) => {
      const prev = await tx.$queryRaw<[{ v: number | null }]>`
        SELECT max(version) AS v FROM academic_schema.libreta
        WHERE alumno_id = ${input.alumnoId}::uuid AND bimestre_id = ${input.bimestreId}::uuid
      `;
      const nuevaVersion = Number(prev[0]?.v ?? 0) + 1;

      // Quita versiones previas NO finales (las APROBADA/PUBLICADA se conservan).
      await tx.$executeRaw`
        DELETE FROM academic_schema.libreta_detalle WHERE libreta_id IN (
          SELECT id FROM academic_schema.libreta
          WHERE alumno_id = ${input.alumnoId}::uuid AND bimestre_id = ${input.bimestreId}::uuid
            AND estado IN ('BORRADOR','EN_REVISION','OBSERVADA'))
      `;
      await tx.$executeRaw`
        DELETE FROM academic_schema.libreta
        WHERE alumno_id = ${input.alumnoId}::uuid AND bimestre_id = ${input.bimestreId}::uuid
          AND estado IN ('BORRADOR','EN_REVISION','OBSERVADA')
      `;

      const ins = await tx.$queryRaw<[{ id: string }]>`
        INSERT INTO academic_schema.libreta
          (alumno_id, periodo_id, bimestre_id, estado, version, generada_por, fecha_generacion)
        VALUES
          (${input.alumnoId}::uuid, ${input.periodoId}::uuid, ${input.bimestreId}::uuid,
           'BORRADOR', ${nuevaVersion}, ${input.generadaPor}::uuid, now())
        RETURNING id::text AS id
      `;
      const libretaId = ins[0]!.id;

      for (const r of input.snapshot) {
        const oCurso = ordenCurso.get(r.curso_id)!;
        const cnt = (compCounter.get(r.curso_id) ?? 0) + 1;
        compCounter.set(r.curso_id, cnt);
        const oComp = r.orden_competencia ?? cnt;
        await tx.$executeRaw`
          INSERT INTO academic_schema.libreta_detalle
            (libreta_id, curso_id, curso_nombre_snapshot, competencia_id, competencia_nombre_snapshot,
             tipo_competencia, bimestre_numero, nota_vigesimal, nota_literal, orden_curso, orden_competencia, observacion)
          VALUES
            (${libretaId}::uuid, ${r.curso_id}::uuid, ${r.curso_nombre}, ${r.competencia_id}::uuid,
             ${r.competencia_nombre}, ${r.tipo_competencia}, ${r.bimestre_numero},
             ${r.nota_vigesimal},
             ${r.nota_literal ? Prisma.sql`${r.nota_literal}::academic_schema.nota_literal` : Prisma.sql`NULL`},
             ${oCurso}, ${oComp}, ${r.observacion ?? null})
        `;
      }

      const out = await tx.$queryRaw<LibretaRecord[]>`
        SELECT id::text, alumno_id::text, periodo_id::text, bimestre_id::text,
               estado::text, version, bloqueada
        FROM academic_schema.libreta WHERE id = ${libretaId}::uuid
      `;
      return out[0]!;
    });
  },

  /** Cambia el estado de la libreta y sella la fecha/responsable correspondiente. */
  async actualizarEstado(
    id: string,
    estado: 'EN_REVISION' | 'OBSERVADA' | 'APROBADA' | 'PUBLICADA' | 'ANULADA',
    user: string,
  ): Promise<LibretaRecord> {
    const sellos =
      estado === 'APROBADA'
        ? Prisma.sql`, aprobada_por = ${user}::uuid, fecha_aprobacion = now()`
        : estado === 'PUBLICADA'
          ? Prisma.sql`, publicada_por = ${user}::uuid, fecha_publicacion = now()`
          : Prisma.sql``;
    const rows = await prisma.$queryRaw<LibretaRecord[]>`
      UPDATE academic_schema.libreta
      SET estado = ${estado}::academic_schema.estado_libreta, updated_at = now() ${sellos}
      WHERE id = ${id}::uuid
      RETURNING id::text, alumno_id::text, periodo_id::text, bimestre_id::text,
                estado::text, version, bloqueada
    `;
    return rows[0]!;
  },

  /**
   * Estado de recepción de notas por (docente, curso, sección, bimestre):
   * cuántas notas se esperan vs. registradas. Base para que Secretaría sepa
   * qué cursos están listos para generar libretas.
   */
  async estadoRecepcion(filtros: {
    periodoId?: string; bimestreId?: string; nivelId?: string;
    gradoId?: string; seccionId?: string; cursoId?: string; docenteId?: string;
  }): Promise<Array<{
    docente_id: string; docente_nombre: string; curso_id: string; curso_nombre: string;
    grado: string; seccion_id: string; seccion_nombre: string;
    bimestre_numero: number; bimestre_nombre: string;
    total_alumnos: number; notas_esperadas: number; notas_registradas: number;
    cerrada: boolean; estado: string;
  }>> {
    const f = filtros;
    const rows = await prisma.$queryRaw<Array<{
      docente_id: string; docente_nombre: string; curso_id: string; curso_nombre: string;
      grado: string; seccion_id: string; seccion_nombre: string;
      bimestre_numero: number; bimestre_nombre: string;
      total_alumnos: number; notas_esperadas: number; notas_registradas: number; cerrada: boolean;
    }>>`
      SELECT
        d.id::text AS docente_id,
        (d.nombres || ' ' || d.apellido_paterno) AS docente_nombre,
        c.id::text AS curso_id, c.nombre AS curso_nombre,
        g.nombre AS grado,
        s.id::text AS seccion_id, s.nombre AS seccion_nombre,
        b.numero AS bimestre_numero, b.nombre AS bimestre_nombre,
        (SELECT count(*) FROM academic_schema.alumno al WHERE al.seccion_id = s.id AND al.activo)::int AS total_alumnos,
        ((SELECT count(*) FROM academic_schema.alumno al WHERE al.seccion_id = s.id AND al.activo)
          * (SELECT count(*) FROM academic_schema.competencia comp WHERE comp.curso_id = c.id))::int AS notas_esperadas,
        (SELECT count(*) FROM academic_schema.nota n
           JOIN academic_schema.alumno al ON al.id = n.alumno_id
           JOIN academic_schema.competencia comp ON comp.id = n.competencia_id
          WHERE al.seccion_id = s.id AND comp.curso_id = c.id AND n.bimestre_id = b.id)::int AS notas_registradas,
        COALESCE(b.cerrado, false) AS cerrada
      FROM academic_schema.asignacion_docente ad
      JOIN academic_schema.docente d ON d.id = ad.docente_id
      JOIN academic_schema.curso   c ON c.id = ad.curso_id
      JOIN academic_schema.seccion s ON s.id = ad.seccion_id
      JOIN academic_schema.grado   g ON g.id = s.grado_id
      JOIN academic_schema.bimestre b ON b.periodo_id = ad.periodo_id
      WHERE ad.activo = true
        ${f.periodoId ? Prisma.sql`AND ad.periodo_id = ${f.periodoId}::uuid` : Prisma.sql``}
        ${f.bimestreId ? Prisma.sql`AND b.id = ${f.bimestreId}::uuid` : Prisma.sql``}
        ${f.nivelId ? Prisma.sql`AND g.nivel_id = ${f.nivelId}::uuid` : Prisma.sql``}
        ${f.gradoId ? Prisma.sql`AND s.grado_id = ${f.gradoId}::uuid` : Prisma.sql``}
        ${f.seccionId ? Prisma.sql`AND s.id = ${f.seccionId}::uuid` : Prisma.sql``}
        ${f.cursoId ? Prisma.sql`AND c.id = ${f.cursoId}::uuid` : Prisma.sql``}
        ${f.docenteId ? Prisma.sql`AND d.id = ${f.docenteId}::uuid` : Prisma.sql``}
      ORDER BY g.orden, s.nombre, c.nombre, b.numero
    `;
    return rows.map((r) => {
      const esperadas = Number(r.notas_esperadas);
      const registradas = Number(r.notas_registradas);
      const estado = r.cerrada
        ? 'Cerrado por docente'
        : registradas === 0
          ? 'Pendiente'
          : registradas >= esperadas && esperadas > 0
            ? 'Completo'
            : 'Parcial';
      return {
        ...r,
        total_alumnos: Number(r.total_alumnos),
        notas_esperadas: esperadas,
        notas_registradas: registradas,
        estado,
      };
    });
  },
};
