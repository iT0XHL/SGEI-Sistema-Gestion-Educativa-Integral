// ============================================================
//  types/asistencia.ts — Tipos de dominio para asistencia.
//  Los estados del SQL son: P | F | T | J
//  La UI docente usa: present | absent | late | justified
// ============================================================

/** Estado de asistencia según el SQL (academic_schema.estado_asistencia). */
export type EstadoAsistencia = 'P' | 'F' | 'T' | 'J';

/** Estado de asistencia en la UI del frontend. */
export type EstadoAsistenciaUI = 'present' | 'absent' | 'late' | 'justified';

/** Mapeo UI → DB */
export const UI_TO_DB: Record<EstadoAsistenciaUI, EstadoAsistencia> = {
  present: 'P',
  absent: 'F',
  late: 'T',
  justified: 'J',
};

/** Mapeo DB → UI */
export const DB_TO_UI: Record<EstadoAsistencia, EstadoAsistenciaUI> = {
  P: 'present',
  F: 'absent',
  T: 'late',
  J: 'justified',
};

export interface AlumnoResumen {
  id: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  dni: string;
}

export interface AsistenciaRegistro {
  id: string;
  alumno_id: string;
  seccion_id: string;
  fecha: string;
  estado: EstadoAsistencia;
  justificacion: string | null;
  registrado_por: string;
  hora_registro: string;
  alumno?: AlumnoResumen;
}

export interface GuardarAsistenciaPayload {
  seccion_id: string;
  fecha: string;
  registros: Array<{
    alumno_id: string;
    estado: EstadoAsistencia;
    justificacion?: string | null;
  }>;
}

export interface ResumenAsistencia {
  alumno_id: string;
  alumno_nombre: string;
  seccion_id: string;
  total_presentes: number;
  total_faltas: number;
  total_tardanzas: number;
  total_justificados: number;
  total_dias_registrados: number;
  porcentaje_asistencia: number | null;
}

export interface AsistenciaDocenteRegistro {
  id: string;
  docente_id: string;
  registrado_por: string;
  fecha: string;
  estado: EstadoAsistencia;
  justificacion: string | null;
  hora_registro: string;
  docente?: {
    id: string;
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string;
    especialidad: string;
  };
}
