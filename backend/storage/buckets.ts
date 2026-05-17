// ============================================================
//  storage/buckets.ts — Nombres canónicos de buckets en Supabase Storage.
//  Todos los buckets son PRIVADOS (no public). Las URLs se generan
//  como signed URLs temporales (300 s) desde storage.service.ts.
// ============================================================

export const BUCKETS = {
  /** Archivos de materiales educativos (PDF, imagen, otro). */
  MATERIALES: 'materiales',
  /** Adjuntos que el docente sube con la actividad. */
  ACTIVIDADES_ADJUNTOS: 'actividades-adjuntos',
  /** Entregas de alumnos. */
  ENTREGAS_ALUMNOS: 'entregas-alumnos',
  /** Comprobantes de pago subidos por el alumno. */
  BOLETAS_PAGOS: 'boletas-pagos',
} as const;

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];

/** Extensiones permitidas por bucket. */
export const ALLOWED_EXTENSIONS: Record<BucketName, string[]> = {
  [BUCKETS.MATERIALES]: ['.pdf', '.docx', '.pptx', '.jpg', '.jpeg', '.png', '.webp'],
  [BUCKETS.ACTIVIDADES_ADJUNTOS]: ['.pdf', '.docx', '.pptx', '.jpg', '.jpeg', '.png'],
  [BUCKETS.ENTREGAS_ALUMNOS]: ['.pdf', '.docx', '.pptx', '.jpg', '.jpeg', '.png', '.zip'],
  [BUCKETS.BOLETAS_PAGOS]: ['.pdf', '.jpg', '.jpeg', '.png'],
};

/** Tamaño máximo en bytes por bucket (5 MB). */
export const MAX_FILE_SIZE = 5 * 1024 * 1024;
