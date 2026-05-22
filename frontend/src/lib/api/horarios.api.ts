import { apiClient } from './client';

export interface HorarioRow {
  id: string;
  asignacion_id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  aula: string | null;
  curso: string;
  seccion: string;
  docente: string;
}

export interface AsignacionRow {
  id: string;
  docente_id: string;
  curso_id: string;
  seccion_id: string;
  periodo_id: string;
  activo: boolean;
  docente: { id: string; nombres: string; apellido_paterno: string };
  curso: { id: string; nombre: string };
  seccion: { id: string; nombre: string };
}

export interface DocenteRow {
  id: string;
  dni: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  especialidad: string;
  activo: boolean;
}

export interface CursoRow {
  id: string;
  nombre: string;
  nivel_id: string;
}

export interface SeccionRow {
  id: string;
  nombre: string;
  grado_id: string;
  periodo_id: string;
  grado: { id: string; nombre: string; nivel: { id: string; nombre: string } };
}

export interface PeriodoRow {
  id: string;
  anio: number;
  nombre: string;
  activo: boolean;
}

export interface GradoRow {
  id: string;
  nombre: string;
  nivel_id: string;
}

const DIA_LABEL: Record<number, string> = {
  1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb',
};

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

  crear(payload: {
    asignacion_id: string;
    dia_semana: number;
    hora_inicio: string;
    hora_fin: string;
    aula?: string | null;
  }): Promise<HorarioRow> {
    return apiClient.post<HorarioRow>('/api/horarios', payload);
  },

  actualizar(id: string, payload: {
    dia_semana?: number;
    hora_inicio?: string;
    hora_fin?: string;
    aula?: string | null;
  }): Promise<{ id: string; actualizado: boolean }> {
    return apiClient.patch(`/api/horarios/${id}`, payload);
  },

  eliminar(id: string): Promise<{ id: string; eliminado: boolean }> {
    return apiClient.delete(`/api/horarios/${id}`);
  },
};

export const asignacionesApi = {
  listar(params: {
    periodoId?: string;
    seccionId?: string;
    docenteId?: string;
  } = {}): Promise<AsignacionRow[]> {
    const q: Record<string, string> = {};
    if (params.periodoId) q.periodoId = params.periodoId;
    if (params.seccionId) q.seccionId = params.seccionId;
    if (params.docenteId) q.docenteId = params.docenteId;
    return apiClient.get<AsignacionRow[]>('/api/asignaciones', Object.keys(q).length ? q : undefined);
  },

  crear(payload: {
    docente_id: string;
    curso_id: string;
    seccion_id: string;
    periodo_id: string;
  }): Promise<AsignacionRow> {
    return apiClient.post<AsignacionRow>('/api/asignaciones', payload);
  },

  eliminar(id: string): Promise<{ id: string; desactivada: boolean }> {
    return apiClient.delete(`/api/asignaciones/${id}`);
  },
};

// ─────────────────────────────────────────────────────────────────────
// Funciones auxiliares para cargar datos maestros desde BD
// ─────────────────────────────────────────────────────────────────────

export interface ApiPaginatedResponse<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export async function cargarDocentes(): Promise<DocenteRow[]> {
  try {
    const response = await apiClient.get<ApiPaginatedResponse<DocenteRow>>('/api/docentes', {
      page: '1',
      limit: '500',
      activo: 'true',
    });
    return response.items;
  } catch (err) {
    console.error('Error loading docentes:', err);
    return [];
  }
}

export async function cargarCursos(): Promise<CursoRow[]> {
  try {
    const response = await apiClient.get<CursoRow[]>('/api/cursos');
    return Array.isArray(response) ? response : [];
  } catch (err) {
    console.error('Error loading cursos:', err);
    return [];
  }
}

export async function cargarSecciones(periodoId?: string): Promise<SeccionRow[]> {
  try {
    const q: Record<string, string> = {};
    if (periodoId) q.periodoId = periodoId;
    const response = await apiClient.get<SeccionRow[]>('/api/secciones', Object.keys(q).length ? q : undefined);
    return Array.isArray(response) ? response : [];
  } catch (err) {
    console.error('Error loading secciones:', err);
    return [];
  }
}

export async function cargarGrados(): Promise<GradoRow[]> {
  try {
    const response = await apiClient.get<GradoRow[]>('/api/grados');
    return Array.isArray(response) ? response : [];
  } catch (err) {
    console.error('Error loading grados:', err);
    return [];
  }
}

export async function cargarPeriodos(): Promise<PeriodoRow[]> {
  try {
    const response = await apiClient.get<PeriodoRow[] | ApiPaginatedResponse<PeriodoRow>>('/api/periodos');
    return Array.isArray(response) ? response : response.items;
  } catch (err) {
    console.error('Error loading periodos:', err);
    return [];
  }
}

export async function obtenerPeriodoActivo(): Promise<PeriodoRow | null> {
  const periodos = await cargarPeriodos();
  return periodos.find(p => p.activo) || null;
}

export async function resolveDocenteById(id: string): Promise<DocenteRow | null> {
  const docentes = await cargarDocentes();
  return docentes.find(d => d.id === id) || null;
}

export async function resolveCursoById(id: string): Promise<CursoRow | null> {
  const cursos = await cargarCursos();
  return cursos.find(c => c.id === id) || null;
}

export async function resolveSeccionById(id: string): Promise<SeccionRow | null> {
  const secciones = await cargarSecciones();
  return secciones.find(s => s.id === id) || null;
}
