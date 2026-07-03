// Franjas horarias fijas usadas tanto por el selector de horas del modal
// de creación/edición como por las filas de la grilla semanal.
export const HOURS = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];

export const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

export const DAY_TO_NUMBER: Record<string, number> = {
  Lunes: 1, Martes: 2, Miércoles: 3, Jueves: 4, Viernes: 5,
};

export const NUMBER_TO_DAY: Record<number, string> = {
  1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes',
};

/** true si los rangos [aInicio,aFin) y [bInicio,bFin) (strings "HH:MM") se solapan. */
export function seSolapan(aInicio: string, aFin: string, bInicio: string, bFin: string): boolean {
  return aInicio < bFin && bInicio < aFin;
}

/** Opciones de hora en incrementos de 5 min — el Recreo/Refrigerio no encaja en horas exactas. */
export const DESCANSO_HOURS: string[] = (() => {
  const opts: string[] = [];
  for (let h = 7; h <= 17; h++) {
    for (let m = 0; m < 60; m += 5) {
      if (h === 17 && m > 0) break;
      opts.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return opts;
})();
