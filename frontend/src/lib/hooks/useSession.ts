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

  const isUnauthorized = error != null && statusOf(error) === 401;

  // Sesión inválida/expirada → de vuelta al login (mismo comportamiento previo).
  useEffect(() => {
    if (isUnauthorized) navigate('/');
  }, [isUnauthorized, navigate]);

  return {
    session: data ?? null,
    loading: isLoading,
    // El 401 se resuelve con la redirección, no se expone como error de UI.
    error:
      error && !isUnauthorized
        ? error instanceof Error
          ? error.message
          : 'Error al obtener la sesión.'
        : null,
  };
}
