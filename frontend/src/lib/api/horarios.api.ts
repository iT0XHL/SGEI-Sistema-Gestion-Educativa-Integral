import { apiClient, BASE_URL } from './client';

export interface HorarioRow {
  id: string;
  asignacion_id: string;
  docente_id: string;
  seccion_id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  aula: string | null;
  curso: string;
  seccion: string;
  grado: string;
  nivel: string;
  docente: string;
}

export interface HorarioPublicacionDocenteRow {
  id: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  total_bloques: number;
  publicado: boolean;
  fecha_publicacion: string | null;
}

export interface HorarioPublicacionSeccionRow {
  id: string;
  nombre: string;
  grado: string;
  nivel: string;
  total_bloques: number;
  publicado: boolean;
  fecha_publicacion: string | null;
}

export interface HorarioPublicadoBloque {
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  aula: string | null;
  curso: string;
  docente: string;
  seccion: string;
  grado: string;
  nivel: string;
}

export interface DescansoDTO {
  nivel_id: string;
  nivel_nombre: string;
  tipo: 'RECREO' | 'REFRIGERIO';
  hora_inicio: string;
  hora_fin: string;
}

export interface HorarioPublicadoDTO {
  fecha_publicacion: string;
  bloques: HorarioPublicadoBloque[];
  descansos: DescansoDTO[];
}

export interface NivelRow {
  id: string;
  nombre: string;
  descripcion: string | null;
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
  listar(params: { seccionId?: string; periodoId?: string; docenteId?: string } = {}): Promise<HorarioRow[]> {
    const q: Record<string, string> = {};
    if (params.seccionId) q.seccionId = params.seccionId;
    if (params.periodoId) q.periodoId = params.periodoId;
    if (params.docenteId) q.docenteId = params.docenteId;
    return apiClient.get<HorarioRow[]>('/api/horarios', Object.keys(q).length ? q : undefined);
  },

  /** Dispara la descarga del PDF de horario (por docente, sección, completo, o masivo "docentes"/"secciones") — bloques BORRADOR (solo Admin). */
  async descargarPdf(params: { tipo: 'docente' | 'seccion' | 'completo' | 'docentes' | 'secciones'; id?: string; periodoId?: string }): Promise<Blob> {
    const q = new URLSearchParams({ tipo: params.tipo });
    if (params.id) q.set('id', params.id);
    if (params.periodoId) q.set('periodoId', params.periodoId);
    const res = await fetch(`${BASE_URL}/api/horarios/export/pdf?${q.toString()}`, { credentials: 'include' });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error((json as { error?: { message?: string } })?.error?.message ?? `Error al generar PDF (${res.status})`);
    }
    return res.blob();
  },

  /** Dispara la descarga del PDF del horario PUBLICADO de un Docente o Alumno (usable por ellos mismos, o por Admin). */
  async descargarPdfPublicado(params: { tipo: 'docente' | 'alumno'; id: string; periodoId?: string }): Promise<Blob> {
    const q = new URLSearchParams({ tipo: params.tipo, id: params.id });
    if (params.periodoId) q.set('periodoId', params.periodoId);
    const res = await fetch(`${BASE_URL}/api/horarios/export/publicado/pdf?${q.toString()}`, { credentials: 'include' });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error((json as { error?: { message?: string } })?.error?.message ?? `Error al generar PDF (${res.status})`);
    }
    return res.blob();
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

export const horarioPublicacionesApi = {
  listarDocentes(params: { periodoId?: string; page?: number; limit?: number } = {}): Promise<ApiPaginatedResponse<HorarioPublicacionDocenteRow>> {
    const q: Record<string, string> = {};
    if (params.periodoId) q.periodoId = params.periodoId;
    if (params.page) q.page = String(params.page);
    if (params.limit) q.limit = String(params.limit);
    return apiClient.get<ApiPaginatedResponse<HorarioPublicacionDocenteRow>>('/api/horarios/publicaciones/docentes', Object.keys(q).length ? q : undefined);
  },

  listarSecciones(params: { periodoId?: string; page?: number; limit?: number } = {}): Promise<ApiPaginatedResponse<HorarioPublicacionSeccionRow>> {
    const q: Record<string, string> = {};
    if (params.periodoId) q.periodoId = params.periodoId;
    if (params.page) q.page = String(params.page);
    if (params.limit) q.limit = String(params.limit);
    return apiClient.get<ApiPaginatedResponse<HorarioPublicacionSeccionRow>>('/api/horarios/publicaciones/secciones', Object.keys(q).length ? q : undefined);
  },

  publicarDocente(docenteId: string, periodoId: string): Promise<{ id: string; fecha_publicacion: string; total_bloques: number }> {
    return apiClient.post(`/api/horarios/publicaciones/docentes/${docenteId}`, { periodo_id: periodoId });
  },

  publicarSeccion(seccionId: string, periodoId: string): Promise<{ id: string; fecha_publicacion: string; total_bloques: number }> {
    return apiClient.post(`/api/horarios/publicaciones/secciones/${seccionId}`, { periodo_id: periodoId });
  },

  despublicarDocente(docenteId: string, periodoId: string): Promise<{ id: string; despublicado: boolean }> {
    return apiClient.delete(`/api/horarios/publicaciones/docentes/${docenteId}?periodoId=${periodoId}`);
  },

  despublicarSeccion(seccionId: string, periodoId: string): Promise<{ id: string; despublicado: boolean }> {
    return apiClient.delete(`/api/horarios/publicaciones/secciones/${seccionId}?periodoId=${periodoId}`);
  },
};

export const horarioDocenteApi = {
  /** Horario PUBLICADO del docente autenticado (o el indicado, si es Admin). */
  obtenerPublicado(docenteId: string, periodoId?: string): Promise<HorarioPublicadoDTO> {
    return apiClient.get<HorarioPublicadoDTO>(`/api/docentes/${docenteId}/horario`, periodoId ? { periodoId } : undefined);
  },
};

export const horarioAlumnoApi = {
  /** Horario PUBLICADO de la sección del alumno autenticado (o el indicado, si es Admin). */
  obtenerPublicado(alumnoId: string, periodoId?: string): Promise<HorarioPublicadoDTO> {
    return apiClient.get<HorarioPublicadoDTO>(`/api/alumnos/${alumnoId}/horario`, periodoId ? { periodoId } : undefined);
  },
};

export const descansosApi = {
  /** Recreo/Refrigerio en vivo (sin flujo de publicación) de uno o más niveles. */
  listar(params: { periodoId: string; nivelIds: string[] }): Promise<DescansoDTO[]> {
    if (params.nivelIds.length === 0) return Promise.resolve([]);
    return apiClient.get<DescansoDTO[]>('/api/horarios/descansos', {
      periodoId: params.periodoId,
      nivelIds: params.nivelIds.join(','),
    });
  },

  upsert(payload: {
    nivel_id: string;
    periodo_id: string;
    tipo: 'RECREO' | 'REFRIGERIO';
    hora_inicio: string;
    hora_fin: string;
  }): Promise<DescansoDTO> {
    return apiClient.put<DescansoDTO>('/api/horarios/descansos', payload);
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

export async function cargarNiveles(): Promise<NivelRow[]> {
  try {
    const response = await apiClient.get<NivelRow[]>('/api/niveles');
    return Array.isArray(response) ? response : [];
  } catch (err) {
    console.error('Error loading niveles:', err);
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
