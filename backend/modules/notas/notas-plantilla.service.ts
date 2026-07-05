// ============================================================
//  modules/notas/notas-plantilla.service.ts
//  Plantilla Excel de ingreso de notas por asignación (docente +
//  curso + sección + bimestre) y su reimportación con vista previa.
//
//  La plantilla se genera siempre en vivo (no es un archivo estático):
//  trae los alumnos activos de la sección y los criterios vigentes del
//  curso en ese momento, así que si se agrega/quita un alumno o un
//  criterio, la SIGUIENTE plantilla descargada ya lo refleja. La
//  reimportación vuelve a resolver todo contra la base de datos actual
//  (no confía en lo que había cuando se descargó la plantilla), así que
//  filas/columnas que ya no existen se detectan y se reportan en la
//  vista previa en vez de importarse a ciegas.
//
//  Estrategia de identificación fila/columna: la plantilla lleva 2
//  filas y 1 columna OCULTAS con los UUID reales (alumno_id por fila,
//  competencia_id por columna) — así el reimport empareja por ID, no
//  por nombre (nombres pueden repetirse o cambiar).
// ============================================================
import { prisma } from '@/lib/prisma';
import { ForbiddenError, NotFoundError, BusinessRuleError } from '@/errors/http-errors';
import { CompetenciaRepo } from '@/modules/academic/academic.repository';
import type { JwtClaims } from '@/lib/jwt';

const FILA_META = 1;
const FILA_COMP_IDS = 2;
const FILA_HEADER = 3;
const FILA_DATA_START = 4;
const COL_ALUMNO_ID = 1; // A (oculta)
const COL_ORDEN = 2;     // B
const COL_DNI = 3;       // C
const COL_NOMBRE = 4;    // D
const COL_COMP_START = 5; // E...

interface AsignacionContexto {
  id: string;
  docente_id: string;
  curso_id: string;
  seccion_id: string;
  periodo_id: string;
  curso_nombre: string;
  seccion_nombre: string;
  grado_id: string;
  grado_nombre: string;
  nivel_nombre: string;
}

async function obtenerAsignacionYValidarAcceso(asignacionId: string, user: JwtClaims): Promise<AsignacionContexto> {
  const asignacion = await prisma.asignacionDocente.findUnique({
    where: { id: asignacionId },
    include: {
      curso: { select: { nombre: true } },
      seccion: {
        select: {
          nombre: true,
          grado_id: true,
          grado: { select: { nombre: true, nivel: { select: { nombre: true } } } },
        },
      },
    },
  });
  if (!asignacion || !asignacion.activo) throw new NotFoundError('Asignación');

  if (user.rol === 'Docente' && asignacion.docente_id !== user.entidadId) {
    throw new ForbiddenError('ASIGNACION_AJENA', 'No tienes acceso a esta asignación.');
  }
  if (user.rol !== 'Docente' && user.rol !== 'Admin') {
    throw new ForbiddenError('INSUFFICIENT_ROLE', 'Solo docentes y Admin pueden usar la plantilla de notas.');
  }

  return {
    id: asignacion.id,
    docente_id: asignacion.docente_id,
    curso_id: asignacion.curso_id,
    seccion_id: asignacion.seccion_id,
    periodo_id: asignacion.periodo_id,
    curso_nombre: asignacion.curso.nombre,
    seccion_nombre: asignacion.seccion.nombre,
    grado_id: asignacion.seccion.grado_id,
    grado_nombre: asignacion.seccion.grado.nombre,
    nivel_nombre: asignacion.seccion.grado.nivel.nombre,
  };
}

async function alumnosActivosDeSeccion(seccionId: string) {
  return prisma.alumno.findMany({
    where: { seccion_id: seccionId, activo: true },
    select: { id: true, dni: true, nombres: true, apellido_paterno: true, apellido_materno: true },
    orderBy: [{ apellido_paterno: 'asc' }, { apellido_materno: 'asc' }, { nombres: 'asc' }],
  });
}

export interface PreviewCelda {
  competencia_id: string;
  competencia_nombre: string;
  valor: number | null;
  error?: string;
}

export interface PreviewFila {
  alumno_id: string;
  alumno_nombre: string;
  dni: string;
  errores: string[];
  celdas: PreviewCelda[];
}

export interface PreviewImportacion {
  asignacion_label: string;
  bimestre_nombre: string;
  columnas_obsoletas: string[];
  columnas_faltantes: string[];
  filas: PreviewFila[];
  resumen: { total_filas: number; celdas_validas: number; celdas_con_error: number };
}

export const NotasPlantillaService = {
  /** Genera el .xlsx de la plantilla para una asignación + bimestre. */
  async generar(asignacionId: string, bimestreId: string, user: JwtClaims): Promise<{ buffer: Buffer; filename: string }> {
    const ctx = await obtenerAsignacionYValidarAcceso(asignacionId, user);

    const bimestre = await prisma.bimestre.findUnique({ where: { id: bimestreId } });
    if (!bimestre) throw new NotFoundError('Bimestre');

    const [competencias, alumnos] = await Promise.all([
      CompetenciaRepo.list(ctx.curso_id, ctx.grado_id),
      alumnosActivosDeSeccion(ctx.seccion_id),
    ]);
    const notasExistentes = await prisma.nota.findMany({
      where: { bimestre_id: bimestreId, alumno_id: { in: alumnos.map((a) => a.id) } },
      select: { alumno_id: true, competencia_id: true, nota_vigesimal: true },
    });
    const compsOrdenadas = [...competencias].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
    const notaPorCelda = new Map<string, number>();
    for (const n of notasExistentes) notaPorCelda.set(`${n.alumno_id}::${n.competencia_id}`, Number(n.nota_vigesimal));

    let ExcelJS: any;
    try {
      const mod = await import('exceljs');
      ExcelJS = (mod as any).default ?? mod;
    } catch {
      throw new Error('exceljs no está instalado.');
    }

    const wb = new ExcelJS.Workbook();
    wb.creator = 'SGEI v2.1';
    wb.created = new Date();
    const ws = wb.addWorksheet('Notas');

    // ── Fila 1 (oculta): metadata de la asignación/bimestre ──────
    ws.getCell(FILA_META, 1).value = '__ASIGNACION_ID__';
    ws.getCell(FILA_META, 2).value = ctx.id;
    ws.getCell(FILA_META, 3).value = '__BIMESTRE_ID__';
    ws.getCell(FILA_META, 4).value = bimestreId;

    // ── Fila 2 (oculta): competencia_id por columna ──────────────
    compsOrdenadas.forEach((c, i) => {
      ws.getCell(FILA_COMP_IDS, COL_COMP_START + i).value = c.id;
    });

    // ── Fila 3: encabezados ───────────────────────────────────────
    ws.getCell(FILA_HEADER, COL_ALUMNO_ID).value = 'ID (no editar)';
    ws.getCell(FILA_HEADER, COL_ORDEN).value = 'N°';
    ws.getCell(FILA_HEADER, COL_DNI).value = 'DNI';
    ws.getCell(FILA_HEADER, COL_NOMBRE).value = 'Apellidos y Nombres';
    compsOrdenadas.forEach((c, i) => {
      const cell = ws.getCell(FILA_HEADER, COL_COMP_START + i);
      cell.value = `${c.nombre} (${Number(c.peso)}%)`;
    });
    const headerRow = ws.getRow(FILA_HEADER);
    headerRow.eachCell((cell: any) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    });
    headerRow.height = 32;

    // ── Filas de datos ────────────────────────────────────────────
    alumnos.forEach((al, idx) => {
      const row = FILA_DATA_START + idx;
      ws.getCell(row, COL_ALUMNO_ID).value = al.id;
      ws.getCell(row, COL_ORDEN).value = idx + 1;
      ws.getCell(row, COL_DNI).value = al.dni;
      ws.getCell(row, COL_NOMBRE).value = `${al.apellido_paterno} ${al.apellido_materno}, ${al.nombres}`;
      compsOrdenadas.forEach((c, i) => {
        const cell = ws.getCell(row, COL_COMP_START + i);
        const existente = notaPorCelda.get(`${al.id}::${c.id}`);
        if (existente !== undefined) cell.value = existente;
        cell.dataValidation = {
          type: 'decimal',
          operator: 'between',
          formulae: [0, 20],
          showErrorMessage: true,
          errorStyle: 'warning',
          errorTitle: 'Nota fuera de rango',
          error: 'La nota debe estar entre 0 y 20.',
        };
      });
    });

    // ── Anchos y ocultamiento ─────────────────────────────────────
    ws.getColumn(COL_ALUMNO_ID).hidden = true;
    ws.getColumn(COL_ORDEN).width = 5;
    ws.getColumn(COL_DNI).width = 12;
    ws.getColumn(COL_NOMBRE).width = 32;
    compsOrdenadas.forEach((_, i) => { ws.getColumn(COL_COMP_START + i).width = 18; });
    ws.getRow(FILA_META).hidden = true;
    ws.getRow(FILA_COMP_IDS).hidden = true;
    ws.views = [{ state: 'frozen', xSplit: COL_NOMBRE, ySplit: FILA_HEADER }];

    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    const filename = `plantilla_${ctx.curso_nombre}_${ctx.grado_nombre}_${ctx.seccion_nombre}`
      .replace(/[^\p{L}\p{N}_.-]+/gu, '_') + '.xlsx';
    return { buffer, filename };
  },

  /** Parsea un .xlsx subido y devuelve una vista previa validada (no guarda nada). */
  async previsualizar(fileBuffer: Buffer, user: JwtClaims): Promise<PreviewImportacion> {
    let ExcelJS: any;
    try {
      const mod = await import('exceljs');
      ExcelJS = mod.default ?? mod;
    } catch {
      throw new Error('exceljs no está instalado.');
    }

    const wb = new ExcelJS.Workbook();
    try {
      await wb.xlsx.load(fileBuffer);
    } catch {
      throw new BusinessRuleError('ARCHIVO_INVALIDO', 'No se pudo leer el archivo. Asegúrate de subir la plantilla .xlsx sin modificar su estructura.');
    }
    const ws = wb.worksheets[0];
    if (!ws) throw new BusinessRuleError('ARCHIVO_INVALIDO', 'El archivo no tiene hojas.');

    const asignacionId = String(ws.getCell(FILA_META, 2).value ?? '');
    const bimestreId = String(ws.getCell(FILA_META, 4).value ?? '');
    if (!asignacionId || !bimestreId) {
      throw new BusinessRuleError('ARCHIVO_INVALIDO', 'El archivo no parece ser una plantilla de notas válida (falta metadata oculta).');
    }

    const ctx = await obtenerAsignacionYValidarAcceso(asignacionId, user);
    const bimestre = await prisma.bimestre.findUnique({ where: { id: bimestreId } });
    if (!bimestre) throw new NotFoundError('Bimestre');
    if (bimestre.cerrado) {
      throw new BusinessRuleError('BIMESTRE_CERRADO', 'Este bimestre ya está cerrado; no se pueden importar notas.');
    }

    // Competencias/alumnos VIGENTES (no lo que decía la plantilla al momento de descargarla).
    const [competenciasVigentes, alumnosVigentes] = await Promise.all([
      CompetenciaRepo.list(ctx.curso_id, ctx.grado_id),
      alumnosActivosDeSeccion(ctx.seccion_id),
    ]);
    const competenciaPorId = new Map(competenciasVigentes.map((c) => [c.id, c]));
    const alumnoPorId = new Map(alumnosVigentes.map((a) => [a.id, a]));

    // Columnas del archivo → competencia_id (fila oculta 2)
    const columnas: Array<{ col: number; competenciaId: string }> = [];
    const maxCol = ws.getRow(FILA_HEADER).cellCount;
    for (let col = COL_COMP_START; col <= Math.max(maxCol, COL_COMP_START); col++) {
      const val = ws.getCell(FILA_COMP_IDS, col).value;
      if (val) columnas.push({ col, competenciaId: String(val) });
    }

    const columnasObsoletas = columnas
      .filter((c) => !competenciaPorId.has(c.competenciaId))
      .map((c) => String(ws.getCell(FILA_HEADER, c.col).value ?? c.competenciaId));
    const idsEnArchivo = new Set(columnas.map((c) => c.competenciaId));
    const columnasFaltantes = competenciasVigentes
      .filter((c) => !idsEnArchivo.has(c.id))
      .map((c) => c.nombre);

    const columnasValidas = columnas.filter((c) => competenciaPorId.has(c.competenciaId));

    const filas: PreviewFila[] = [];
    let celdasValidas = 0;
    let celdasConError = 0;

    let row = FILA_DATA_START;
    while (true) {
      const alumnoIdCell = ws.getCell(row, COL_ALUMNO_ID).value;
      const nombreCell = ws.getCell(row, COL_NOMBRE).value;
      if (!alumnoIdCell && !nombreCell) break; // fin de datos
      const alumnoId = String(alumnoIdCell ?? '');
      const errores: string[] = [];
      const alumno = alumnoPorId.get(alumnoId);
      if (!alumno) {
        errores.push('Este alumno ya no pertenece a la sección (fue retirado o trasladado) — esta fila se ignorará.');
      }

      const celdas: PreviewCelda[] = columnasValidas.map(({ col, competenciaId }) => {
        const comp = competenciaPorId.get(competenciaId)!;
        const raw = ws.getCell(row, col).value;
        if (raw === null || raw === undefined || raw === '') {
          return { competencia_id: competenciaId, competencia_nombre: comp.nombre, valor: null };
        }
        const num = typeof raw === 'number' ? raw : parseFloat(String(raw));
        if (isNaN(num) || num < 0 || num > 20) {
          celdasConError++;
          return {
            competencia_id: competenciaId, competencia_nombre: comp.nombre, valor: null,
            error: `Valor inválido "${raw}" — debe ser un número entre 0 y 20.`,
          };
        }
        celdasValidas++;
        return { competencia_id: competenciaId, competencia_nombre: comp.nombre, valor: num };
      });

      filas.push({
        alumno_id: alumnoId,
        alumno_nombre: alumno ? `${alumno.apellido_paterno} ${alumno.apellido_materno}, ${alumno.nombres}` : String(nombreCell ?? '—'),
        dni: alumno?.dni ?? String(ws.getCell(row, COL_DNI).value ?? ''),
        errores,
        celdas,
      });
      row++;
    }

    return {
      asignacion_label: `${ctx.curso_nombre} — ${ctx.grado_nombre} "${ctx.seccion_nombre}"`,
      bimestre_nombre: bimestre.nombre,
      columnas_obsoletas: columnasObsoletas,
      columnas_faltantes: columnasFaltantes,
      filas,
      resumen: { total_filas: filas.length, celdas_validas: celdasValidas, celdas_con_error: celdasConError },
    };
  },
};
