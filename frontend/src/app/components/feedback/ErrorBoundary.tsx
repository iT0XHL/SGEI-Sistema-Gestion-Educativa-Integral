// ============================================================
//  components/feedback/ErrorBoundary.tsx
//  Límites de error de la aplicación (defensa en profundidad):
//   · ErrorFallback       — UI reutilizable, en español, sin filtrar
//                           detalles técnicos al usuario final.
//   · RouteErrorBoundary  — errorElement de React Router: captura errores
//                           de render/loader de cualquier página.
//   · AppErrorBoundary    — límite de clase para errores fuera del router
//                           (providers, montaje del árbol).
//  Antes de esto, un error de render dejaba la pantalla en blanco (o la
//  pantalla por defecto de React Router en inglés).
// ============================================================
import { Component, type ReactNode } from 'react';
import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorFallbackProps {
  /** Acción de reintento (recargar la vista). Si se omite, se oculta el botón. */
  onRetry?: () => void;
  /** Acción de "volver al inicio". Si se omite, se oculta el botón. */
  onGoHome?: () => void;
}

/** Tarjeta de error reutilizable — misma presentación para todos los límites. */
export function ErrorFallback({ onRetry, onGoHome }: ErrorFallbackProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div
        role="alert"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"
      >
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-red-50">
          <AlertTriangle className="size-6 text-red-500" />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-slate-900">
          Ocurrió un problema
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          No pudimos mostrar esta sección. Puedes reintentar o volver al inicio.
          Si el problema persiste, contacta a Secretaría.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              <RefreshCw className="size-4" />
              Reintentar
            </button>
          )}
          {onGoHome && (
            <button
              onClick={onGoHome}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Home className="size-4" />
              Ir al inicio
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * errorElement de React Router: captura errores de render o de loaders en
 * cualquier página y muestra la tarjeta en español en lugar de la pantalla
 * por defecto del router. El detalle técnico se registra en consola.
 */
export function RouteErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  // Registro para depuración (no se expone al usuario).
  if (isRouteErrorResponse(error)) {
    console.error(`[SGEI] Error de ruta ${error.status}:`, error.data);
  } else {
    console.error('[SGEI] Error de ruta:', error);
  }

  return (
    <ErrorFallback
      onRetry={() => navigate(0)}
      onGoHome={() => navigate('/', { replace: true })}
    />
  );
}

/**
 * Límite de error de clase para errores que ocurren fuera del árbol del router
 * (p. ej. en los providers). Sólo usa window.location, por lo que no depende
 * de ningún contexto.
 */
export class AppErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[SGEI] Error no controlado:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          onRetry={() => window.location.reload()}
          onGoHome={() => window.location.assign('/')}
        />
      );
    }
    return this.props.children;
  }
}
