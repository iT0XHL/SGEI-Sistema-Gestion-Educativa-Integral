import { apiClient } from './client';

export interface HorarioRow {
  id: string;
  asignacion_id: string;
  dia_semana: number; // 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb
  hora_inicio: string; // 'HH:MM'
  hora_fin: string;    // 'HH:MM'
  aula: string | null;
  curso: string;
  seccion: string;
  docente: string;
}

const DIA_LABEL: Record<number, string> = {
  1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb',
};

/** Filtra los bloques de horario por nombre de curso y devuelve "Lun/Mié 08:00–09:00". */
export function formatHorarioCurso(rows: HorarioRow[], cursoNombre: string): string {
  const mine = rows.filter(r => r.curso === cursoNombre);
  if (mine.length === 0) return '';
  const dias = [...new Set(mine.map(r => DIA_LABEL[r.dia_semana] ?? `D${r.dia_semana}`))].join('/');
  const first = mine[0]!;
  return `${dias} ${first.hora_inicio}–${first.hora_fin}`;
}

export const horariosApi = {
  listar(params: { seccionId?: string; periodoId?: string } = {}): Promise<HorarioRow[]> {
    const q: Record<string, string> = {};
    if (params.seccionId) q.seccionId = params.seccionId;
    if (params.periodoId) q.periodoId = params.periodoId;
    return apiClient.get<HorarioRow[]>('/api/horarios', Object.keys(q).length ? q : undefined);
  },
};
