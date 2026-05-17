// ============================================================
//  types/material.ts — Tipos para materiales educativos.
//  tipo_material ENUM: PDF | enlace | video | imagen | otro
// ============================================================

export type TipoMaterial = 'PDF' | 'enlace' | 'video' | 'imagen' | 'otro';

/** Tipos que tienen archivo en Supabase Storage. */
export const TIPOS_CON_ARCHIVO: TipoMaterial[] = ['PDF', 'imagen', 'otro'];

/** Tipos que usan URL externa directamente. */
export const TIPOS_CON_URL_EXTERNA: TipoMaterial[] = ['enlace', 'video'];

export interface MaterialBase {
  id: string;
  docente_id: string;
  curso_id: string;
  seccion_id: string;
  titulo: string;
  descripcion: string | null;
  tipo: TipoMaterial;
  url: string;
  fecha_publicacion: string;
  visible: boolean;
}

export interface Material extends MaterialBase {
  docente?: {
    id: string;
    nombres: string;
    apellido_paterno: string;
  };
  curso?: {
    id: string;
    nombre: string;
  };
  seccion?: {
    id: string;
    nombre: string;
    grado?: { id: string; nombre: string };
  };
}

export interface CreateMaterialUrlPayload {
  curso_id: string;
  seccion_id: string;
  titulo: string;
  descripcion?: string | null;
  tipo: 'enlace' | 'video';
  url: string;
  visible?: boolean;
}

export interface UpdateMaterialPayload {
  titulo?: string;
  descripcion?: string | null;
  tipo?: TipoMaterial;
  url?: string;
  visible?: boolean;
}

export interface ArchivoUrlResponse {
  url: string;
  tipo: string;
  es_firmada: boolean;
}
