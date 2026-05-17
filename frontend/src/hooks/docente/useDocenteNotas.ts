import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notasApi } from '../../lib/api/notas.api';
import type {
  UpsertBatchNotaPayload,
  UpdateNotaPayload,
  DesbloquearNotaPayload,
} from '../../types/nota';

/** Lista notas del docente autenticado (filtrables por bimestre/competencia). */
export function useDocenteNotas(params: {
  alumnoId?:      string;
  bimestreId?:    string;
  competenciaId?: string;
} = {}) {
  return useQuery({
    queryKey: ['notas', 'docente', params.alumnoId, params.bimestreId, params.competenciaId],
    queryFn:  () => notasApi.listar(params),
    staleTime: 1000 * 60 * 3,
  });
}

/** Registra o actualiza un batch de notas (upsert por alumno × competencia × bimestre). */
export function useUpsertNotas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertBatchNotaPayload) => notasApi.upsertBatch(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notas'] });
    },
  });
}

/** Actualiza una nota individual. */
export function useActualizarNota() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateNotaPayload }) =>
      notasApi.actualizar(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notas'] });
    },
  });
}

/** Desbloquea una nota cerrada (Admin only). */
export function useDesbloquearNota() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: DesbloquearNotaPayload }) =>
      notasApi.desbloquear(id, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['notas'] });
      qc.invalidateQueries({ queryKey: ['notas', vars.id] });
    },
  });
}
