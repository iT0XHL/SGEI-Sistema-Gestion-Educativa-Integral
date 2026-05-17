// ============================================================
//  modules/asistencias/asistencia-alumnos.types.ts
// ============================================================
import type { EstadoAsistencia } from '@prisma/client';

export interface AsistenciaRow {
  id: string;
  alumno_id: string;
  seccion_id: string;
  fecha: Date;
  estado: EstadoAsistencia;
  justificacion: string | null;
  registrado_por: string;
  hora_registro: Date;
}

export interface ResumenAsistenciaRow {
  alumno_id: string;
  alumno_nombre: string;
  seccion_id: string;
  total_presentes: bigint;
  total_faltas: bigint;
  total_tardanzas: bigint;
  total_justificados: bigint;
  total_dias_registrados: bigint;
  porcentaje_asistencia: number | null;
}

export interface AsistenciaConAlumno extends AsistenciaRow {
  alumno: {
    id: string;
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string;
    dni: string;
  };
}
