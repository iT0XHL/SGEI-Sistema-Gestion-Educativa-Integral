export type EstadoLibreta =
  | 'BORRADOR'
  | 'EN_REVISION'
  | 'OBSERVADA'
  | 'APROBADA'
  | 'PUBLICADA'
  | 'BLOQUEADA'
  | 'ANULADA';

export interface LibretaDTO {
  id: string;
  alumno_id: string;
  periodo_id: string;
  bimestre_id: string;
  estado: EstadoLibreta;
  version: number;
  fecha_generacion: string | null;
  fecha_publicacion: string | null;
  bloqueada: boolean;
}

export interface RecepcionRow {
  docente_id: string;
  docente_nombre: string;
  curso_id: string;
  curso_nombre: string;
  grado: string;
  seccion_id: string;
  seccion_nombre: string;
  bimestre_numero: number;
  bimestre_nombre: string;
  total_alumnos: number;
  notas_esperadas: number;
  notas_registradas: number;
  cerrada: boolean;
  estado: 'Pendiente' | 'Parcial' | 'Completo' | 'Cerrado por docente' | 'Observado' | 'Validado por secretaría';
}

export interface ResumenAlumnoLibreta {
  alumno_id: string;
  alumno_nombre: string;
  total_competencias: number;
  notas_registradas: number;
  notas_completas: boolean;
  libreta_estado: string | null;
  libreta_id: string | null;
  bloquea: boolean;
}

export const ESTADO_LIBRETA_LABEL: Record<EstadoLibreta, string> = {
  BORRADOR: 'Borrador',
  EN_REVISION: 'En revisión',
  OBSERVADA: 'Observada',
  APROBADA: 'Aprobada',
  PUBLICADA: 'Publicada',
  BLOQUEADA: 'Bloqueada',
  ANULADA: 'Anulada',
};

export const ESTADO_LIBRETA_COLOR: Record<EstadoLibreta, string> = {
  BORRADOR:    'bg-slate-100 text-slate-700 border-slate-300',
  EN_REVISION: 'bg-blue-50 text-blue-700 border-blue-300',
  OBSERVADA:   'bg-amber-50 text-amber-700 border-amber-300',
  APROBADA:    'bg-emerald-50 text-emerald-700 border-emerald-300',
  PUBLICADA:   'bg-green-50 text-green-700 border-green-300',
  BLOQUEADA:   'bg-red-50 text-red-700 border-red-300',
  ANULADA:     'bg-slate-100 text-slate-500 border-slate-300',
};
