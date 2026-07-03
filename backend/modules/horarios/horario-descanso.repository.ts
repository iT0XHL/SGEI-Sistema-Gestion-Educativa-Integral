// ============================================================
//  modules/horarios/horario-descanso.repository.ts
//  El tipo TIME se maneja con SQL crudo, igual que HorarioRepo en
//  academic.repository.ts (Prisma maneja mal el tipo TIME).
// ============================================================
import { prisma } from '@/lib/prisma';

export interface DescansoRow {
  nivel_id: string;
  nivel_nombre: string;
  tipo: 'RECREO' | 'REFRIGERIO';
  hora_inicio: string;
  hora_fin: string;
}

export const HorarioDescansoRepository = {
  listarPorNiveles(nivelIds: string[], periodoId: string) {
    return prisma.$queryRaw<DescansoRow[]>`
      SELECT d.nivel_id, n.nombre AS nivel_nombre, d.tipo,
             to_char(d.hora_inicio, 'HH24:MI') AS hora_inicio,
             to_char(d.hora_fin,    'HH24:MI') AS hora_fin
      FROM   academic_schema.horario_descanso d
      JOIN   academic_schema.nivel            n ON n.id = d.nivel_id
      WHERE  d.periodo_id = ${periodoId}::uuid
        AND  d.nivel_id = ANY(${nivelIds}::uuid[])
      ORDER  BY d.hora_inicio
    `;
  },

  async upsert(input: {
    nivelId: string;
    periodoId: string;
    tipo: 'RECREO' | 'REFRIGERIO';
    horaInicio: string;
    horaFin: string;
  }): Promise<DescansoRow> {
    const rows = await prisma.$queryRaw<DescansoRow[]>`
      INSERT INTO academic_schema.horario_descanso (nivel_id, periodo_id, tipo, hora_inicio, hora_fin)
      VALUES (${input.nivelId}::uuid, ${input.periodoId}::uuid, ${input.tipo}, ${input.horaInicio}::time, ${input.horaFin}::time)
      ON CONFLICT (nivel_id, periodo_id, tipo)
      DO UPDATE SET hora_inicio = EXCLUDED.hora_inicio, hora_fin = EXCLUDED.hora_fin
      RETURNING nivel_id, ${input.tipo} AS tipo,
                to_char(hora_inicio, 'HH24:MI') AS hora_inicio,
                to_char(hora_fin,    'HH24:MI') AS hora_fin
    `;
    const nivel = await prisma.nivel.findUnique({ where: { id: input.nivelId }, select: { nombre: true } });
    return { ...rows[0]!, nivel_nombre: nivel?.nombre ?? '' };
  },
};
