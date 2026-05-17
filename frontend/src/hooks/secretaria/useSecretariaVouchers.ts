import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { boletasApi } from '../../lib/api/boletas.api';
import { pagosApi } from '../../lib/api/pagos.api';
import type { RevisarBoletaPayload, EstadoRevisionBoleta } from '../../types/pago';

/** Lista boletas para revisión (Secretaria/Admin). */
export function useBoletasPendientes(estadoRevision?: EstadoRevisionBoleta) {
  return useQuery({
    queryKey: ['boletas', 'secretaria', estadoRevision],
    queryFn:  () => boletasApi.listar({ estadoRevision }),
    staleTime: 1000 * 60,
    refetchInterval: 1000 * 60,
  });
}

/** Revisa (aprueba o rechaza) una boleta vía SP revisar_boleta. */
export function useRevisarBoleta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: RevisarBoletaPayload) => boletasApi.revisar(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['boletas'] });
      qc.invalidateQueries({ queryKey: ['pagos'] });
    },
  });
}

/** URL firmada del comprobante (Secretaria abre el archivo). */
export function useArchivoBoletaRevisor(boletaId: string, enabled = false) {
  return useQuery({
    queryKey: ['boletas', 'archivo', 'revisor', boletaId],
    queryFn:  () => boletasApi.getArchivoUrl(boletaId),
    enabled:  Boolean(boletaId) && enabled,
    staleTime: 1000 * 200,
    gcTime:   1000 * 300,
  });
}

/** Pagos de todos los alumnos (Admin/Secretaria). */
export function useTodosPagos(params: { alumnoId?: string; estado?: string } = {}) {
  return useQuery({
    queryKey: ['pagos', 'secretaria', params],
    queryFn:  () => pagosApi.listar(params),
    staleTime: 1000 * 60 * 2,
  });
}
