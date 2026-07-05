// ── Enums ────────────────────────────────────────────────────
export type NotaLiteral     = 'AD' | 'A' | 'B' | 'C';
export type TipoEvaluacion  = 'Final' | 'Recuperacion' | 'Ubicacion' | 'Estudio_Independiente';

// ── Entidad nota (tal como devuelve el backend) ───────────────
export interface Nota {
  id:              string;
  alumno_id:       string;
  competencia_id:  string;
  bimestre_id:     string;
  docente_id:      string;
  nota_vigesimal:  number;
  nota_literal:    NotaLiteral;
  tipo_evaluacion: TipoEvaluacion;
  cerrada:         boolean;
  observacion:     string | null;
  fecha_registro:  string;
  alumno?: {
    nombres:          string;
    apellido_paterno: string;
    apellido_materno: string;
  };
  competencia?: {
    nombre: string;
    tipo:   string;
    curso?: { id: string; nombre: string };
  };
  bimestre?: {
    nombre: string;
    numero: number;
  };
  historial?: HistorialNota[];
}

export interface HistorialNota {
  id:               string;
  nota_id:          string;
  valor_anterior:   number;
  literal_anterior: NotaLiteral;
  valor_nuevo:      number;
  literal_nuevo:    NotaLiteral;
  modificado_por:   string;
  motivo:           string;
  fecha:            string;
}

// ── Payloads de entrada ───────────────────────────────────────
export interface NotaItem {
  alumno_id:       string;
  competencia_id:  string;
  bimestre_id:     string;
  nota_vigesimal:  number;
  tipo_evaluacion?: TipoEvaluacion;
  observacion?:    string | null;
}

export interface UpsertBatchNotaPayload {
  notas: NotaItem[];
}

export interface UpdateNotaPayload {
  nota_vigesimal?:  number;
  tipo_evaluacion?: TipoEvaluacion;
  observacion?:     string | null;
}

export interface DesbloquearNotaPayload {
  valor_nuevo: number;
  motivo:      string;
}

// ── Fila de libreta (mv_libreta_alumno) ───────────────────────
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
  nota_literal:     NotaLiteral | null;
  tipo_evaluacion:  TipoEvaluacion;
  observacion:      string | null;
  cerrada:          boolean;
  fecha_registro:   string | null;
  bloquea_libreta:  boolean;
}

// ── Libreta agrupada (área → curso → criterio, con pesos) ─────
export interface LibretaRowDetallada extends LibretaRow {
  curso_id:       string;
  competencia_id: string;
  area_id:        string | null;
  area_nombre:    string | null;
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

// ── Label helpers ─────────────────────────────────────────────
export const TIPO_EVALUACION_LABEL: Record<TipoEvaluacion, string> = {
  Final:                'Final',
  Recuperacion:         'Recuperación',
  Ubicacion:            'Ubicación',
  Estudio_Independiente: 'Estudio Independiente',
};
