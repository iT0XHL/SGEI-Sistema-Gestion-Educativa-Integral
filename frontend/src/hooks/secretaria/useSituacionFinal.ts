import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sfaApi } from '../../lib/api/situacion-final.api';
import type { UpsertSfaPayload } from '../../types/situacion-final';

/** Lista situaciones finales por período/sección (Admin, Secretaria). */
export function useSituacionesFinal(params: { periodoId?: string; seccionId?: string } = {}) {
  return useQuery({
    queryKey:  ['sfa', 'lista', params],
    queryFn:   () => sfaApi.listar(params),
    staleTime: 1000 * 60 * 5,
    enabled:   Boolean(params.periodoId || params.seccionId),
  });
}

/** Situación final de un alumno específico. */
export function useSfaAlumno(alumnoId: string, periodoId: string, enabled = true) {
  return useQuery({
    queryKey:  ['sfa', alumnoId, periodoId],
    queryFn:   () => sfaApi.obtener(alumnoId, periodoId),
    staleTime: 1000 * 60 * 5,
    enabled:   Boolean(alumnoId) && Boolean(periodoId) && enabled,
    retry:     false,
  });
}

/** Registra o actualiza la situación final (upsert). */
export function useUpsertSfa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertSfaPayload) => sfaApi.upsert(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sfa'] });
    },
  });
}

/** Elimina la situación final (solo Admin). */
export function useEliminarSfa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ alumnoId, periodoId }: { alumnoId: string; periodoId: string }) =>
      sfaApi.eliminar(alumnoId, periodoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sfa'] });
    },
  });
}
