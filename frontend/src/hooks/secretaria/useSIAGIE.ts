import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { siagieApi } from '../../lib/api/siagie.api';

/** Estadísticas generales del módulo SIAGIE para el período dado. */
export function useSiagieStats(periodoId?: string) {
  return useQuery({
    queryKey:  ['siagie', 'stats', periodoId],
    queryFn:   () => siagieApi.stats(periodoId),
    staleTime: 1000 * 60 * 5,
  });
}

/** Lista de validaciones previas a la exportación SIAGIE. */
export function useSiagieValidaciones(periodoId?: string) {
  return useQuery({
    queryKey:  ['siagie', 'validaciones', periodoId],
    queryFn:   () => siagieApi.validar(periodoId),
    staleTime: 1000 * 60 * 2,
  });
}

/** Refresca la vista materializada audit_schema.formato_siagie (Admin only). */
export function useRefreshSiagie() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => siagieApi.refresh(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['siagie'] });
    },
  });
}

/**
 * Descarga el archivo XLSX de carga masiva SIAGIE.
 * El mutationFn activa la descarga directamente en el navegador.
 */
export function useExportarSiagie() {
  return useMutation({
    mutationFn: (periodoId?: string) => siagieApi.exportar(periodoId),
  });
}
