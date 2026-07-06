// ============================================================
//  excel/siagie.builder.ts
//
//  Genera el "ACTA CONSOLIDADA DE EVALUACIÓN" reusando el template
//  oficial MINEDU (backend/resources/Formato_SIAGIE_template.xlsx,
//  conversión 1:1 del archivo `Formato SIAGIE.xls` provisto por
//  el usuario).
//
//  Estrategia:
//   1. Cargar el template (1 hoja "Acta 1" con layout completo).
//   2. Para cada (grado, sección):
//      a. Clonar la hoja del template (celdas + estilos + merges +
//         anchos + alturas).
//      b. Inyectar datos: IE / UGEL / Período / Ubicación en la
//         cabecera, y notas en filas 24-73 (50 alumnos máx).
//      c. Renombrar a "Acta N".
//   3. Borrar la hoja template original (queda sola "Acta 1...N").
//
//  Resultado: layout 100% igual al template MINEDU original.
// ============================================================
import path from 'node:path';
import type {
  FormatoSiagieRow,
  NotaFinalSiagie,
} from '@/modules/siagie/siagie.repository';

const TEMPLATE_FILENAME = 'Formato_SIAGIE_template.xlsx';

interface BuildInput {
  detalle:      FormatoSiagieRow[];
  notasFinales: NotaFinalSiagie[];
}

// ════════════════════════════════════════════════════════════
//  Coordenadas críticas del template MINEDU (1-indexed)
// ════════════════════════════════════════════════════════════

const T = {
  // Cabecera UGEL/IE (rows 10-16 son etiquetas; data va en mismas filas
  // dentro de los recuadros que el template ya define).
  CELL_UGEL_CODIGO:    { row: 12, col: 4  }, // D12: Código UGEL (digit box)
  CELL_UGEL_NOMBRE:    { row: 13, col: 4  }, // D13-O16 merge: nombre UGEL
  CELL_IE_NOMBRE:      { row: 10, col: 22 }, // V10-AJ10 area (debajo "Datos IE")
  CELL_IE_CODIGO_MOD:  { row: 13, col: 22 }, // value para Código Modular
  CELL_IE_RESOLUCION:  { row: 14, col: 22 }, // value para Resolución
  CELL_IE_MODALIDAD:   { row: 16, col: 22 }, // value para Modalidad
  CELL_IE_GESTION:     { row: 17, col: 22 }, // value para Gestión
  CELL_GRADO:          { row: 16, col: 29 }, // value para Grado
  CELL_SECCION:        { row: 16, col: 32 }, // value para Sección
  CELL_TURNO:          { row: 17, col: 32 }, // value para Turno
  CELL_PERIODO_ANIO:   { row: 10, col: 38 }, // value Año bajo "Período Lectivo"
  CELL_PERIODO_INI:    { row: 10, col: 44 }, // value Inicio
  CELL_PERIODO_FIN:    { row: 10, col: 51 }, // value Fin
  CELL_UBI_DPTO:       { row: 12, col: 58 }, // value Dpto
  CELL_UBI_PROV:       { row: 13, col: 58 }, // value Prov
  CELL_UBI_DIST:       { row: 14, col: 58 }, // value Dist
  CELL_UBI_CP:         { row: 15, col: 58 }, // value Centro Poblado

  // Filas de alumnos: data comienza en row 24 (donde A24=1).
  DATA_START_ROW:      24,
  DATA_END_ROW:        73,  // 50 alumnos

  // Columnas en las filas de alumnos (1-indexed):
  COL_N_ORDEN:         1,   // A
  COL_CODIGO_EST:      2,   // B (merged B-O)
  COL_APELLIDOS_NOM:   16,  // P (merged P-AJ)
  COL_SEXO:            37,  // AK
  COL_AREA_START:      38,  // AL (10 áreas: AL-AU)
  COL_ESP_OCUP:        48,  // AV
  COL_TALLER_START:    49,  // AW (5 talleres: AW-BA)
  COL_N_DESAP:         54,  // BB
  COL_COMPORTAMIENTO:  55,  // BC
  COL_SITUACION:       56,  // BD
  COL_MOTIVO_RETIRO:   57,  // BE
  COL_OBSERV:          58,  // BF (merged BF-BJ)
};

// ── Layout dinámico de las columnas de área ────────────────────
// El acta ya NO usa la lista fija DCN-2009. Las columnas de área se
// construyen desde las áreas REALES presentes en la BD (por
// area_academica, ordenadas por `orden`; los cursos sin área se
// muestran como su propia columna). Las columnas del template que
// sobran se limpian (nombre + letra en blanco) → "se eliminan las
// que no existen".
//
// Rango físico aprovechable con celda-nombre vertical (fila 13):
//   AL(38) … AV(48) = 11 columnas.  Fila de letras: fila 22.
const AREA_NAME_ROW   = 13;
const AREA_LETTER_ROW = 22;
const MAX_AREA_COLS   = 11;            // AL..AV
const LETRAS_AREA     = 'ABCDEFGHIJKLMNO'.split('');

// Cursos que NO se reportan en el acta SIAGIE aunque se dicten y califiquen en
// la libreta interna. Se comparan por nombre normalizado (minúsculas, sin
// acentos). Ej.: Religión no va en el acta oficial de esta institución.
const CURSOS_EXCLUIDOS_SIAGIE = new Set(['religion']);

// ════════════════════════════════════════════════════════════
//  Public API
// ════════════════════════════════════════════════════════════

export async function buildSiagieExcel(input: BuildInput): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ExcelJS: any;
  try {
    const mod = await import('exceljs');
    ExcelJS = mod.default ?? mod;
  } catch {
    throw new Error('exceljs no está instalado. Ejecuta: pnpm add exceljs --filter backend');
  }

  // Cargar el template MINEDU
  const templatePath = path.join(process.cwd(), 'resources', TEMPLATE_FILENAME);
  const templateWb   = new ExcelJS.Workbook();
  try {
    await templateWb.xlsx.readFile(templatePath);
  } catch (err) {
    throw new Error(
      `No se pudo cargar el template MINEDU en ${templatePath}. ` +
      `Asegúrate de que el archivo exista. Detalle: ${(err as Error).message}`,
    );
  }
  const templateSheet = templateWb.worksheets[0];

  // Workbook de salida
  const outputWb     = new ExcelJS.Workbook();
  outputWb.creator   = 'SGEI v2.1';
  outputWb.created   = new Date();

  const actas = agruparPorActa(input.notasFinales);

  if (actas.length === 0 && input.detalle.length === 0) {
    const ws = outputWb.addWorksheet('Sin datos');
    ws.addRow(['No hay registros para exportar.']);
    return Buffer.from(await outputWb.xlsx.writeBuffer());
  }

  // Una hoja clonada del template por cada (grado, sección). El nombre de la
  // pestaña lleva el GRADO y la SECCIÓN para que sea visible a qué pertenece.
  const usados = new Set<string>();
  actas.forEach((acta, i) => {
    const newSheet = outputWb.addWorksheet(nombreHoja(acta, i, usados));
    cloneSheet(templateSheet, newSheet);
    inyectarDatos(newSheet, acta);
  });

  // Hojas auxiliares (el Detalle también omite los cursos excluidos del acta)
  const detalleFiltrado = input.detalle.filter(
    (r) => !CURSOS_EXCLUIDOS_SIAGIE.has(normalizar(r.curso)),
  );
  if (detalleFiltrado.length > 0) construirHojaDetalle(outputWb, detalleFiltrado);
  if (actas.length > 0)           construirHojaResumen(outputWb, actas);

  const buf = await outputWb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

/** Nombre de pestaña con grado + sección, saneado para Excel (≤31 chars, único). */
function nombreHoja(acta: ActaData, i: number, usados: Set<string>): string {
  const sanitizar = (s: string) => s.replace(/[:\\/?*[\]]/g, ' ').replace(/\s+/g, ' ').trim();
  const base = (sanitizar(`${acta.grado} ${acta.seccion}`) || `Acta ${i + 1}`).slice(0, 31);
  let nombre = base;
  let n = 2;
  while (usados.has(nombre.toLowerCase())) {
    const suf = ` (${n++})`;
    nombre = base.slice(0, 31 - suf.length) + suf;
  }
  usados.add(nombre.toLowerCase());
  return nombre;
}

// ════════════════════════════════════════════════════════════
//  Clonación de hoja desde template
// ════════════════════════════════════════════════════════════

/* eslint-disable @typescript-eslint/no-explicit-any */
function cloneSheet(src: any, dst: any): void {
  // 1. Anchos de columna
  src.columns?.forEach((col: any, i: number) => {
    if (col?.width) dst.getColumn(i + 1).width = col.width;
  });

  // 2. Page setup
  if (src.pageSetup) {
    dst.pageSetup = { ...src.pageSetup };
  }

  // 3. Celdas (valor + estilo)
  src.eachRow({ includeEmpty: true }, (srcRow: any, rowNum: number) => {
    const dstRow = dst.getRow(rowNum);
    if (srcRow.height) dstRow.height = srcRow.height;

    srcRow.eachCell({ includeEmpty: true }, (srcCell: any, colNum: number) => {
      const dstCell = dst.getCell(rowNum, colNum);
      if (srcCell.value !== null && srcCell.value !== undefined) {
        dstCell.value = srcCell.value;
      }
      if (srcCell.style) {
        // Copia profunda básica del style (font, alignment, border, fill, numFmt)
        dstCell.style = JSON.parse(JSON.stringify(srcCell.style));
      }
    });
  });

  // 4. Merges
  if (src.model?.merges) {
    for (const range of src.model.merges) {
      try {
        dst.mergeCells(range);
      } catch {
        // Ignorar merges duplicados o inválidos
      }
    }
  }

  // 5. Views (freeze panes)
  if (src.views?.length) {
    dst.views = JSON.parse(JSON.stringify(src.views));
  }
}

// ════════════════════════════════════════════════════════════
//  Inyección de datos en la hoja clonada
// ════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function inyectarDatos(ws: any, acta: ActaData): void {
  const m = acta.meta;

  // ── Cabecera ─────────────────────────────────────────────
  // (writeable celdas en zonas del template — los labels ya están)
  setVal(ws, T.CELL_UGEL_CODIGO,  m.codigo_ugel);
  setVal(ws, T.CELL_UGEL_NOMBRE,  m.nombre_ugel);
  setVal(ws, T.CELL_IE_NOMBRE,    m.nombre_ie);
  setVal(ws, T.CELL_IE_CODIGO_MOD, m.codigo_modular);
  setVal(ws, T.CELL_IE_RESOLUCION, m.resolucion_creacion ?? '');
  setVal(ws, T.CELL_IE_MODALIDAD,  m.modalidad);
  setVal(ws, T.CELL_IE_GESTION,    m.gestion);
  // Grado + Sección (+ Turno) en el recuadro vacío bajo la etiqueta "Grado (3)"
  // del template (X16:AB16). Así queda VISIBLE en la hoja impresa a qué grado y
  // sección pertenece el acta (además del nombre de la pestaña).
  setVal(ws, { row: 16, col: 24 }, `${acta.grado} - Secc. "${acta.seccion}" - ${acta.turno}`);
  setVal(ws, T.CELL_PERIODO_ANIO,  m.anio_escolar);
  setVal(ws, T.CELL_PERIODO_INI,   formatDate(m.fecha_inicio_periodo));
  setVal(ws, T.CELL_PERIODO_FIN,   formatDate(m.fecha_fin_periodo));
  setVal(ws, T.CELL_UBI_DPTO,      m.departamento);
  setVal(ws, T.CELL_UBI_PROV,      m.provincia);
  setVal(ws, T.CELL_UBI_DIST,      m.distrito);
  setVal(ws, T.CELL_UBI_CP,        m.centro_poblado ?? '');

  // ── Encabezados dinámicos de área (fila 13) + limpieza ───
  // Escribe el nombre real de cada área en su columna y BORRA las
  // columnas de área/taller/especialidad del template que sobran.
  const usadas = Math.min(acta.areas.length, MAX_AREA_COLS);
  if (acta.areas.length > MAX_AREA_COLS) {
    console.warn(
      `[siagie] Acta ${acta.grado}/${acta.seccion}: ${acta.areas.length} áreas con nota ` +
      `exceden las ${MAX_AREA_COLS} columnas del template; se muestran las primeras ${MAX_AREA_COLS}.`,
    );
  }
  // Nombres de área (fila 13): AL(38) … AV(48)
  for (let c = T.COL_AREA_START; c <= T.COL_ESP_OCUP; c++) {
    const i = c - T.COL_AREA_START;
    ws.getCell(AREA_NAME_ROW, c).value = i < usadas ? acta.areas[i].nombre : '';
  }
  // Letras (fila 22): AL(38) … BA(53) — deja A,B,C… para las usadas, borra el resto
  for (let c = T.COL_AREA_START; c <= T.COL_TALLER_START + 4; c++) {
    const i = c - T.COL_AREA_START;
    ws.getCell(AREA_LETTER_ROW, c).value = i < usadas ? (LETRAS_AREA[i] ?? '') : '';
  }
  // Sin talleres en este colegio → limpia el rótulo "Talleres" (AW12)
  ws.getCell(12, T.COL_TALLER_START).value = '';

  // ── Filas de alumnos ────────────────────────────────────
  acta.alumnos.slice(0, T.DATA_END_ROW - T.DATA_START_ROW + 1).forEach((al, idx) => {
    const row = T.DATA_START_ROW + idx;

    // Cód. SIAGIE (cells merged B-O, escribe en B)
    setVal(ws, { row, col: T.COL_CODIGO_EST },     al.codigo_estudiante ?? '');

    // Apellidos y Nombres (cells merged P-AJ, escribe en P)
    const apenom = `${al.apellido_paterno} ${al.apellido_materno}, ${al.nombres}`;
    setVal(ws, { row, col: T.COL_APELLIDOS_NOM },  apenom);

    // Sexo
    setVal(ws, { row, col: T.COL_SEXO },           al.sexo);

    // Áreas dinámicas — una columna por área real presente en la BD
    const usados = Math.min(acta.areas.length, MAX_AREA_COLS);
    for (let i = 0; i < usados; i++) {
      setNotaCell(ws, row, T.COL_AREA_START + i, areaLiteral(al, acta.areas[i].key));
    }

    // N° Áreas Desaprobadas
    setVal(ws, { row, col: T.COL_N_DESAP },        al.numero_areas_desaprobadas ?? '');

    // Comportamiento
    setVal(ws, { row, col: T.COL_COMPORTAMIENTO }, al.comportamiento);

    // Situación final (resaltado con color)
    setSituacionCell(ws, row, T.COL_SITUACION,     al.situacion_final);

    // Motivo retiro
    setVal(ws, { row, col: T.COL_MOTIVO_RETIRO },  al.motivo_retiro);

    // Observaciones (cells merged BF-BJ, escribe en BF)
    setVal(ws, { row, col: T.COL_OBSERV },         al.observaciones);
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setVal(ws: any, coord: { row: number; col: number }, value: string | number | null): void {
  const cell = ws.getCell(coord.row, coord.col);
  cell.value = value ?? '';
  // No modificamos estilo: el template ya tiene fonts/alignment/border definidos.
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setNotaCell(ws: any, row: number, col: number, literal: string): void {
  // Notas en BLANCO Y NEGRO: solo el valor, conservando el estilo del template
  // (borde/alineación, texto negro). Sin resaltado de color ni relleno.
  ws.getCell(row, col).value = literal || '';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setSituacionCell(ws: any, row: number, col: number, value: string): void {
  // Situación final también en blanco y negro (sin color).
  ws.getCell(row, col).value = value || '';
}

// ════════════════════════════════════════════════════════════
//  Agrupación (notas → Acta) — sin cambios respecto a la versión previa
// ════════════════════════════════════════════════════════════

interface AreaCol {
  key:    string;   // area_academica_id, o `curso:<id>` para cursos sin área
  nombre: string;
  orden:  number;
}

interface ActaData {
  grado:    string;
  seccion:  string;
  turno:    string;
  nivel:    string;
  meta:     NotaFinalSiagie;
  alumnos:  AlumnoActa[];
  areas:    AreaCol[];   // columnas dinámicas, ordenadas por area.orden
}

interface AlumnoActa {
  numero_orden:              number;
  codigo_estudiante:         string | null;
  numero_documento:          string;
  apellido_paterno:          string;
  apellido_materno:          string;
  nombres:                   string;
  sexo:                      string;
  notasPorArea:              Map<string, number[]>; // areaKey → notas de sus cursos
  comportamiento:            string;
  numero_areas_desaprobadas: number | null;
  situacion_final:           string;
  motivo_retiro:             string;
  observaciones:             string;
}

/** Literal final del área de un alumno (promedio de las notas de sus cursos). */
function areaLiteral(al: AlumnoActa, areaKey: string): string {
  const notas = al.notasPorArea.get(areaKey);
  if (!notas || notas.length === 0) return '';
  return notaToLiteral(notas.reduce((a, b) => a + b, 0) / notas.length);
}

/** Normaliza un nombre (minúsculas, sin acentos ni símbolos) para usar como clave. */
function normalizar(s: string): string {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function agruparPorActa(rows: NotaFinalSiagie[]): ActaData[] {
  const map     = new Map<string, ActaData>();
  const catalog = new Map<string, Map<string, AreaCol>>(); // actaKey → (areaKey → AreaCol)

  for (const r of rows) {
    // Cursos excluidos del acta oficial (p. ej. Religión): no generan columna.
    if (CURSOS_EXCLUIDOS_SIAGIE.has(normalizar(r.curso))) continue;

    const key = `${r.grado}|${r.seccion}|${r.periodo_id}`;
    let acta  = map.get(key);
    if (!acta) {
      acta = {
        grado:   r.grado,
        seccion: r.seccion,
        turno:   r.turno,
        nivel:   r.nivel_educativo,
        meta:    r,
        alumnos: [],
        areas:   [],
      };
      map.set(key, acta);
      catalog.set(key, new Map());
    }

    // Área real del curso; si el curso no tiene área, es su propia columna.
    // La clave es el NOMBRE normalizado (no el id): area_academica tiene una
    // fila por (nivel, nombre), así que un mismo área ("Inglés") puede venir con
    // varios ids — se fusionan en una sola columna.
    const areaNombre = r.area_nombre ?? r.curso;
    const areaKey    = normalizar(areaNombre);
    const orden      = r.area_orden ?? 900; // cursos sin área → después de las áreas reales
    const cat = catalog.get(key)!;
    const prev = cat.get(areaKey);
    if (!prev) cat.set(areaKey, { key: areaKey, nombre: areaNombre, orden });
    else if (orden < prev.orden) prev.orden = orden; // conserva el menor orden

    let alumno = acta.alumnos.find(a => a.numero_documento === r.numero_documento);
    if (!alumno) {
      alumno = {
        numero_orden:              r.numero_orden,
        codigo_estudiante:         r.codigo_estudiante,
        numero_documento:          r.numero_documento,
        apellido_paterno:          r.apellido_paterno,
        apellido_materno:          r.apellido_materno,
        nombres:                   r.nombres,
        sexo:                      r.sexo,
        notasPorArea:              new Map(),
        comportamiento:            r.comportamiento ?? '',
        numero_areas_desaprobadas: r.numero_areas_desaprobadas,
        situacion_final:           r.situacion_final ?? '',
        motivo_retiro:             r.motivo_retiro ?? '',
        observaciones:             r.observaciones ?? '',
      };
      acta.alumnos.push(alumno);
    }

    // Acumula la nota del curso bajo su área (varios cursos de una misma área
    // se promedian a una sola nota literal por área en el acta).
    if (r.nota_promedio > 0) {
      if (!alumno.notasPorArea.has(areaKey)) alumno.notasPorArea.set(areaKey, []);
      alumno.notasPorArea.get(areaKey)!.push(r.nota_promedio);
    }
  }

  // Ordena las columnas de área (por orden pedagógico real; los cursos sin área
  // van al final por nombre), DEJANDO SOLO las áreas/cursos con al menos una
  // nota real en la sección — así se eliminan los cursos genéricos placeholder
  // (sin notas) y quedan únicamente los que existen de verdad. Ordena alumnos.
  for (const [key, acta] of map) {
    acta.areas = [...catalog.get(key)!.values()]
      .filter((a) => acta.alumnos.some((al) => (al.notasPorArea.get(a.key)?.length ?? 0) > 0))
      .sort((a, b) => (a.orden - b.orden) || a.nombre.localeCompare(b.nombre));
    acta.alumnos.sort((a, b) => a.numero_orden - b.numero_orden);
  }

  return Array.from(map.values()).sort((a, b) => {
    const g = a.grado.localeCompare(b.grado);
    return g !== 0 ? g : a.seccion.localeCompare(b.seccion);
  });
}

// ════════════════════════════════════════════════════════════
//  Helpers de formato
// ════════════════════════════════════════════════════════════

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function notaToLiteral(nota: number): string {
  if (nota >= 18) return 'AD';
  if (nota >= 14) return 'A';
  if (nota >= 11) return 'B';
  return 'C';
}

// ════════════════════════════════════════════════════════════
//  Hojas auxiliares
// ════════════════════════════════════════════════════════════

function thinBorder(): import('exceljs').Borders {
  const side = { style: 'thin' as const, color: { argb: 'FFCBD5E1' } };
  return { top: side, bottom: side, left: side, right: side } as import('exceljs').Borders;
}

function construirHojaDetalle(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  workbook: any,
  rows:     FormatoSiagieRow[],
): void {
  const ws = workbook.addWorksheet('Detalle de Notas');
  const HEADERS = [
    'N° Orden', 'Cód. SIAGIE', 'DNI', 'Ap. Paterno', 'Ap. Materno', 'Nombres',
    'Sexo', 'Grado', 'Sección', 'Turno', 'Nivel',
    'Curso', 'Cód. CNEB', 'Competencia',
    'Bimestre', 'Nota Vigesimal', 'Literal', 'Tipo Evaluación',
    'Situación Final', 'N° Áreas Desap.', 'Comportamiento',
    'Motivo Retiro', 'Observaciones', 'Fecha Registro',
  ];
  ws.addRow(HEADERS);

  const headerRow = ws.getRow(1);
  headerRow.height = 24;
  headerRow.eachCell((cell: import('exceljs').Cell) => {
    // Blanco y negro: encabezado en negrita, sin relleno de color.
    cell.font      = { bold: true, size: 9 };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border    = thinBorder();
  });

  rows.forEach((r) => {
    const row = ws.addRow([
      r.numero_orden, r.codigo_estudiante ?? '', r.numero_documento,
      r.apellido_paterno, r.apellido_materno, r.nombres,
      r.sexo, r.grado, r.seccion, r.turno, r.nivel_educativo,
      r.curso, r.codigo_cneb ?? '', r.competencia,
      r.bimestre, r.nota_vigesimal, r.nota_literal, r.tipo_evaluacion,
      r.situacion_final ?? '', r.numero_areas_desaprobadas ?? '',
      r.comportamiento ?? '', r.motivo_retiro ?? '', r.observaciones ?? '',
      formatDate(r.fecha_registro_nota),
    ]);
    row.font = { size: 9 };  // sin zebra de color
  });

  const widths = [8, 13, 12, 18, 18, 22, 6, 12, 10, 10, 14, 24, 12, 32, 12, 12, 8, 16, 14, 10, 14, 22, 26, 14];
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: HEADERS.length } };
  ws.views = [{ state: 'frozen', ySplit: 1 }];
}

function construirHojaResumen(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  workbook: any,
  actas:    ActaData[],
): void {
  const ws = workbook.addWorksheet('Resumen');
  ws.addRow(['Acta', 'Grado', 'Sección', 'Turno', 'Nivel', 'Alumnos']);
  ws.getRow(1).eachCell((cell: import('exceljs').Cell) => {
    // Blanco y negro: encabezado en negrita, sin relleno de color.
    cell.font      = { bold: true, size: 10 };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border    = thinBorder();
  });

  actas.forEach((acta, i) => {
    ws.addRow([
      `Acta ${i + 1}`,
      acta.grado,
      acta.seccion,
      acta.turno,
      acta.nivel,
      acta.alumnos.length,
    ]);
  });

  [10, 14, 12, 10, 14, 10].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
}
