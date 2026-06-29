import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import type { SessionUser } from '../api/auth.api';

export interface UseSessionResult {
  session: SessionUser | null;
  loading: boolean;
  error: string | null;
}

function statusOf(err: unknown): number | undefined {
  return (err as { status?: number } | null | undefined)?.status;
}

/**
 * Sesión del usuario autenticado (GET /api/auth/me).
 *
 * Usa React Query con una clave compartida ['session'] para que las múltiples
 * llamadas por vista (AppShell + página) se deduplicen en una sola petición y
 * se cacheen, en lugar de disparar un fetch independiente por cada componente.
 * El contrato { session, loading, error } y el redirect al login ante un 401 se
 * mantienen idénticos a la versión anterior.
 */
export function useSession(): UseSessionResult {
  const navigate = useNavigate();

  const { data, error, isLoading } = useQuery({
    queryKey: ['session'],
    queryFn: () => authApi.me(),
    retry: false,
    // staleTime 0 = se revalida en cada montaje (igual que antes: sesión fresca
    // por navegación), pero las llamadas simultáneas (AppShell + página) se
    // deduplican en una sola petición en vuelo y la vista usa la cache al
    // instante mientras revalida.
    staleTime: 0,
  });

  const httpStatus = error != null ? statusOf(error) : undefined;
  // Solo redirigir al login si es un 401 (sesión expirada / no autenticado).
  // Errores 500 o de red no deben forzar un logout — se notifican como error de UI.
  useEffect(() => {
    if (httpStatus === 401) navigate('/');
  }, [httpStatus, navigate]);

  return {
    session: data ?? null,
    loading: isLoading,
    error:
      error != null && httpStatus !== 401
        ? httpStatus === 500
          ? 'El servidor no está disponible en este momento. Intenta más tarde.'
          : error instanceof Error
            ? error.message
            : 'Error al obtener la sesión.'
        : null,
  };
}
