import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import type { BoletaData, BoletaArea, BoletaCurso, BoletaAsistencia } from './boleta.types';

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
  peso:               number;
}

export interface LibretaRowDetallada extends LibretaRow {
  curso_id:       string;
  competencia_id: string;
  area_id:        string | null;
  area_nombre:    string | null;
  area_orden:     number | null;
  peso:           number;
}

export interface CursoAgrupado {
  curso_id:     string;
  curso:        string;
  competencias: LibretaRowDetallada[];
  promedio:     number | null;
  literal:      string | null;
}

export interface AreaAgrupada {
  area_id:         string | null;
  area_nombre:     string;
  cursos:          CursoAgrupado[];
  promedioGeneral: number | null;
  literalGeneral:  string | null;
}

export interface LibretaAgrupada {
  areas:         AreaAgrupada[];
  promedioAnual: number | null;
  literalAnual:  string | null;
}

export const LibretaRepository = {
  /**
   * Notas vivas (tabla `nota`, vía mv_libreta_alumno). Si el bimestre ya fue
   * cerrado y no quedan notas "vivas" (p. ej. datos de demo sembrados
   * directo en libreta_detalle), cae al snapshot congelado más reciente
   * (`libreta` + `libreta_detalle`) para esa alumno/bimestre.
   */
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

    if (rows.length > 0) {
      return rows.map((r) => ({
        ...r,
        nota_vigesimal: r.nota_vigesimal !== null ? parseFloat(String(r.nota_vigesimal)) : null,
      }));
    }
    return LibretaRepository.obtenerDesdeSnapshot(alumnoId, bimestreId);
  },

  /** Fallback: lee el snapshot congelado más reciente por bimestre (libreta_detalle). */
  async obtenerDesdeSnapshot(alumnoId: string, bimestreId?: string): Promise<LibretaRow[]> {
    const rows = await prisma.$queryRaw<LibretaRow[]>`
      WITH ultima AS (
        SELECT DISTINCT ON (bimestre_id) id AS libreta_id, bimestre_id
        FROM academic_schema.libreta
        WHERE alumno_id = ${alumnoId}::uuid
          ${bimestreId ? Prisma.sql`AND bimestre_id = ${bimestreId}::uuid` : Prisma.sql``}
        ORDER BY bimestre_id, version DESC
      )
      SELECT
        a.id::text                                AS alumno_id,
        (a.nombres || ' ' || a.apellido_paterno)   AS alumno_nombre,
        g.nombre                                   AS grado,
        s.nombre                                   AS seccion,
        ld.curso_nombre_snapshot                   AS curso,
        ld.competencia_nombre_snapshot              AS competencia,
        ld.tipo_competencia,
        b.numero                                   AS bimestre,
        b.nombre                                   AS nombre_bimestre,
        ld.nota_vigesimal,
        ld.nota_literal::text                      AS nota_literal,
        'Final'                                    AS tipo_evaluacion,
        ld.observacion,
        true                                        AS cerrada,
        NULL::timestamptz                          AS fecha_registro,
        financial_schema.fn_bloquea_libreta(a.id)  AS bloquea_libreta
      FROM ultima u
      JOIN academic_schema.libreta_detalle ld ON ld.libreta_id = u.libreta_id
      JOIN academic_schema.alumno a           ON a.id = ${alumnoId}::uuid
      JOIN academic_schema.seccion s          ON s.id = a.seccion_id
      JOIN academic_schema.grado g            ON g.id = s.grado_id
      JOIN academic_schema.bimestre b         ON b.id = u.bimestre_id
      ORDER BY ld.orden_curso, ld.orden_competencia
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

  /**
   * Ensambla la BOLETA DE NOTAS anual completa del alumno (formato IEP Virgen
   * del Carmen — resources/LIBRETANUEVA.pdf). Es la fuente única que consumen
   * los DOS generadores: el .docx editable de Secretaría y el .pdf del Alumno.
   *
   * Notas en literal por área → curso, con 4 columnas de bimestre + anual, y
   * el desglose de asistencia (tardanzas / faltas justificadas / injustificadas)
   * por bimestre a partir de las fechas reales.
   */
  async boletaData(alumnoId: string): Promise<BoletaData> {
    const BIMS = [1, 2, 3, 4];

    // 1. Institución + alumno + tutor de la sección.
    const inst = await prisma.$queryRaw<Array<{ nombre: string | null }>>`
      SELECT nombre FROM academic_schema.institucion_educativa LIMIT 1
    `;
    const metaRows = await prisma.$queryRaw<Array<{
      alumno_nombre: string; grado: string; seccion: string; nivel: string;
      anio: number | null; dni: string | null; tutor: string | null; periodo_id: string;
    }>>`
      SELECT
        (a.nombres || ' ' || a.apellido_paterno || ' ' || a.apellido_materno) AS alumno_nombre,
        g.nombre AS grado, s.nombre AS seccion, n.nombre AS nivel,
        p."año" AS anio, a.dni, a.periodo_id::text AS periodo_id,
        CASE WHEN dt.id IS NULL THEN NULL
             ELSE (dt.nombres || ' ' || dt.apellido_paterno || ' ' || dt.apellido_materno)
        END AS tutor
      FROM academic_schema.alumno a
      JOIN academic_schema.seccion s ON s.id = a.seccion_id
      JOIN academic_schema.grado g   ON g.id = s.grado_id
      JOIN academic_schema.nivel n   ON n.id = g.nivel_id
      JOIN academic_schema.periodo_academico p ON p.id = a.periodo_id
      LEFT JOIN academic_schema.docente dt ON dt.id = s.docente_tutor_id
      WHERE a.id = ${alumnoId}::uuid
      LIMIT 1
    `;
    const m = metaRows[0];

    // 2. Notas de todos los bimestres + escala literal del período.
    const rows   = await LibretaRepository.detalleConArea(alumnoId);
    const escala = m?.periodo_id ? await LibretaRepository.escalaLiteral(m.periodo_id) : [];
    const literalDe = (nota: number | null): string | null => {
      if (nota === null) return null;
      return (
        escala.find((e) => nota >= e.rango_inferior && nota <= e.rango_superior)?.escala ??
        (nota >= 18 ? 'AD' : nota >= 14 ? 'A' : nota >= 11 ? 'B' : 'C')
      );
    };

    // 3. Rollup área → curso → bimestre (promedio ponderado por peso de criterio).
    interface Acc { sumP: number; sumW: number }
    interface CursoAcc { curso: string; bim: Map<number, Acc> }
    interface AreaAcc { area_nombre: string; orden: number | null; cursos: Map<string, CursoAcc> }
    const areaMap = new Map<string, AreaAcc>();

    for (const r of rows) {
      const areaKey    = r.area_id ?? `__curso_${r.curso_id}`;
      const areaNombre = r.area_nombre ?? r.curso;
      if (!areaMap.has(areaKey)) areaMap.set(areaKey, { area_nombre: areaNombre, orden: r.area_orden, cursos: new Map() });
      const area = areaMap.get(areaKey)!;
      if (!area.cursos.has(r.curso_id)) area.cursos.set(r.curso_id, { curso: r.curso, bim: new Map() });
      const curso = area.cursos.get(r.curso_id)!;
      if (r.nota_vigesimal !== null) {
        const acc = curso.bim.get(r.bimestre) ?? { sumP: 0, sumW: 0 };
        acc.sumP += r.nota_vigesimal * r.peso;
        acc.sumW += r.peso;
        curso.bim.set(r.bimestre, acc);
      }
    }

    const promVig  = (acc?: Acc): number | null => (acc && acc.sumW > 0 ? acc.sumP / acc.sumW : null);
    const promedio = (vals: (number | null)[]): number | null => {
      const ok = vals.filter((v): v is number => v !== null);
      return ok.length ? ok.reduce((a, b) => a + b, 0) / ok.length : null;
    };

    // Orden pedagógico por area_academica.orden (áreas sin orden / bandas de un
    // curso suelto van al final, conservando su orden de aparición).
    const areasOrdenadas = [...areaMap.values()].sort(
      (a, b) => (a.orden ?? 9999) - (b.orden ?? 9999),
    );

    const areas: BoletaArea[] = areasOrdenadas.map((area) => {
      const cursos: BoletaCurso[] = [...area.cursos.values()].map((c) => {
        const literalPorBim: Record<number, string | null> = {};
        const vigPorBim: (number | null)[] = [];
        for (const b of BIMS) {
          const v = promVig(c.bim.get(b));
          vigPorBim.push(v);
          literalPorBim[b] = literalDe(v);
        }
        return { curso: c.curso, literalPorBim, literalAnual: literalDe(promedio(vigPorBim)) };
      });

      const generalPorBim: Record<number, string | null> = {};
      const areaVigPorBim: (number | null)[] = [];
      for (const b of BIMS) {
        const av = promedio([...area.cursos.values()].map((c) => promVig(c.bim.get(b))));
        areaVigPorBim.push(av);
        generalPorBim[b] = literalDe(av);
      }
      return {
        area_nombre: area.area_nombre,
        cursos,
        tienePromedioGeneral: area.cursos.size > 1,
        generalPorBim,
        generalAnual: literalDe(promedio(areaVigPorBim)),
      };
    });

    // 4. Asistencia por bimestre (corte por fechas reales del bimestre).
    const asistRows = m?.periodo_id
      ? await prisma.$queryRaw<Array<{ bimestre: number; tardanza: number; faltas_just: number; faltas_injust: number }>>`
          SELECT b.numero AS bimestre,
            count(a.id) FILTER (WHERE a.estado = 'T')::int AS tardanza,
            count(a.id) FILTER (WHERE a.estado = 'J')::int AS faltas_just,
            count(a.id) FILTER (WHERE a.estado = 'F')::int AS faltas_injust
          FROM academic_schema.bimestre b
          LEFT JOIN academic_schema.asistencia a
            ON a.alumno_id = ${alumnoId}::uuid
           AND a.fecha BETWEEN b.fecha_inicio AND b.fecha_fin
          WHERE b.periodo_id = ${m.periodo_id}::uuid
          GROUP BY b.numero ORDER BY b.numero
        `
      : [];
    const asistencia: BoletaAsistencia[] = BIMS.map((b) => {
      const row = asistRows.find((x) => Number(x.bimestre) === b);
      return {
        bimestre:      b,
        tardanza:      Number(row?.tardanza ?? 0),
        faltas_just:   Number(row?.faltas_just ?? 0),
        faltas_injust: Number(row?.faltas_injust ?? 0),
      };
    });

    return {
      institucion: {
        nombre:        inst[0]?.nombre ?? 'IEP Virgen del Carmen - Las Viñas',
        niveles_texto: 'INICIAL - PRIMARIA - SECUNDARIA',
      },
      alumno: {
        nombre: m?.alumno_nombre ?? '',
        salon:  [m?.grado, m?.seccion].filter(Boolean).join(' '),
        nivel:  (m?.nivel ?? '').toUpperCase(),
        dni:    m?.dni ?? null,
      },
      tutor:      m?.tutor ?? null,
      anio:       m?.anio ?? new Date().getFullYear(),
      bimestres:  BIMS,
      areas,
      asistencia,
    };
  },

  /** Lee las notas (con IDs) para congelarlas en la libreta. */
  async notasSnapshot(alumnoId: string, bimestreId: string): Promise<SnapshotRow[]> {
    const rows = await prisma.$queryRaw<SnapshotRow[]>`
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
        n.observacion,
        comp.peso                   AS peso
      FROM academic_schema.nota n
      JOIN academic_schema.competencia comp ON comp.id = n.competencia_id
      JOIN academic_schema.curso c          ON c.id = comp.curso_id
      JOIN academic_schema.bimestre b       ON b.id = n.bimestre_id
      WHERE n.alumno_id = ${alumnoId}::uuid AND n.bimestre_id = ${bimestreId}::uuid
      ORDER BY c.nombre, comp.orden NULLS LAST, comp.nombre
    `;
    return rows.map((r) => ({ ...r, peso: Number(r.peso) }));
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

    // Promedio ponderado por curso (criterio → curso): sum(nota*peso)/sum(peso).
    // Se persiste en calificativo_area (columna existente, antes siempre NULL).
    const pesoAcumulado = new Map<string, { sumPonderada: number; sumPeso: number }>();
    for (const r of input.snapshot) {
      if (r.nota_vigesimal === null) continue;
      const acc = pesoAcumulado.get(r.curso_id) ?? { sumPonderada: 0, sumPeso: 0 };
      acc.sumPonderada += r.nota_vigesimal * r.peso;
      acc.sumPeso += r.peso;
      pesoAcumulado.set(r.curso_id, acc);
    }
    const promedioCurso = new Map<string, number>();
    for (const [cursoId, acc] of pesoAcumulado) {
      if (acc.sumPeso > 0) promedioCurso.set(cursoId, Math.round((acc.sumPonderada / acc.sumPeso) * 100) / 100);
    }

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
        const calificativoArea = promedioCurso.get(r.curso_id) ?? null;
        await tx.$executeRaw`
          INSERT INTO academic_schema.libreta_detalle
            (libreta_id, curso_id, curso_nombre_snapshot, competencia_id, competencia_nombre_snapshot,
             tipo_competencia, bimestre_numero, nota_vigesimal, nota_literal, calificativo_area, orden_curso, orden_competencia, observacion)
          VALUES
            (${libretaId}::uuid, ${r.curso_id}::uuid, ${r.curso_nombre}, ${r.competencia_id}::uuid,
             ${r.competencia_nombre}, ${r.tipo_competencia}, ${r.bimestre_numero},
             ${r.nota_vigesimal},
             ${r.nota_literal ? Prisma.sql`${r.nota_literal}::academic_schema.nota_literal` : Prisma.sql`NULL`},
             ${calificativoArea},
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

  /**
   * Detalle en vivo (no depende de la MV) con curso_id/competencia_id/peso y el
   * área académica de cada curso — base para el rollup de 3 niveles de
   * obtenerAgrupado(). No modifica mv_libreta_alumno.
   */
  async detalleConArea(alumnoId: string, bimestreId?: string): Promise<LibretaRowDetallada[]> {
    const rows = await prisma.$queryRaw<LibretaRowDetallada[]>`
      SELECT
        a.id::text                                          AS alumno_id,
        (a.nombres || ' ' || a.apellido_paterno)             AS alumno_nombre,
        g.nombre                                             AS grado,
        s.nombre                                             AS seccion,
        c.id::text                                           AS curso_id,
        c.nombre                                             AS curso,
        comp.id::text                                        AS competencia_id,
        comp.nombre                                          AS competencia,
        comp.tipo                                            AS tipo_competencia,
        comp.peso::float                                     AS peso,
        area.id::text                                        AS area_id,
        area.nombre                                          AS area_nombre,
        area.orden                                           AS area_orden,
        b.numero                                             AS bimestre,
        b.nombre                                             AS nombre_bimestre,
        n.nota_vigesimal,
        n.nota_literal::text                                 AS nota_literal,
        n.tipo_evaluacion::text                              AS tipo_evaluacion,
        n.observacion,
        n.cerrada,
        n.fecha_registro,
        financial_schema.fn_bloquea_libreta(a.id)            AS bloquea_libreta
      FROM academic_schema.nota n
      JOIN academic_schema.alumno a           ON a.id = n.alumno_id
      JOIN academic_schema.seccion s          ON s.id = a.seccion_id
      JOIN academic_schema.grado g            ON g.id = s.grado_id
      JOIN academic_schema.competencia comp   ON comp.id = n.competencia_id
      JOIN academic_schema.curso c            ON c.id = comp.curso_id
      LEFT JOIN academic_schema.area_academica area ON area.id = c.area_academica_id
      JOIN academic_schema.bimestre b         ON b.id = n.bimestre_id
      WHERE a.id = ${alumnoId}::uuid
        ${bimestreId ? Prisma.sql`AND n.bimestre_id = ${bimestreId}::uuid` : Prisma.sql``}
      ORDER BY c.nombre, comp.orden NULLS LAST, comp.nombre, b.numero
    `;
    const mapped = rows.map((r) => ({
      ...r,
      nota_vigesimal: r.nota_vigesimal !== null ? parseFloat(String(r.nota_vigesimal)) : null,
      peso: Number(r.peso),
      area_orden: r.area_orden !== null ? Number(r.area_orden) : null,
    }));
    if (mapped.length > 0) return mapped;
    return LibretaRepository.detalleConAreaSnapshot(alumnoId, bimestreId);
  },

  /** Fallback de detalleConArea: snapshot congelado más reciente por bimestre. */
  async detalleConAreaSnapshot(alumnoId: string, bimestreId?: string): Promise<LibretaRowDetallada[]> {
    const rows = await prisma.$queryRaw<LibretaRowDetallada[]>`
      WITH ultima AS (
        SELECT DISTINCT ON (bimestre_id) id AS libreta_id, bimestre_id
        FROM academic_schema.libreta
        WHERE alumno_id = ${alumnoId}::uuid
          ${bimestreId ? Prisma.sql`AND bimestre_id = ${bimestreId}::uuid` : Prisma.sql``}
        ORDER BY bimestre_id, version DESC
      )
      SELECT
        a.id::text                                 AS alumno_id,
        (a.nombres || ' ' || a.apellido_paterno)    AS alumno_nombre,
        g.nombre                                    AS grado,
        s.nombre                                    AS seccion,
        ld.curso_id::text                           AS curso_id,
        ld.curso_nombre_snapshot                    AS curso,
        ld.competencia_id::text                     AS competencia_id,
        ld.competencia_nombre_snapshot               AS competencia,
        ld.tipo_competencia,
        COALESCE(comp.peso::float, 100)             AS peso,
        area.id::text                               AS area_id,
        area.nombre                                 AS area_nombre,
        area.orden                                  AS area_orden,
        b.numero                                    AS bimestre,
        b.nombre                                    AS nombre_bimestre,
        ld.nota_vigesimal,
        ld.nota_literal::text                       AS nota_literal,
        'Final'                                     AS tipo_evaluacion,
        ld.observacion,
        true                                         AS cerrada,
        NULL::timestamptz                           AS fecha_registro,
        financial_schema.fn_bloquea_libreta(a.id)   AS bloquea_libreta
      FROM ultima u
      JOIN academic_schema.libreta_detalle ld ON ld.libreta_id = u.libreta_id
      JOIN academic_schema.alumno a           ON a.id = ${alumnoId}::uuid
      JOIN academic_schema.seccion s          ON s.id = a.seccion_id
      JOIN academic_schema.grado g            ON g.id = s.grado_id
      JOIN academic_schema.bimestre b         ON b.id = u.bimestre_id
      LEFT JOIN academic_schema.competencia comp ON comp.id = ld.competencia_id
      LEFT JOIN academic_schema.curso cur        ON cur.id = ld.curso_id
      LEFT JOIN academic_schema.area_academica area ON area.id = cur.area_academica_id
      ORDER BY ld.orden_curso, ld.orden_competencia
    `;
    return rows.map((r) => ({
      ...r,
      nota_vigesimal: r.nota_vigesimal !== null ? parseFloat(String(r.nota_vigesimal)) : null,
      peso: Number(r.peso),
      area_orden: r.area_orden !== null ? Number(r.area_orden) : null,
    }));
  },

  /** Escala AD/A/B/C configurada para el período (para no hardcodear cortes). */
  async escalaLiteral(periodoId: string): Promise<Array<{ escala: string; rango_inferior: number; rango_superior: number }>> {
    const rows = await prisma.$queryRaw<Array<{ escala: string; rango_inferior: unknown; rango_superior: unknown }>>`
      SELECT escala::text, rango_inferior, rango_superior
      FROM academic_schema.config_escala_literal WHERE periodo_id = ${periodoId}::uuid
    `;
    return rows.map((r) => ({
      escala: r.escala,
      rango_inferior: Number(r.rango_inferior),
      rango_superior: Number(r.rango_superior),
    }));
  },

  /**
   * Rollup de 3 niveles: criterio (competencia, ponderado por peso) → curso →
   * área académica (promedio simple de sus cursos) → anual (promedio simple de
   * las áreas a través de los bimestres disponibles). Cursos sin área asignada
   * (los 8 genéricos viejos + los que el admin deje independientes) se
   * renderizan como su propia banda, usando el nombre del curso — así la
   * libreta histórica de Bimestre I no cambia visualmente en nada.
   */
  async obtenerAgrupado(alumnoId: string, bimestreId?: string): Promise<LibretaAgrupada> {
    const rows = await LibretaRepository.detalleConArea(alumnoId, bimestreId);
    if (rows.length === 0) return { areas: [], promedioAnual: null, literalAnual: null };

    const periodoRow = await prisma.$queryRaw<Array<{ periodo_id: string }>>`
      SELECT periodo_id::text FROM academic_schema.alumno WHERE id = ${alumnoId}::uuid
    `;
    const periodoId = periodoRow[0]?.periodo_id;
    const escala = periodoId ? await LibretaRepository.escalaLiteral(periodoId) : [];
    const literalDe = (nota: number | null): string | null => {
      if (nota === null) return null;
      return escala.find((e) => nota >= e.rango_inferior && nota <= e.rango_superior)?.escala ?? null;
    };

    const cursosMap = new Map<string, LibretaRowDetallada[]>();
    for (const r of rows) {
      if (!cursosMap.has(r.curso_id)) cursosMap.set(r.curso_id, []);
      cursosMap.get(r.curso_id)!.push(r);
    }

    const cursos: CursoAgrupado[] = [...cursosMap.entries()].map(([cursoId, competencias]) => {
      let sumPonderada = 0;
      let sumPeso = 0;
      for (const c of competencias) {
        if (c.nota_vigesimal === null) continue;
        sumPonderada += c.nota_vigesimal * c.peso;
        sumPeso += c.peso;
      }
      const promedio = sumPeso > 0 ? Math.round((sumPonderada / sumPeso) * 100) / 100 : null;
      return {
        curso_id: cursoId,
        curso: competencias[0]!.curso,
        competencias,
        promedio,
        literal: literalDe(promedio),
      };
    });

    const areasMap = new Map<string, { area_id: string | null; area_nombre: string; cursos: CursoAgrupado[] }>();
    for (const curso of cursos) {
      const original = curso.competencias[0]!;
      const key = original.area_id ?? `__curso_${curso.curso_id}`;
      const nombre = original.area_nombre ?? curso.curso;
      if (!areasMap.has(key)) areasMap.set(key, { area_id: original.area_id, area_nombre: nombre, cursos: [] });
      areasMap.get(key)!.cursos.push(curso);
    }

    const areas: AreaAgrupada[] = [...areasMap.values()].map((a) => {
      const proms = a.cursos.map((c) => c.promedio).filter((n): n is number => n !== null);
      const promedioGeneral = proms.length > 0 ? Math.round((proms.reduce((x, y) => x + y, 0) / proms.length) * 100) / 100 : null;
      return { ...a, promedioGeneral, literalGeneral: literalDe(promedioGeneral) };
    });

    const promsArea = areas.map((a) => a.promedioGeneral).filter((n): n is number => n !== null);
    const promedioAnual = promsArea.length > 0 ? Math.round((promsArea.reduce((x, y) => x + y, 0) / promsArea.length) * 100) / 100 : null;

    return { areas, promedioAnual, literalAnual: literalDe(promedioAnual) };
  },
};
