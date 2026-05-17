export interface SiagieStats {
  total_alumnos:             number;
  alumnos_con_notas:         number;
  notas_fuera_rango:         number;
  alumnos_sin_codigo_siagie: number;
}

export type ValidacionStatus = 'ok' | 'warning' | 'error';

export interface SiagieValidacion {
  id:     string;
  label:  string;
  status: ValidacionStatus;
  detail: string;
}
