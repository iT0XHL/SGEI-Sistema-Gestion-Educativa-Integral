// ============================================================
//  types/api.ts — Contrato estándar de respuestas de la API.
//  Reglas obligatorias del proyecto:
//    Éxito:  { success: true,  data, message }
//    Error:  { success: false, error: { code, message, details } }
// ============================================================

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message: string;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiError {
  success: false;
  error: ApiErrorBody;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

/** Metadatos de paginación para listados. */
export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  items: T[];
  meta: PageMeta;
}
