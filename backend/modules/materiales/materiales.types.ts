// ============================================================
//  modules/materiales/materiales.types.ts
// ============================================================
import type { TipoMaterial } from '@prisma/client';

export interface MaterialRow {
  id: string;
  docente_id: string;
  curso_id: string;
  seccion_id: string;
  titulo: string;
  descripcion: string | null;
  tipo: TipoMaterial;
  url: string;
  fecha_publicacion: Date;
  visible: boolean;
}

/** Tipos que requieren subida a Storage (no son URLs externas). */
export const TIPOS_CON_ARCHIVO: TipoMaterial[] = ['PDF', 'imagen', 'otro'];

/** Tipos que reciben URL externa (no se almacenan en Storage). */
export const TIPOS_CON_URL_EXTERNA: TipoMaterial[] = ['enlace', 'video'];
