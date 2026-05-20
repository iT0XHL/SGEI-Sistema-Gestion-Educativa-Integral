import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { authApi } from '../api/auth.api';
import type { SessionUser } from '../api/auth.api';

export interface UseSessionResult {
  session: SessionUser | null;
  loading: boolean;
  error: string | null;
}

export function useSession(): UseSessionResult {
  const [session, setSession] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    authApi.me()
      .then((data) => {
        if (!cancelled) setSession(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const status = (err as { status?: number }).status;
          if (status === 401) {
            navigate('/');
          } else {
            setError(err instanceof Error ? err.message : 'Error al obtener la sesión.');
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [navigate]);

  return { session, loading, error };
}
