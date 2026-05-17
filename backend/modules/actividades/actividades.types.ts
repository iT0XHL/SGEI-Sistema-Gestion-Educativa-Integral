// ============================================================
//  modules/actividades/actividades.types.ts
// ============================================================
import type { TipoActividad, EstadoEntrega } from '@prisma/client';

export interface ActividadRow {
  id: string;
  docente_id: string;
  curso_id: string;
  seccion_id: string;
  titulo: string;
  descripcion: string | null;
  tipo: TipoActividad | null;
  fecha_asignacion: Date;
  fecha_limite: Date;
  puntaje_maximo: number;
  url_adjunto: string | null;
}

export interface EntregaRow {
  id: string;
  actividad_id: string;
  alumno_id: string;
  estado: EstadoEntrega;
  url_archivo: string | null;
  comentario_alumno: string | null;
  fecha_entrega: Date;
  nota: number | null;
  observacion_docente: string | null;
  fecha_calificacion: Date | null;
}
