// ============================================================
//  storage/buckets.ts — Nombres canónicos de buckets de almacenamiento.
//  Los directorios se crean bajo STORAGE_PATH en el filesystem local.
//  Las URLs se sirven vía /api/files/ con auth JWT.
// ============================================================

export const BUCKETS = {
  MATERIALES: 'materiales',
  ACTIVIDADES_ADJUNTOS: 'actividades-adjuntos',
  ENTREGAS_ALUMNOS: 'entregas-alumnos',
  BOLETAS_PAGOS: 'boletas-pagos',
} as const;

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];

export const ALLOWED_EXTENSIONS: Record<BucketName, string[]> = {
  [BUCKETS.MATERIALES]: ['.pdf', '.docx', '.pptx', '.jpg', '.jpeg', '.png', '.webp'],
  [BUCKETS.ACTIVIDADES_ADJUNTOS]: ['.pdf', '.docx', '.pptx', '.jpg', '.jpeg', '.png', '.xlsx'],
  [BUCKETS.ENTREGAS_ALUMNOS]: ['.pdf', '.docx', '.pptx', '.jpg', '.jpeg', '.png', '.zip'],
  [BUCKETS.BOLETAS_PAGOS]: ['.pdf', '.jpg', '.jpeg', '.png'],
};

export const MAX_FILE_SIZE = 10 * 1024 * 1024;
