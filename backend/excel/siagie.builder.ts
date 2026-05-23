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

// Áreas MINEDU DCN 2009 — orden corresponde a cols AL-AU (índices 0-9)
const AREAS_MINEDU: Array<{ letra: string; nombre: string; aliases: string[] }> = [
  { letra: 'A', nombre: 'Matemática',                              aliases: ['matematica', 'matematicas', 'math'] },
  { letra: 'B', nombre: 'Comunicación',                            aliases: ['comunicacion', 'lenguaje', 'castellano'] },
  { letra: 'C', nombre: 'Idioma extranjero/originario',            aliases: ['ingles', 'idioma extranjero', 'idioma', 'quechua', 'aimara'] },
  { letra: 'D', nombre: 'Educación por el Arte',                   aliases: ['arte', 'arte y cultura', 'educacion por el arte'] },
  { letra: 'E', nombre: 'Ciencias Sociales',                       aliases: ['ciencias sociales', 'historia', 'geografia', 'cs sociales', 'hge'] },
  { letra: 'F', nombre: 'Persona, Familia y Relaciones Humanas',   aliases: ['persona familia y relaciones humanas', 'pfrh', 'dpcc', 'desarrollo personal'] },
  { letra: 'G', nombre: 'Educación Física',                        aliases: ['educacion fisica', 'ed fisica', 'efisica'] },
  { letra: 'H', nombre: 'Educación Religiosa',                     aliases: ['educacion religiosa', 'ed religiosa', 'religion'] },
  { letra: 'I', nombre: 'Ciencia, Tecnología y Ambiente',          aliases: ['ciencia tecnologia y ambiente', 'cta', 'cyt', 'ciencia y tecnologia', 'ciencias'] },
  { letra: 'J', nombre: 'Educación para el Trabajo',               aliases: ['educacion para el trabajo', 'ept', 'computacion', 'informatica'] },
];

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

  // Una hoja "Acta N" clonada del template por cada (grado, sección)
  actas.forEach((acta, i) => {
    const newSheet = outputWb.addWorksheet(`Acta ${i + 1}`);
    cloneSheet(templateSheet, newSheet);
    inyectarDatos(newSheet, acta);
  });

  // Hojas auxiliares
  if (input.detalle.length > 0) construirHojaDetalle(outputWb, input.detalle);
  if (actas.length > 0)         construirHojaResumen(outputWb, actas);

  const buf = await outputWb.xlsx.writeBuffer();
  return Buffer.from(buf);
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
  setVal(ws, T.CELL_GRADO,         acta.grado);
  setVal(ws, T.CELL_SECCION,       acta.seccion);
  setVal(ws, T.CELL_TURNO,         acta.turno);
  setVal(ws, T.CELL_PERIODO_ANIO,  m.anio_escolar);
  setVal(ws, T.CELL_PERIODO_INI,   formatDate(m.fecha_inicio_periodo));
  setVal(ws, T.CELL_PERIODO_FIN,   formatDate(m.fecha_fin_periodo));
  setVal(ws, T.CELL_UBI_DPTO,      m.departamento);
  setVal(ws, T.CELL_UBI_PROV,      m.provincia);
  setVal(ws, T.CELL_UBI_DIST,      m.distrito);
  setVal(ws, T.CELL_UBI_CP,        m.centro_poblado ?? '');

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

    // Áreas (10) — cols AL-AU
    for (let i = 0; i < 10; i++) {
      setNotaCell(ws, row, T.COL_AREA_START + i, al.areas[i]);
    }

    // Especialidad ocupacional
    setNotaCell(ws, row, T.COL_ESP_OCUP, al.especialidad);

    // Talleres (5) — cols AW-BA
    for (let i = 0; i < 5; i++) {
      setNotaCell(ws, row, T.COL_TALLER_START + i, al.talleres[i]);
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
  const cell = ws.getCell(row, col);
  cell.value = literal || '';
  if (literal) {
    const colors = literalColor(literal);
    // Solo sobreescribimos font color + fill, manteniendo border/alignment del template
    const baseStyle = cell.style || {};
    cell.style = {
      ...baseStyle,
      font: { ...(baseStyle.font ?? {}), bold: true, size: 9, color: { argb: colors.font } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.bg } },
    };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setSituacionCell(ws: any, row: number, col: number, value: string): void {
  const cell = ws.getCell(row, col);
  cell.value = value || '';
  const c = situacionColor(value);
  if (c) {
    const baseStyle = cell.style || {};
    cell.style = {
      ...baseStyle,
      font: { ...(baseStyle.font ?? {}), bold: true, size: 8, color: { argb: c.font } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: c.bg } },
    };
  }
}

// ════════════════════════════════════════════════════════════
//  Agrupación (notas → Acta) — sin cambios respecto a la versión previa
// ════════════════════════════════════════════════════════════

interface ActaData {
  grado:    string;
  seccion:  string;
  turno:    string;
  nivel:    string;
  meta:     NotaFinalSiagie;
  alumnos:  AlumnoActa[];
  talleres: string[];
}

interface AlumnoActa {
  numero_orden:              number;
  codigo_estudiante:         string | null;
  numero_documento:          string;
  apellido_paterno:          string;
  apellido_materno:          string;
  nombres:                   string;
  sexo:                      string;
  areas:                     string[];     // length 10
  especialidad:              string;
  talleres:                  string[];     // length 5
  comportamiento:            string;
  numero_areas_desaprobadas: number | null;
  situacion_final:           string;
  motivo_retiro:             string;
  observaciones:             string;
}

function agruparPorActa(rows: NotaFinalSiagie[]): ActaData[] {
  const map = new Map<string, ActaData>();

  for (const r of rows) {
    const key = `${r.grado}|${r.seccion}|${r.periodo_id}`;
    let acta  = map.get(key);
    if (!acta) {
      acta = {
        grado:    r.grado,
        seccion:  r.seccion,
        turno:    r.turno,
        nivel:    r.nivel_educativo,
        meta:     r,
        alumnos:  [],
        talleres: [],
      };
      map.set(key, acta);
    }

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
        areas:                     Array(10).fill(''),
        especialidad:              '',
        talleres:                  Array(5).fill(''),
        comportamiento:            r.comportamiento ?? '',
        numero_areas_desaprobadas: r.numero_areas_desaprobadas,
        situacion_final:           r.situacion_final ?? '',
        motivo_retiro:             r.motivo_retiro ?? '',
        observaciones:             r.observaciones ?? '',
      };
      acta.alumnos.push(alumno);
    }

    const lit = notaToLiteral(r.nota_promedio);
    const cls = clasificarCurso(r.curso, acta.talleres);
    if (cls.tipo === 'area')              alumno.areas[cls.index]    = lit;
    else if (cls.tipo === 'especialidad') alumno.especialidad        = lit;
    else if (cls.tipo === 'taller')       alumno.talleres[cls.index] = lit;
  }

  for (const acta of map.values()) {
    acta.alumnos.sort((a, b) => a.numero_orden - b.numero_orden);
  }

  return Array.from(map.values()).sort((a, b) => {
    const g = a.grado.localeCompare(b.grado);
    return g !== 0 ? g : a.seccion.localeCompare(b.seccion);
  });
}

function clasificarCurso(
  nombre:   string,
  talleres: string[],
): { tipo: 'area'; index: number } | { tipo: 'especialidad' } | { tipo: 'taller'; index: number } {
  const norm = normalizar(nombre);
  for (let i = 0; i < AREAS_MINEDU.length; i++) {
    const area = AREAS_MINEDU[i];
    if (norm === normalizar(area.nombre)) return { tipo: 'area', index: i };
    for (const alias of area.aliases) {
      if (norm.includes(alias)) return { tipo: 'area', index: i };
    }
  }
  if (norm.includes('especialidad') || norm.includes('ocupacional')) {
    return { tipo: 'especialidad' };
  }
  let idx = talleres.indexOf(nombre);
  if (idx === -1) {
    idx = talleres.findIndex(t => t === '');
    if (idx === -1) idx = 0;
    talleres[idx] = nombre;
  }
  return { tipo: 'taller', index: idx };
}

function normalizar(s: string): string {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
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

function literalColor(literal: string): { font: string; bg: string } {
  switch (literal) {
    case 'AD': return { font: 'FF064E3B', bg: 'FFD1FAE5' };
    case 'A':  return { font: 'FF1E3A8A', bg: 'FFDBEAFE' };
    case 'B':  return { font: 'FF92400E', bg: 'FFFEF3C7' };
    case 'C':  return { font: 'FF7F1D1D', bg: 'FFFEE2E2' };
    default:   return { font: 'FF334155', bg: 'FFFFFFFF' };
  }
}

function situacionColor(s: string): { font: string; bg: string } | null {
  switch (s) {
    case 'Promovido':   return { font: 'FF064E3B', bg: 'FFD1FAE5' };
    case 'Repitente':   return { font: 'FF92400E', bg: 'FFFEF3C7' };
    case 'Retirado':
    case 'Trasladado':  return { font: 'FF7F1D1D', bg: 'FFFEE2E2' };
    case 'Fallecido':   return { font: 'FF334155', bg: 'FFF1F5F9' };
    default:            return null;
  }
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
    cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border    = thinBorder();
  });

  rows.forEach((r, idx) => {
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
    if (idx % 2 === 1) {
      row.eachCell((cell: import('exceljs').Cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      });
    }
    row.font = { size: 9 };
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
    cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
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
