import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificacionesApi } from '../../lib/api/notificaciones.api';
import type { CrearNotificacionPayload } from '../../types/notificacion';

/**
 * Lista las notificaciones del usuario autenticado.
 * Se sondea cada 60 s para mostrar alertas nuevas sin WebSocket.
 */
export function useNotificaciones(leida?: boolean) {
  return useQuery({
    queryKey:             ['notificaciones', 'lista', leida],
    queryFn:              () => notificacionesApi.listar(leida),
    staleTime:            1000 * 30,
    refetchInterval:      1000 * 60,   // respaldo si el canal SSE cae
    refetchOnWindowFocus: true,        // recarga al volver a la pestaña (§26.9)
  });
}

/**
 * Cuenta notificaciones no leídas (para el badge del menú).
 * Se sondea cada 30 s.
 */
export function useContarNoLeidas() {
  return useQuery({
    queryKey:             ['notificaciones', 'contar'],
    queryFn:              () => notificacionesApi.contar(),
    staleTime:            1000 * 20,
    refetchInterval:      1000 * 30,   // respaldo si el canal SSE cae
    refetchOnWindowFocus: true,        // recarga al volver a la pestaña (§26.9)
  });
}

/** Marca una notificación como leída. */
export function useMarcarLeida() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificacionesApi.marcarLeida(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notificaciones'] });
    },
  });
}

/** Marca todas las notificaciones como leídas. */
export function useMarcarTodasLeidas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificacionesApi.marcarTodasLeidas(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notificaciones'] });
    },
  });
}

/** Envía una notificación a un usuario (Admin only). */
export function useCrearNotificacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CrearNotificacionPayload) => notificacionesApi.crear(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notificaciones'] });
    },
  });
}
