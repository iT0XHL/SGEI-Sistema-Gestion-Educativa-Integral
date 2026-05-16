// ============================================================
// SGEI — Corrección #11 — Mapeo bidireccional de estados de voucher
// ============================================================
// PROBLEMA: el front usa 'submitted'|'approved'|'rejected' pero
// el ENUM financial_schema.estado_revision_boleta espera:
// 'En_Revision' | 'Aprobada' | 'Rechazada'
//
// REGLA: Usar toDbStatus() al ENVIAR a la API.
//        Usar toFrontStatus() al LEER desde la API.
//        La UI siempre trabaja con los valores front.
// ============================================================

/** Mapeo Front → DB (para enviar en PATCH/POST a la API) */
export function toDbStatus(frontStatus: string): string {
  const map: Record<string, string> = {
    'submitted': 'En_Revision',
    'approved':  'Aprobada',
    'rejected':  'Rechazada',
  };
  return map[frontStatus] ?? frontStatus;
}

/** Mapeo DB → Front (para normalizar la respuesta de la API) */
export function toFrontStatus(dbStatus: string): string {
  const map: Record<string, string> = {
    'En_Revision': 'submitted',
    'Aprobada':    'approved',
    'Rechazada':   'rejected',
  };
  return map[dbStatus] ?? dbStatus;
}
