// ============================================================
//  modules/horarios/nivel-horario-config.repository.ts
//  El tipo TIME se maneja con SQL crudo, igual que HorarioDescansoRepository.
// ============================================================
import { prisma } from '@/lib/prisma';

export interface JornadaConfigRow {
  nivel_id: string;
  hora_inicio_jornada: string;
  duracion_hora_min: number;
  total_horas_dia: number;
}

const DEFAULT_HORA_INICIO = '07:30';
const DEFAULT_DURACION_MIN = 50;
const DEFAULT_TOTAL_HORAS_DIA = 8;

export const NivelHorarioConfigRepository = {
  async get(nivelId: string, periodoId: string): Promise<JornadaConfigRow | null> {
    const rows = await prisma.$queryRaw<JornadaConfigRow[]>`
      SELECT nivel_id,
             to_char(hora_inicio_jornada, 'HH24:MI') AS hora_inicio_jornada,
             duracion_hora_min, total_horas_dia
      FROM   academic_schema.nivel_horario_config
      WHERE  nivel_id = ${nivelId}::uuid AND periodo_id = ${periodoId}::uuid
    `;
    return rows[0] ?? null;
  },

  /** Devuelve la config configurada, o el default (07:30 / 50 min / 8 horas) si el nivel aún no la tiene. */
  async getOrDefault(nivelId: string, periodoId: string): Promise<JornadaConfigRow> {
    const existente = await this.get(nivelId, periodoId);
    if (existente) return existente;
    return { nivel_id: nivelId, hora_inicio_jornada: DEFAULT_HORA_INICIO, duracion_hora_min: DEFAULT_DURACION_MIN, total_horas_dia: DEFAULT_TOTAL_HORAS_DIA };
  },

  async listarPorNiveles(nivelIds: string[], periodoId: string): Promise<JornadaConfigRow[]> {
    if (nivelIds.length === 0) return [];
    const rows = await prisma.$queryRaw<JornadaConfigRow[]>`
      SELECT nivel_id,
             to_char(hora_inicio_jornada, 'HH24:MI') AS hora_inicio_jornada,
             duracion_hora_min, total_horas_dia
      FROM   academic_schema.nivel_horario_config
      WHERE  periodo_id = ${periodoId}::uuid AND nivel_id = ANY(${nivelIds}::uuid[])
    `;
    const encontrados = new Set(rows.map((r) => r.nivel_id));
    const faltantes = nivelIds.filter((id) => !encontrados.has(id));
    return [
      ...rows,
      ...faltantes.map((id) => ({ nivel_id: id, hora_inicio_jornada: DEFAULT_HORA_INICIO, duracion_hora_min: DEFAULT_DURACION_MIN, total_horas_dia: DEFAULT_TOTAL_HORAS_DIA })),
    ];
  },

  async upsert(input: { nivelId: string; periodoId: string; horaInicioJornada: string; duracionHoraMin: number; totalHorasDia: number }): Promise<JornadaConfigRow> {
    const rows = await prisma.$queryRaw<JornadaConfigRow[]>`
      INSERT INTO academic_schema.nivel_horario_config (nivel_id, periodo_id, hora_inicio_jornada, duracion_hora_min, total_horas_dia)
      VALUES (${input.nivelId}::uuid, ${input.periodoId}::uuid, ${input.horaInicioJornada}::time, ${input.duracionHoraMin}, ${input.totalHorasDia})
      ON CONFLICT (nivel_id, periodo_id)
      DO UPDATE SET hora_inicio_jornada = EXCLUDED.hora_inicio_jornada, duracion_hora_min = EXCLUDED.duracion_hora_min, total_horas_dia = EXCLUDED.total_horas_dia
      RETURNING nivel_id, to_char(hora_inicio_jornada, 'HH24:MI') AS hora_inicio_jornada, duracion_hora_min, total_horas_dia
    `;
    return rows[0]!;
  },
};
