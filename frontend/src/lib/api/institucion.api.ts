import { apiClient } from './client';

export interface InstitucionRow {
  id: string;
  codigo_modular: string;
  codigo_ugel: string;
  nombre_ugel: string;
  nombre: string;
  modalidad: string;
  gestion: 'Publica' | 'Privada';
  departamento: string;
  provincia: string;
  distrito: string;
  centro_poblado?: string;
  direccion?: string;
  telefono?: string;
  email_institucional?: string;
  resolucion_creacion?: string;
  activo?: boolean;
}

export const institucionApi = {
  obtener(): Promise<InstitucionRow> {
    return apiClient.get<InstitucionRow>('/api/institucion');
  },

  actualizar(id: string, payload: Partial<Omit<InstitucionRow, 'id'>>): Promise<InstitucionRow> {
    return apiClient.patch<InstitucionRow>(`/api/institucion/${id}`, payload);
  },
};
