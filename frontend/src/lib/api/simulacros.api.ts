import { apiClient } from './client';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001';

/** URL absoluta del PDF del examen (descarga directa con cookie de sesión). */
export function examenPdfUrl(simulacroId: string, gradoId: string, tipo: 'cuestionario' | 'balotario'): string {
  return `${API_BASE}/api/simulacros/${simulacroId}/examen/${gradoId}/pdf?tipo=${tipo}`;
}

// ── Tipos ─────────────────────────────────────────────────────────
export type EstadoSimulacro = 'Borrador' | 'Activo' | 'Concluido';
export type Letra = 'A' | 'B' | 'C' | 'D' | 'E';

export interface SimulacroDTO {
  id:          string;
  periodo_id:  string;
  bimestre_id: string | null;
  numero:      number;
  nombre:      string;
  estado:      EstadoSimulacro;
  created_at:  string;
  bimestre?:   { id: string; numero: number; nombre: string } | null;
  _count?:     { preguntas: number; examenes: number };
}

export interface CursoSimple { id: string; nombre: string }
export interface GradoSimple {
  id: string; nombre: string; orden: number;
  nivel: { id: string; nombre: string };
}

export interface CargaDocente {
  /** Simulacro activo (si lo hay). */
  simulacro:        SimulacroDTO | null;
  /** Primer simulacro en Borrador que el docente puede activar (si no hay activo). */
  proximoSimulacro: SimulacroDTO | null;
  periodo:          { id: string; nombre: string };
  /** Cursos (asignaturas) y grados que enseña el docente. */
  cursos:           CursoSimple[];
  grados:           GradoSimple[];
}

export interface PreguntaDTO {
  id:                 string;
  simulacro_id:       string | null;
  docente_id:         string;
  curso_id:           string;
  grado_id:           string;
  seccion_id:         string | null;
  enunciado:          string;
  imagen_url:         string | null;
  alt_a: string; alt_b: string; alt_c: string; alt_d: string; alt_e: string;
  respuesta_correcta: Letra;
  orden:              number;
}

export interface PreguntaInput {
  enunciado:          string;
  imagen_url?:        string | null;
  alt_a: string; alt_b: string; alt_c: string; alt_d: string; alt_e: string;
  respuesta_correcta: Letra;
}

export interface GuardarPreguntasPayload {
  curso_id:   string;
  grado_id:   string;
  seccion_id?: string | null;
  preguntas:  PreguntaInput[]; // exactamente 5
}

// ── API Docente / global ──────────────────────────────────────────
export const simulacrosApi = {
  /** Simulacro activo (cualquier rol). null si no hay. */
  activo(): Promise<SimulacroDTO | null> {
    return apiClient.get<SimulacroDTO | null>('/api/simulacros/activo');
  },

  /** Carga del docente: cascada Nivel▸Grado▸Sección▸Curso + simulacro activo. */
  carga(): Promise<CargaDocente> {
    return apiClient.get<CargaDocente>('/api/simulacros/activo/carga');
  },

  /** Preguntas ya guardadas por el docente para un curso+grado. */
  misPreguntas(params: { cursoId?: string; gradoId?: string; seccionId?: string }): Promise<PreguntaDTO[]> {
    const q: Record<string, string> = {};
    if (params.cursoId) q.cursoId = params.cursoId;
    if (params.gradoId) q.gradoId = params.gradoId;
    if (params.seccionId) q.seccionId = params.seccionId;
    return apiClient.get<PreguntaDTO[]>('/api/simulacros/activo/preguntas', Object.keys(q).length ? q : undefined);
  },

  /** Guarda (reemplaza) el bloque de 5 preguntas. */
  guardarPreguntas(payload: GuardarPreguntasPayload): Promise<PreguntaDTO[]> {
    return apiClient.post<PreguntaDTO[]>('/api/simulacros/activo/preguntas', payload);
  },

  /** Sube una imagen (pegada o seleccionada) y devuelve su URL. */
  subirImagen(file: File): Promise<{ url: string }> {
    const fd = new FormData();
    fd.append('file', file);
    return apiClient.postFormData<{ url: string }>('/api/simulacros/activo/preguntas/imagen', fd);
  },

  /** Cambia estado del simulacro (Docente solo puede activar). */
  cambiarEstado(id: string, estado: EstadoSimulacro): Promise<SimulacroDTO> {
    return apiClient.patch<SimulacroDTO>(`/api/simulacros/${id}/estado`, { estado });
  },
};

// ── Examen oficial (curaduría Admin) ──────────────────────────────
// El examen guarda un snapshot del contenido (documento inmutable).
export interface ExamenPreguntaDTO {
  id:                 string;
  orden:              number;
  pregunta_id:        string | null;
  enunciado:          string | null;
  imagen_url:         string | null;
  alt_a: string | null; alt_b: string | null; alt_c: string | null; alt_d: string | null; alt_e: string | null;
  respuesta_correcta: Letra | null;
}
export interface ExamenCursoDTO {
  id:        string;
  curso_id:  string;
  grado_id:  string;
  orden:     number;
  curso:     { id: string; nombre: string };
  preguntas: ExamenPreguntaDTO[];
}
export interface GuardarExamenPayload {
  grado_id: string;
  cursos: Array<{ curso_id: string; orden: number; pregunta_ids: string[] }>;
}

// ── API Admin ─────────────────────────────────────────────────────
export const simulacrosAdminApi = {
  listar(periodoId?: string): Promise<SimulacroDTO[]> {
    return apiClient.get<SimulacroDTO[]>('/api/simulacros', periodoId ? { periodoId } : undefined);
  },
  crear(payload: { numero: number; nombre: string; bimestre_id?: string | null }): Promise<SimulacroDTO> {
    return apiClient.post<SimulacroDTO>('/api/simulacros', payload);
  },
  cambiarEstado(id: string, estado: EstadoSimulacro): Promise<SimulacroDTO> {
    return apiClient.patch<SimulacroDTO>(`/api/simulacros/${id}/estado`, { estado });
  },
  curaduria(simulacroId: string, filters: { nivelId?: string; gradoId?: string; seccionId?: string; cursoId?: string } = {}): Promise<PreguntaDTO[]> {
    const q: Record<string, string> = {};
    if (filters.nivelId) q.nivelId = filters.nivelId;
    if (filters.gradoId) q.gradoId = filters.gradoId;
    if (filters.seccionId) q.seccionId = filters.seccionId;
    if (filters.cursoId) q.cursoId = filters.cursoId;
    return apiClient.get<PreguntaDTO[]>(`/api/simulacros/${simulacroId}/preguntas`, Object.keys(q).length ? q : undefined);
  },
  getExamen(simulacroId: string, gradoId: string): Promise<ExamenCursoDTO[]> {
    return apiClient.get<ExamenCursoDTO[]>(`/api/simulacros/${simulacroId}/examen`, { gradoId });
  },
  guardarExamen(simulacroId: string, payload: GuardarExamenPayload): Promise<ExamenCursoDTO[]> {
    return apiClient.put<ExamenCursoDTO[]>(`/api/simulacros/${simulacroId}/examen`, payload);
  },
};
