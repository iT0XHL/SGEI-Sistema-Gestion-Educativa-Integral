// ============================================================
//  types/actividad.ts — Tipos para actividades y entregas.
//  tipo_actividad: tarea | practica | evaluacion | proyecto
//  estado_entrega: pendiente | entregado | calificado
// ============================================================

export type TipoActividad = 'tarea' | 'practica' | 'evaluacion' | 'proyecto';
export type EstadoEntrega = 'pendiente' | 'entregado' | 'calificado';

export interface ActividadBase {
  id: string;
  docente_id: string;
  curso_id: string;
  seccion_id: string;
  titulo: string;
  descripcion: string | null;
  tipo: TipoActividad | null;
  fecha_asignacion: string;
  fecha_limite: string;
  puntaje_maximo: number;
  url_adjunto: string | null;
}

export interface Actividad extends ActividadBase {
  docente?: { id: string; nombres: string; apellido_paterno: string };
  curso?: { id: string; nombre: string };
  seccion?: { id: string; nombre: string; grado?: { id: string; nombre: string } };
}

export interface EntregaBase {
  id: string;
  actividad_id: string;
  alumno_id: string;
  estado: EstadoEntrega;
  url_archivo: string | null;
  comentario_alumno: string | null;
  fecha_entrega: string;
  nota: number | null;
  observacion_docente: string | null;
  fecha_calificacion: string | null;
}

export interface Entrega extends EntregaBase {
  alumno?: {
    id: string;
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string;
    dni: string;
  };
  actividad?: { id: string; titulo: string; puntaje_maximo: number };
}

export interface CreateActividadPayload {
  curso_id: string;
  seccion_id: string;
  titulo: string;
  descripcion?: string | null;
  tipo?: TipoActividad;
  fecha_limite: string;
  puntaje_maximo: number;
  url_adjunto?: string | null;
}

export interface UpdateActividadPayload {
  titulo?: string;
  descripcion?: string | null;
  tipo?: TipoActividad;
  fecha_limite?: string;
  puntaje_maximo?: number;
  url_adjunto?: string | null;
}

export interface SubmitEntregaPayload {
  comentario_alumno?: string | null;
}

export interface CalificarEntregaPayload {
  nota?: number | null;
  observacion_docente?: string | null;
  estado?: EstadoEntrega;
}
