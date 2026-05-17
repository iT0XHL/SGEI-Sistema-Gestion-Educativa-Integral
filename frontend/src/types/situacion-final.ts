export type SituacionFinal =
  | 'Promovido'
  | 'Repitente'
  | 'Retirado'
  | 'Trasladado'
  | 'Fallecido';

export const SITUACION_FINAL_LABEL: Record<SituacionFinal, string> = {
  Promovido:  'Promovido',
  Repitente:  'Repitente',
  Retirado:   'Retirado',
  Trasladado: 'Trasladado',
  Fallecido:  'Fallecido',
};

export interface SituacionFinalAlumno {
  id:                        string;
  alumno_id:                 string;
  periodo_id:                string;
  situacion_final:           SituacionFinal;
  numero_areas_desaprobadas: number;
  comportamiento:            string | null;
  motivo_retiro:             string | null;
  observaciones:             string | null;
  registrado_por:            string;
  fecha_registro:            string;
  alumno?: {
    nombres:          string;
    apellido_paterno: string;
    apellido_materno: string;
    dni:              string;
  };
  periodo?: {
    nombre: string;
    año:    number;
  };
}

export interface UpsertSfaPayload {
  alumno_id:                 string;
  periodo_id:                string;
  situacion_final:           SituacionFinal;
  numero_areas_desaprobadas?: number;
  comportamiento?:           string;
  motivo_retiro?:            string;
  observaciones?:            string;
}
