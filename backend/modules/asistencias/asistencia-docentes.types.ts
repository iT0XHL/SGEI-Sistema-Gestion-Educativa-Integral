// ============================================================
//  modules/asistencias/asistencia-docentes.types.ts
// ============================================================
import type { EstadoAsistencia } from '@prisma/client';

export interface AsistenciaDocenteRow {
  id: string;
  docente_id: string;
  registrado_por: string;
  fecha: Date;
  estado: EstadoAsistencia;
  justificacion: string | null;
  hora_registro: Date;
}
