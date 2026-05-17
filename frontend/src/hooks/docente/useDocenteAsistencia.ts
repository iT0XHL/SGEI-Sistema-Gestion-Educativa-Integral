// ============================================================
//  hooks/docente/useDocenteAsistencia.ts
//  React Query hooks para asistencia de alumnos (portal Docente).
//
//  Requiere @tanstack/react-query instalado:
//    pnpm add @tanstack/react-query --filter frontend
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { asistenciasApi } from '../../lib/api/asistencias.api';
import type { GuardarAsistenciaPayload } from '../../types/asistencia';

/** Lista de registros de asistencia para una sección y fecha. */
export function useAsistenciaSeccion(seccionId: string, fecha: string) {
  return useQuery({
    queryKey: ['asistencias', 'alumnos', seccionId, fecha],
    queryFn: () => asistenciasApi.listar({ seccionId, fecha }),
    enabled: Boolean(seccionId && fecha),
    staleTime: 1000 * 60 * 2, // 2 min
  });
}

/** Resumen de asistencia de toda la sección (vista v_resumen_asistencia). */
export function useResumenAsistencia(seccionId: string) {
  return useQuery({
    queryKey: ['asistencias', 'resumen', seccionId],
    queryFn: () => asistenciasApi.resumen(seccionId),
    enabled: Boolean(seccionId),
    staleTime: 1000 * 60 * 5,
  });
}

/** Guardar asistencia en lote (upsert idempotente). */
export function useGuardarAsistencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: GuardarAsistenciaPayload) => asistenciasApi.guardar(payload),
    onSuccess: (data) => {
      // Invalidar caché de la sección y fecha guardadas.
      qc.invalidateQueries({
        queryKey: ['asistencias', 'alumnos', data.seccion_id, data.fecha],
      });
      qc.invalidateQueries({
        queryKey: ['asistencias', 'resumen', data.seccion_id],
      });
    },
  });
}

/** Actualiza un registro individual de asistencia. */
export function useActualizarAsistencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { estado?: string; justificacion?: string | null } }) =>
      asistenciasApi.actualizar(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asistencias'] });
    },
  });
}
