// ============================================================
//  lib/api/admin.api.ts — Cliente HTTP del módulo Admin.
//  Cubre: usuarios, docentes, alumnos (bloqueo), institución,
//  períodos, bimestres, escala literal, competencias,
//  asignaciones, horarios, asistencia docentes y estructura
//  académica (niveles, grados, secciones, cursos).
// ============================================================
import { apiClient } from './client';
import type { RolUsuario } from '../../types/roles';

// ── Paginación ────────────────────────────────────────────────
export interface PageMeta {
  page:       number;
  limit:      number;
  total:      number;
  totalPages: number;
}
export interface Paginated<T> {
  items: T[];
  meta:  PageMeta;
}

// ── Usuarios (cuentas staff: Admin / Secretaria) ──────────────
export interface UsuarioDTO {
  id:                string;
  usuario_login:     string;
  nombres:           string | null;
  apellido_paterno:  string | null;
  apellido_materno:  string | null;
  rol:               RolUsuario;
  entidad_tipo:      string;
  entidad_id:        string;
  activo:            boolean;
  intentos_fallidos: number;
  bloqueado_hasta:   string | null;
  ultimo_acceso:     string | null;
  created_at:        string;
}

export interface CreateUsuarioPayload {
  usuario_login: string;
  password:      string;
  rol:           'Admin' | 'Secretaria';
}

export interface UpdateUsuarioPayload {
  usuario_login?:    string;
  nombres?:          string;
  apellido_paterno?: string;
  apellido_materno?: string;
}

export interface ListUsuariosParams {
  q?:      string;
  rol?:    RolUsuario;
  activo?: 'true' | 'false';
  page?:   number;
  limit?:  number;
}

// ── Docentes ──────────────────────────────────────────────────
export interface DocenteDTO {
  id:                  string;
  dni:                 string;
  nombres:             string;
  apellido_paterno:    string;
  apellido_materno:    string;
  especialidad:        string;
  telefono:            string;
  email_institucional: string | null;
  fecha_nacimiento:    string | null;
  sexo:                'M' | 'F' | null;
  titulo_profesional:  string | null;
  fecha_ingreso:       string | null;
  activo:              boolean;
  usuario_login:       string | null;
}

export interface CreateDocentePayload {
  usuario_login:       string;
  password:            string;
  dni:                 string;
  nombres:             string;
  apellido_paterno:    string;
  apellido_materno:    string;
  especialidad:        string;
  telefono:            string;
  email_institucional?: string | null;
  fecha_nacimiento?:    string | null;
  sexo?:               'M' | 'F' | null;
  titulo_profesional?:  string | null;
  fecha_ingreso?:      string | null;
}

export interface UpdateDocentePayload {
  nombres?:            string;
  apellido_paterno?:   string;
  apellido_materno?:   string;
  dni?:                string;
  usuario_login?:      string;
  especialidad?:       string;
  telefono?:           string;
  email_institucional?: string | null;
  fecha_nacimiento?:   string | null;
  sexo?:               'M' | 'F' | null;
  titulo_profesional?:  string | null;
  fecha_ingreso?:      string | null;
}

export interface ListDocentesParams {
  q?:      string;
  activo?: 'true' | 'false';
  page?:   number;
  limit?:  number;
}

// ── Alumnos (solo lo que necesita Admin: lista y bloqueo) ─────
export interface AlumnoResumenDTO {
  id:               string;
  dni:              string;
  nombres:          string;
  apellido_paterno: string;
  apellido_materno: string;
  bloqueo_manual:   boolean;
  activo:           boolean;
  usuario_login:    string | null;
  seccion: {
    id:     string;
    nombre: string;
    grado:  {
      id:     string;
      nombre: string;
      nivel:  { id: string; nombre: string };
    };
  };
}

export interface AlumnoDetalleDTO extends AlumnoResumenDTO {
  fecha_nacimiento:    string;
  sexo:                'M' | 'F';
  codigo_siagie:       string | null;
  direccion:           string | null;
  distrito:            string | null;
  telefono_emergencia: string | null;
  grupo_sanguineo:     string | null;
  condicion_especial:  string | null;
  periodo_id:          string;
}

export interface ListAlumnosParams {
  q?:        string;
  gradoId?:  string;
  seccionId?: string;
  periodoId?: string;
  activo?:   'true' | 'false';
  page?:     number;
  limit?:    number;
}

export interface CreateAlumnoPayload {
  usuario_login:      string;
  password:           string;
  seccion_id:         string;
  periodo_id:         string;
  dni:                string;
  nombres:            string;
  apellido_paterno:   string;
  apellido_materno:   string;
  fecha_nacimiento:   string;
  sexo:               'M' | 'F';
  codigo_siagie?:         string;
  direccion?:             string;
  distrito?:              string;
  telefono_emergencia?:   string;
  grupo_sanguineo?:       string;
  condicion_especial?:    string;
}

export interface UpdateAlumnoPayload {
  nombres?:           string;
  apellido_paterno?:  string;
  apellido_materno?:  string;
  seccion_id?:        string;
  periodo_id?:        string;
  dni?:               string;
  usuario_login?:     string;
  fecha_nacimiento?:  string;
  sexo?:              'M' | 'F';
  codigo_siagie?:     string | null;
  direccion?:         string | null;
  distrito?:          string | null;
  telefono_emergencia?: string | null;
  grupo_sanguineo?:   string | null;
  condicion_especial?: string | null;
}

export interface ChangePasswordPayload {
  password_actual: string;
  password_nueva: string;
  confirmacion: string;
}

export interface AdminResetPasswordPayload {
  password_nueva: string;
  confirmacion: string;
}

export interface UpdateUsuarioPayload {
  rol?:            RolUsuario;
  activo?:         boolean;
  usuario_login?:  string;
}

// ── Institución educativa ─────────────────────────────────────
export interface InstitucionDTO {
  id:                  string;
  nombre:              string;
  codigo_modular:      string;
  codigo_ugel:         string;
  nombre_ugel:         string;
  resolucion_creacion: string | null;
  modalidad:           string;
  gestion:             string; // DB: VARCHAR(20) texto libre (Pública/Privada/Concertada…)
  departamento:        string;
  provincia:           string;
  distrito:            string;
  centro_poblado:      string | null;
  direccion:           string | null;
  telefono:            string | null;
  email_institucional: string | null;
  activo:              boolean;
}

export type UpdateInstitucionPayload = Omit<InstitucionDTO, 'id' | 'activo'>;

// ── Período académico ─────────────────────────────────────────
export interface PeriodoDTO {
  id:           string;
  anio:         number;
  nombre:       string;
  fecha_inicio: string;
  fecha_fin:    string;
  activo:       boolean;
}

export interface CreatePeriodoPayload {
  anio:         number;
  nombre:       string;
  fecha_inicio: string;
  fecha_fin:    string;
  activo?:      boolean;
}

// ── Bimestre ──────────────────────────────────────────────────
export interface BimestreDTO {
  id:           string;
  periodo_id:   string;
  numero:       number;
  nombre:       string;
  fecha_inicio: string;
  fecha_fin:    string;
  cerrado:      boolean;
}

export interface CreateBimestrePayload {
  periodo_id:   string;
  numero:       number;
  nombre:       string;
  fecha_inicio: string;
  fecha_fin:    string;
}

export interface UpdateBimestrePayload {
  nombre?:       string;
  fecha_inicio?: string;
  fecha_fin?:    string;
}

// ── Escala de calificaciones ──────────────────────────────────
export type NotaLiteral = 'AD' | 'A' | 'B' | 'C';

export interface EscalaDTO {
  id:              string;
  periodo_id:      string;
  escala:          NotaLiteral;
  rango_inferior:  number;
  rango_superior:  number;
  descripcion?:    string | null;
}

export interface EscalaItem {
  escala:         NotaLiteral;
  rango_inferior: number;
  rango_superior: number;
  descripcion?:   string | null;
}

export interface UpsertEscalaPayload {
  periodo_id: string;
  escalas:    EscalaItem[];
}

export interface CoberturaEscalaDTO {
  completa:           boolean;
  cubre_0_20:         boolean;
  escalas_definidas:  number;
  mensaje:            string;
}

// ── Estructura académica (Nivel / Grado / Sección / Curso) ────
export interface NivelDTO {
  id:          string;
  nombre:      'Primaria' | 'Secundaria';
  descripcion: string | null;
}

export interface GradoDTO {
  id:      string;
  nivel_id: string;
  nombre:  string;
  orden:   number;
  nivel:   { id: string; nombre: string };
}

export interface SeccionDTO {
  id:               string;
  grado_id:         string;
  periodo_id:       string;
  nombre:           string;
  turno:            'Mañana' | 'Tarde' | 'Noche';
  cupo_maximo:      number;
  docente_tutor_id: string | null;
  aula:             string | null;
  grado:            { id: string; nombre: string; nivel: { id: string; nombre: string } };
}

export interface CursoDTO {
  id:               string;
  nivel_id:         string;
  nombre:           string;
  codigo_cneb:      string | null;
  descripcion:      string | null;
  horas_semanales:  number | null;
}

// ── Competencias ──────────────────────────────────────────────
export interface CompetenciaDTO {
  id:          string;
  curso_id:    string;
  nombre:      string;
  descripcion: string | null;
  tipo:        'regular' | 'transversal';
  orden:       number | null;
}

export interface CreateCompetenciaPayload {
  curso_id:    string;
  nombre:      string;
  descripcion?: string | null;
  tipo:        'regular' | 'transversal';
  orden?:      number | null;
}

export interface UpdateCompetenciaPayload {
  nombre?:      string;
  descripcion?: string | null;
  tipo?:        'regular' | 'transversal';
  orden?:       number | null;
}

export interface ReordenarItem {
  id:    string;
  orden: number;
}

// ── Asignaciones docente-curso-sección ────────────────────────
export interface AsignacionDTO {
  id:         string;
  docente_id: string;
  curso_id:   string;
  seccion_id: string;
  periodo_id: string;
  activo:     boolean;
  docente:    { id: string; nombres: string; apellido_paterno: string };
  curso:      { id: string; nombre: string };
  seccion:    { id: string; nombre: string };
}

export interface CreateAsignacionPayload {
  docente_id: string;
  curso_id:   string;
  seccion_id: string;
  periodo_id: string;
}

export interface ListAsignacionesParams {
  periodoId?:  string;
  seccionId?:  string;
  docenteId?:  string;
}

// ── Horarios ──────────────────────────────────────────────────
export interface HorarioDTO {
  id:            string;
  asignacion_id: string;
  dia_semana:    number;
  hora_inicio:   string;
  hora_fin:      string;
  aula:          string | null;
  curso:         string;
  seccion:       string;
  docente:       string;
}

export interface CreateHorarioPayload {
  asignacion_id: string;
  dia_semana:    number;
  hora_inicio:   string;
  hora_fin:      string;
  aula?:         string | null;
}

export interface UpdateHorarioPayload {
  dia_semana:  number;
  hora_inicio: string;
  hora_fin:    string;
  aula?:       string | null;
}

export interface ListHorariosParams {
  periodoId?:  string;
  seccionId?:  string;
}

// ── Asistencia de docentes ────────────────────────────────────
export type EstadoAsistencia = 'P' | 'F' | 'T' | 'J';

export interface AsistenciaDocenteDTO {
  id:           string;
  docente_id:   string;
  fecha:        string;
  estado:       EstadoAsistencia;
  justificacion: string | null;
  hora_registro: string | null;
  docente?: {
    id:               string;
    nombres:          string;
    apellido_paterno: string;
    apellido_materno: string;
  };
}

export interface RegistroAsistenciaItem {
  docente_id:    string;
  estado:        EstadoAsistencia;
  justificacion?: string | null;
}

export interface GuardarAsistenciaPayload {
  fecha:     string;
  registros: RegistroAsistenciaItem[];
}

export interface ActualizarAsistenciaPayload {
  estado?:       EstadoAsistencia;
  justificacion?: string | null;
}

export interface ListAsistenciaDocenteParams {
  docenteId?:   string;
  fecha?:       string;
  fechaDesde?:  string;
  fechaHasta?:  string;
}

// ── Estadísticas del dashboard admin ─────────────────────────
export interface EstadisticasDTO {
  periodo: { id: string; nombre: string; anio: number; activo: boolean } | null;
  alumnos: { total: number; bloqueados: number };
  docentes: { total: number };
  asistencia_hoy: {
    presentes:      number;
    tardanzas:      number;
    faltas:         number;
    justificados:   number;
    sin_registrar:  number;
    total_docentes: number;
  };
  bimestres: { total: number; cerrados: number; abiertos: number };
  secciones:   number;
  asignaciones: number;
}

// ── Helpers de conversión de parámetros ──────────────────────
// Genérico para aceptar interfaces de parámetros (que no tienen firma de índice).
function toStr<T extends object>(p: T): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(p).map(([k, v]) => [k, v !== undefined && v !== null ? String(v) : undefined]),
  );
}

// ════════════════════════════════════════════════════════════
//  API OBJECTS
// ════════════════════════════════════════════════════════════

// ── Usuarios (cuentas staff) ──────────────────────────────────
export const usuariosApi = {
  listar(params: ListUsuariosParams = {}): Promise<Paginated<UsuarioDTO>> {
    return apiClient.get<Paginated<UsuarioDTO>>('/api/usuarios', toStr(params));
  },

  obtener(id: string): Promise<UsuarioDTO> {
    return apiClient.get<UsuarioDTO>(`/api/usuarios/${id}`);
  },

  crear(payload: CreateUsuarioPayload): Promise<UsuarioDTO> {
    return apiClient.post<UsuarioDTO>('/api/usuarios', payload);
  },

  actualizar(id: string, payload: UpdateUsuarioPayload): Promise<UsuarioDTO> {
    return apiClient.patch<UsuarioDTO>(`/api/usuarios/${id}`, payload);
  },

  activar(id: string): Promise<UsuarioDTO> {
    return apiClient.post<UsuarioDTO>(`/api/usuarios/${id}/activar`, {});
  },

  desactivar(id: string): Promise<UsuarioDTO> {
    return apiClient.post<UsuarioDTO>(`/api/usuarios/${id}/desactivar`, {});
  },

  cambiarContrasena(id: string, payload: ChangePasswordPayload): Promise<void> {
    return apiClient.post<void>(`/api/usuarios/${id}/cambiar-contrasena`, payload);
  },

  resetContrasena(id: string, payload: AdminResetPasswordPayload): Promise<void> {
    return apiClient.post<void>(`/api/usuarios/${id}/reset-contrasena`, payload);
  },
};

// ── Docentes ──────────────────────────────────────────────────
export const docentesAdminApi = {
  listar(params: ListDocentesParams = {}): Promise<Paginated<DocenteDTO>> {
    return apiClient.get<Paginated<DocenteDTO>>('/api/docentes', toStr(params));
  },

  obtener(id: string): Promise<DocenteDTO> {
    return apiClient.get<DocenteDTO>(`/api/docentes/${id}`);
  },

  crear(payload: CreateDocentePayload): Promise<DocenteDTO> {
    return apiClient.post<DocenteDTO>('/api/docentes', payload);
  },

  actualizar(id: string, payload: UpdateDocentePayload): Promise<DocenteDTO> {
    return apiClient.patch<DocenteDTO>(`/api/docentes/${id}`, payload);
  },

  activar(id: string): Promise<DocenteDTO> {
    return apiClient.post<DocenteDTO>(`/api/docentes/${id}/activar`, {});
  },

  desactivar(id: string): Promise<DocenteDTO> {
    return apiClient.post<DocenteDTO>(`/api/docentes/${id}/desactivar`, {});
  },

  cambiarContrasena(id: string, payload: ChangePasswordPayload): Promise<void> {
    return apiClient.post<void>(`/api/docentes/${id}/cambiar-contrasena`, payload);
  },

  resetContrasena(id: string, payload: AdminResetPasswordPayload): Promise<void> {
    return apiClient.post<void>(`/api/docentes/${id}/reset-contrasena`, payload);
  },

  asignaciones(id: string): Promise<AsignacionDTO[]> {
    return apiClient.get<AsignacionDTO[]>(`/api/docentes/${id}/asignaciones`);
  },

  horario(id: string): Promise<HorarioDTO[]> {
    return apiClient.get<HorarioDTO[]>(`/api/docentes/${id}/horario`);
  },
};

// ── Alumnos (Admin: lista + bloqueo) ─────────────────────────
export const alumnosAdminApi = {
  listar(params: ListAlumnosParams = {}): Promise<Paginated<AlumnoResumenDTO>> {
    return apiClient.get<Paginated<AlumnoResumenDTO>>('/api/alumnos', toStr(params));
  },

  obtener(id: string): Promise<AlumnoDetalleDTO> {
    return apiClient.get<AlumnoDetalleDTO>(`/api/alumnos/${id}`);
  },

  setBloqueo(id: string, bloqueo_manual: boolean): Promise<AlumnoResumenDTO> {
    return apiClient.patch<AlumnoResumenDTO>(`/api/alumnos/${id}/bloqueo`, { bloqueo_manual });
  },

  crear(payload: CreateAlumnoPayload): Promise<AlumnoResumenDTO> {
    return apiClient.post<AlumnoResumenDTO>('/api/alumnos', payload);
  },

  actualizar(id: string, payload: UpdateAlumnoPayload): Promise<AlumnoResumenDTO> {
    return apiClient.patch<AlumnoResumenDTO>(`/api/alumnos/${id}`, payload);
  },

  activar(id: string): Promise<AlumnoResumenDTO> {
    return apiClient.post<AlumnoResumenDTO>(`/api/alumnos/${id}/activar`, {});
  },

  desactivar(id: string): Promise<AlumnoResumenDTO> {
    return apiClient.post<AlumnoResumenDTO>(`/api/alumnos/${id}/desactivar`, {});
  },

  cambiarContrasena(id: string, payload: ChangePasswordPayload): Promise<void> {
    return apiClient.post<void>(`/api/alumnos/${id}/cambiar-contrasena`, payload);
  },

  resetContrasena(id: string, payload: AdminResetPasswordPayload): Promise<void> {
    return apiClient.post<void>(`/api/alumnos/${id}/reset-contrasena`, payload);
  },
};

// ── Institución educativa ─────────────────────────────────────
export const institucionApi = {
  obtener(): Promise<InstitucionDTO> {
    return apiClient.get<InstitucionDTO>('/api/institucion');
  },

  actualizar(id: string, payload: UpdateInstitucionPayload): Promise<InstitucionDTO> {
    return apiClient.put<InstitucionDTO>(`/api/institucion/${id}`, payload);
  },
};

// ── Períodos académicos ───────────────────────────────────────
// El backend devuelve siempre un response paginado { items, meta }
// — nunca un array desnudo.
export interface ListPeriodosParams {
  activo?: boolean;
  page?:   number;
  limit?:  number;
}

export const periodosApi = {
  listar(params: ListPeriodosParams = {}): Promise<Paginated<PeriodoDTO>> {
    const q: Record<string, string> = {};
    if (params.activo !== undefined) q.activo = String(params.activo);
    if (params.page)                 q.page   = String(params.page);
    if (params.limit)                q.limit  = String(params.limit);
    return apiClient.get<Paginated<PeriodoDTO>>(
      '/api/periodos',
      Object.keys(q).length ? q : undefined,
    );
  },

  obtener(id: string): Promise<PeriodoDTO> {
    return apiClient.get<PeriodoDTO>(`/api/periodos/${id}`);
  },

  crear(payload: CreatePeriodoPayload): Promise<PeriodoDTO> {
    return apiClient.post<PeriodoDTO>('/api/periodos', payload);
  },

  activar(id: string): Promise<PeriodoDTO> {
    return apiClient.patch<PeriodoDTO>(`/api/periodos/${id}/activar`, {});
  },
};

// ── Bimestres ─────────────────────────────────────────────────
export const bimestresAdminApi = {
  listar(periodoId?: string): Promise<BimestreDTO[]> {
    return apiClient.get<BimestreDTO[]>(
      '/api/bimestres',
      periodoId ? { periodoId } : undefined,
    );
  },

  obtener(id: string): Promise<BimestreDTO> {
    return apiClient.get<BimestreDTO>(`/api/bimestres/${id}`);
  },

  crear(payload: CreateBimestrePayload): Promise<BimestreDTO> {
    return apiClient.post<BimestreDTO>('/api/bimestres', payload);
  },

  actualizar(id: string, payload: UpdateBimestrePayload): Promise<BimestreDTO> {
    return apiClient.put<BimestreDTO>(`/api/bimestres/${id}`, payload);
  },

  cerrar(id: string): Promise<BimestreDTO> {
    return apiClient.patch<BimestreDTO>(`/api/bimestres/${id}/cerrar`, {});
  },
};

// ── Escala de calificaciones ──────────────────────────────────
export const escalaApi = {
  listar(periodoId: string): Promise<EscalaDTO[]> {
    return apiClient.get<EscalaDTO[]>('/api/escala-calificaciones', { periodoId });
  },

  upsert(payload: UpsertEscalaPayload): Promise<EscalaDTO[]> {
    return apiClient.put<EscalaDTO[]>('/api/escala-calificaciones', payload);
  },

  cobertura(periodoId: string): Promise<CoberturaEscalaDTO> {
    return apiClient.get<CoberturaEscalaDTO>('/api/escala-calificaciones/cobertura', { periodoId });
  },
};

// ── Estructura académica ──────────────────────────────────────
export const estructuraApi = {
  niveles(): Promise<NivelDTO[]> {
    return apiClient.get<NivelDTO[]>('/api/niveles');
  },

  grados(nivelId?: string): Promise<GradoDTO[]> {
    return apiClient.get<GradoDTO[]>('/api/grados', nivelId ? { nivelId } : undefined);
  },

  secciones(params: { periodoId?: string; gradoId?: string } = {}): Promise<SeccionDTO[]> {
    return apiClient.get<SeccionDTO[]>('/api/secciones', toStr(params));
  },

  cursos(nivelId?: string): Promise<CursoDTO[]> {
    return apiClient.get<CursoDTO[]>('/api/cursos', nivelId ? { nivelId } : undefined);
  },
};

// ── Competencias ──────────────────────────────────────────────
export const competenciasApi = {
  listar(cursoId?: string): Promise<CompetenciaDTO[]> {
    return apiClient.get<CompetenciaDTO[]>(
      '/api/competencias',
      cursoId ? { cursoId } : undefined,
    );
  },

  crear(payload: CreateCompetenciaPayload): Promise<CompetenciaDTO> {
    return apiClient.post<CompetenciaDTO>('/api/competencias', payload);
  },

  actualizar(id: string, payload: UpdateCompetenciaPayload): Promise<CompetenciaDTO> {
    return apiClient.put<CompetenciaDTO>(`/api/competencias/${id}`, payload);
  },

  eliminar(id: string): Promise<{ id: string }> {
    return apiClient.delete<{ id: string }>(`/api/competencias/${id}`);
  },

  reordenar(competencias: ReordenarItem[]): Promise<CompetenciaDTO[]> {
    return apiClient.patch<CompetenciaDTO[]>('/api/competencias/reordenar', { competencias });
  },
};

// ── Asignaciones ──────────────────────────────────────────────
export const asignacionesApi = {
  listar(params: ListAsignacionesParams = {}): Promise<AsignacionDTO[]> {
    return apiClient.get<AsignacionDTO[]>('/api/asignaciones', toStr(params));
  },

  crear(payload: CreateAsignacionPayload): Promise<AsignacionDTO> {
    return apiClient.post<AsignacionDTO>('/api/asignaciones', payload);
  },

  eliminar(id: string): Promise<{ id: string }> {
    return apiClient.delete<{ id: string }>(`/api/asignaciones/${id}`);
  },
};

// ── Horarios (Admin CRUD) ─────────────────────────────────────
export const horariosAdminApi = {
  listar(params: ListHorariosParams = {}): Promise<HorarioDTO[]> {
    return apiClient.get<HorarioDTO[]>('/api/horarios', toStr(params));
  },

  crear(payload: CreateHorarioPayload): Promise<HorarioDTO> {
    return apiClient.post<HorarioDTO>('/api/horarios', payload);
  },

  actualizar(id: string, payload: UpdateHorarioPayload): Promise<{ id: string }> {
    return apiClient.patch<{ id: string }>(`/api/horarios/${id}`, payload);
  },

  eliminar(id: string): Promise<{ id: string }> {
    return apiClient.delete<{ id: string }>(`/api/horarios/${id}`);
  },
};

// ── Asistencia de docentes ────────────────────────────────────
export const asistenciaDocentesApi = {
  listar(params: ListAsistenciaDocenteParams = {}): Promise<AsistenciaDocenteDTO[]> {
    return apiClient.get<AsistenciaDocenteDTO[]>('/api/asistencias/docentes', toStr(params));
  },

  guardar(payload: GuardarAsistenciaPayload): Promise<{ registros_guardados: number; fecha: string }> {
    return apiClient.post<{ registros_guardados: number; fecha: string }>(
      '/api/asistencias/docentes',
      payload,
    );
  },

  actualizar(id: string, payload: ActualizarAsistenciaPayload): Promise<AsistenciaDocenteDTO> {
    return apiClient.patch<AsistenciaDocenteDTO>(`/api/asistencias/docentes/${id}`, payload);
  },

  eliminar(id: string): Promise<{ id: string }> {
    return apiClient.delete<{ id: string }>(`/api/asistencias/docentes/${id}`);
  },
};

// ── Dashboard admin — estadísticas generales ──────────────────
export const estadisticasApi = {
  obtener(): Promise<EstadisticasDTO> {
    return apiClient.get<EstadisticasDTO>('/api/admin/estadisticas');
  },
};
