import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

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
  nota_literal:     string | null;
  tipo_evaluacion:  string;
  observacion:      string | null;
  cerrada:          boolean;
  fecha_registro:   Date | null;
  bloquea_libreta:  boolean;
}

export const LibretaRepository = {
  async obtener(alumnoId: string, bimestreId?: string): Promise<LibretaRow[]> {
    const rows = await prisma.$queryRaw<LibretaRow[]>`
      SELECT
        alumno_id,
        alumno_nombre,
        grado,
        seccion,
        curso,
        competencia,
        tipo_competencia,
        bimestre,
        nombre_bimestre,
        nota_vigesimal,
        nota_literal,
        tipo_evaluacion,
        observacion,
        cerrada,
        fecha_registro,
        bloquea_libreta
      FROM academic_schema.mv_libreta_alumno
      WHERE alumno_id = ${Prisma.sql`${alumnoId}::uuid`}
        ${bimestreId ? Prisma.sql`AND bimestre = (
            SELECT numero FROM academic_schema.bimestre WHERE id = ${bimestreId}::uuid
          )` : Prisma.sql``}
      ORDER BY curso, bimestre, competencia
    `;

    return rows.map((r) => ({
      ...r,
      nota_vigesimal: r.nota_vigesimal !== null ? parseFloat(String(r.nota_vigesimal)) : null,
    }));
  },

  async bloqueoActivo(alumnoId: string): Promise<boolean> {
    const rows = await prisma.$queryRaw<[{ bloquea: boolean }]>`
      SELECT financial_schema.fn_bloquea_libreta(${alumnoId}::uuid) AS bloquea
    `;
    return rows[0]?.bloquea ?? false;
  },
};
