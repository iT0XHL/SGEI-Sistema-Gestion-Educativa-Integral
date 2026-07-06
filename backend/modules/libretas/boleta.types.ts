// ============================================================
//  modules/libretas/boleta.types.ts
//  Modelo de datos que consumen AMBOS generadores de la libreta
//  (Word .docx editable para Secretaría · PDF de solo lectura para
//  el Alumno). Formato "BOLETA DE NOTAS" de la IEP Virgen del
//  Carmen - Las Viñas (referencia: resources/LIBRETANUEVA.pdf).
//
//  La boleta es ANUAL: 4 columnas de bimestre (I–IV) + promedio
//  anual, con las notas en literal (AD/A/B/C) agrupadas por área.
// ============================================================

/** Un curso (asignatura) dentro de un área, con su literal por bimestre. */
export interface BoletaCurso {
  curso:         string;
  /** literal por número de bimestre: { 1: 'A', 2: null, 3: null, 4: null } */
  literalPorBim: Record<number, string | null>;
  /** promedio anual del curso en literal (promedio de los bimestres con nota) */
  literalAnual:  string | null;
}

/** Un área curricular (COMUNICACIÓN, MATEMÁTICA…) con sus cursos. */
export interface BoletaArea {
  area_nombre:   string;
  cursos:        BoletaCurso[];
  /** true si el área agrupa >1 curso → se dibuja la fila "PROMEDIO GENERAL". */
  tienePromedioGeneral: boolean;
  /** "PROMEDIO GENERAL" del área en literal por bimestre. */
  generalPorBim: Record<number, string | null>;
  generalAnual:  string | null;
}

/** Fila de la tabla "ASISTENCIA Y PUNTUALIDAD" por bimestre. */
export interface BoletaAsistencia {
  bimestre:      number;
  tardanza:      number;
  faltas_just:   number;
  faltas_injust: number;
}

/** Estructura completa de la boleta de un alumno para el año lectivo. */
export interface BoletaData {
  institucion: {
    nombre:        string;
    niveles_texto: string; // "INICIAL – PRIMARIA - SECUNDARIA"
  };
  alumno: {
    nombre:  string;
    salon:   string;         // grado + sección, ej. "3° A"
    nivel:   string;         // "SECUNDARIA"
    dni:     string | null;
  };
  tutor:      string | null;
  anio:       number | string;
  /** Números de bimestre a mostrar como columnas (siempre [1,2,3,4]). */
  bimestres:  number[];
  areas:      BoletaArea[];
  asistencia: BoletaAsistencia[];
}
