// ============================================================
//  excel/siagie.builder.ts
//  Genera el archivo XLSX de carga masiva SIAGIE/MINEDU
//  usando ExcelJS (ya instalado: npm install exceljs --filter backend).
// ============================================================
import type { FormatoSiagieRow } from '@/modules/siagie/siagie.repository';

const HEADERS = [
  'N° Orden',
  'Código SIAGIE',
  'DNI',
  'Apellido Paterno',
  'Apellido Materno',
  'Nombres',
  'Sexo',
  'Grado',
  'Sección',
  'Turno',
  'Nivel Educativo',
  'Área Curricular',
  'Cód. CNEB',
  'Competencia',
  'Bimestre',
  'Nota Vigesimal',
  'Nota Literal',
  'Tipo Evaluación',
  'Situación Final',
  'N° Áreas Desaprobadas',
  'Comportamiento',
  'Motivo Retiro',
  'Observaciones',
  'Fecha Registro Nota',
  // IE / Período (cabecera única — se completan en la hoja Encabezado)
  'Año Escolar',
  'UGEL',
  'Nombre IE',
  'Cód. Modular',
];

export async function buildSiagieExcel(rows: FormatoSiagieRow[]): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ExcelJS: any;
  try {
    ExcelJS = await import('exceljs');
  } catch {
    throw new Error('exceljs no está instalado. Ejecuta: npm install exceljs --prefix backend');
  }

  const workbook  = new ExcelJS.Workbook();
  workbook.creator = 'SGEI v2.1';
  workbook.created  = new Date();

  const meta = rows[0];

  // ── Hoja 1: Encabezado IE ─────────────────────────────────
  const sheetIE = workbook.addWorksheet('Institución Educativa');
  sheetIE.columns = [
    { header: 'Campo',  key: 'campo',  width: 30 },
    { header: 'Valor',  key: 'valor',  width: 60 },
  ];
  styleHeaderRow(sheetIE.getRow(1), '1e3a5f');

  const ieFields = meta
    ? [
        ['Nombre IE',             meta.nombre_ie],
        ['Código Modular',        meta.codigo_modular],
        ['Código UGEL',           meta.codigo_ugel],
        ['Nombre UGEL',           meta.nombre_ugel],
        ['Modalidad',             meta.modalidad],
        ['Gestión',               meta.gestion],
        ['Departamento',          meta.departamento],
        ['Provincia',             meta.provincia],
        ['Distrito',              meta.distrito],
        ['Centro Poblado',        meta.centro_poblado ?? ''],
        ['Resolución Creación',   meta.resolucion_creacion ?? ''],
        ['Año Escolar',           meta.anio_escolar],
        ['Fecha Inicio Período',  formatDate(meta.fecha_inicio_periodo)],
        ['Fecha Fin Período',     formatDate(meta.fecha_fin_periodo)],
      ]
    : [];

  ieFields.forEach(([c, v]) => {
    const row = sheetIE.addRow({ campo: c, valor: v });
    row.getCell('campo').font = { bold: true, size: 10 };
    row.getCell('valor').alignment = { horizontal: 'left' };
  });

  // ── Hoja 2: Calificaciones ────────────────────────────────
  const sheet = workbook.addWorksheet('Calificaciones SIAGIE');
  sheet.columns = HEADERS.map((h, i) => ({
    header: h,
    key:    `col${i}`,
    width:  columnWidth(h),
  }));

  styleHeaderRow(sheet.getRow(1), '1e3a5f');

  // Autofiltro
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to:   { row: 1, column: HEADERS.length },
  };

  // Filas de datos
  rows.forEach((r, idx) => {
    const row = sheet.addRow([
      r.numero_orden,
      r.codigo_estudiante ?? '',
      r.numero_documento,
      r.apellido_paterno,
      r.apellido_materno,
      r.nombres,
      r.sexo,
      r.grado,
      r.seccion,
      r.turno,
      r.nivel_educativo,
      r.curso,
      r.codigo_cneb ?? '',
      r.competencia,
      r.bimestre,
      r.nota_vigesimal,
      r.nota_literal,
      r.tipo_evaluacion,
      r.situacion_final ?? '',
      r.numero_areas_desaprobadas ?? '',
      r.comportamiento ?? '',
      r.motivo_retiro ?? '',
      r.observaciones ?? '',
      formatDate(r.fecha_registro_nota),
      r.anio_escolar,
      r.codigo_ugel,
      r.nombre_ie,
      r.codigo_modular,
    ]);

    // Zebra striping
    if (idx % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = {
          type:    'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' },
        };
      });
    }

    // Colorear nota_literal
    const literalCell = row.getCell(17); // columna 17 = Nota Literal
    const literalColor = notaLiteralColor(r.nota_literal);
    literalCell.font = { bold: true, color: { argb: literalColor.font } };
    literalCell.fill = {
      type:    'pattern',
      pattern: 'solid',
      fgColor: { argb: literalColor.bg },
    };
    literalCell.alignment = { horizontal: 'center' };

    // Nota vigesimal centrada
    row.getCell(16).alignment = { horizontal: 'center' };
  });

  // Congelar fila de encabezados
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  // ── Hoja 3: Resumen por sección ───────────────────────────
  const sheetRes = workbook.addWorksheet('Resumen por Sección');
  sheetRes.columns = [
    { header: 'Grado',            key: 'grado',    width: 20 },
    { header: 'Sección',          key: 'seccion',  width: 15 },
    { header: 'Total Alumnos',    key: 'alumnos',  width: 18 },
    { header: 'Total Registros',  key: 'registros', width: 18 },
  ];
  styleHeaderRow(sheetRes.getRow(1), '0f766e');

  const resumen = new Map<string, { grado: string; seccion: string; alumnos: Set<string>; registros: number }>();
  rows.forEach((r) => {
    const key = `${r.grado}|${r.seccion}`;
    if (!resumen.has(key)) resumen.set(key, { grado: r.grado, seccion: r.seccion, alumnos: new Set(), registros: 0 });
    const e = resumen.get(key)!;
    e.alumnos.add(r.alumno_id);
    e.registros++;
  });

  Array.from(resumen.values())
    .sort((a, b) => a.grado.localeCompare(b.grado) || a.seccion.localeCompare(b.seccion))
    .forEach((e) => sheetRes.addRow({
      grado:     e.grado,
      seccion:   e.seccion,
      alumnos:   e.alumnos.size,
      registros: e.registros,
    }));

  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}

// ── Helpers ───────────────────────────────────────────────────

function styleHeaderRow(row: import('exceljs').Row, bgArgb: string) {
  row.height = 22;
  row.eachCell((cell) => {
    cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${bgArgb.toUpperCase()}` } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
    cell.border    = {
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });
}

function columnWidth(header: string): number {
  const map: Record<string, number> = {
    'N° Orden': 10, 'DNI': 12, 'Apellido Paterno': 22, 'Apellido Materno': 22,
    'Nombres': 28, 'Competencia': 40, 'Área Curricular': 30, 'Nombre IE': 35,
    'Situación Final': 18, 'Tipo Evaluación': 22, 'Fecha Registro Nota': 20,
  };
  return map[header] ?? 16;
}

function formatDate(d: Date | string | null): string {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  return dt.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function notaLiteralColor(literal: string): { font: string; bg: string } {
  switch (literal) {
    case 'AD': return { font: 'FF064E3B', bg: 'FFD1FAE5' };
    case 'A':  return { font: 'FF1E3A8A', bg: 'FFDBEAFE' };
    case 'B':  return { font: 'FF92400E', bg: 'FFFEF3C7' };
    case 'C':  return { font: 'FF7F1D1D', bg: 'FFFEE2E2' };
    default:   return { font: 'FF334155', bg: 'FFFFFFFF' };
  }
}
