import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pagosApi } from '../../lib/api/pagos.api';
import { boletasApi } from '../../lib/api/boletas.api';
import type { EstadoPagoRow } from '../../types/pago';

/** Estado de pagos del alumno autenticado (desde v_estado_pagos_alumno). */
export function useAlumnoPagos() {
  return useQuery({
    queryKey: ['pagos', 'alumno'],
    queryFn:  () => pagosApi.listar() as Promise<EstadoPagoRow[]>,
    staleTime: 1000 * 60 * 2,
  });
}

/** Alumno sube un comprobante de pago. */
export function useSubirBoleta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      pago_id:           string;
      archivo:           File;
      banco?:            string;
      numero_operacion?: string;
    }) => boletasApi.subir(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pagos', 'alumno'] });
      qc.invalidateQueries({ queryKey: ['boletas'] });
    },
  });
}

/** URL firmada del comprobante (activar solo cuando el alumno quiera ver el archivo). */
export function useArchivoBoletaAlumno(boletaId: string, enabled = false) {
  return useQuery({
    queryKey: ['boletas', 'archivo', boletaId],
    queryFn:  () => boletasApi.getArchivoUrl(boletaId),
    enabled:  Boolean(boletaId) && enabled,
    staleTime: 1000 * 200,
    gcTime:   1000 * 300,
  });
}
