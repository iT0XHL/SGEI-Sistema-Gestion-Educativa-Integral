import { apiClient } from './client';

export interface AlumnoDetalle {
  id: string;
  seccion_id: string;
  periodo_id: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  seccion: {
    id: string;
    nombre: string;
    turno: string;
    grado: {
      id: string;
      nombre: string;
      nivel: { id: string; nombre: string };
    };
  };
}

export interface AsignacionDocente {
  id: string;
  docente_id: string;
  curso_id: string;
  seccion_id: string;
  periodo_id: string;
  activo: boolean;
  docente: { id: string; nombres: string; apellido_paterno: string };
  curso: { id: string; nombre: string };
  seccion: {
    id: string;
    nombre: string;
    grado_id: string;
    grado: { id: string; nombre: string; nivel: { id: string; nombre: string } };
  };
}

export const alumnosApi = {
  obtener(id: string): Promise<AlumnoDetalle> {
    return apiClient.get<AlumnoDetalle>(`/api/alumnos/${id}`);
  },

  cursos(id: string): Promise<AsignacionDocente[]> {
    return apiClient.get<AsignacionDocente[]>(`/api/alumnos/${id}/cursos`);
  },
};
