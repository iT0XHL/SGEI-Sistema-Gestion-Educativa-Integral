import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Eye, EyeOff, ArrowRight, ShieldAlert, Info, LifeBuoy } from 'lucide-react';
import { authApi } from '../../lib/api/auth.api';

interface Props {
  /**
   * 'page'    → ruta independiente (fondo oscurecido propio).
   * 'overlay' → se monta sobre el home del usuario (ya borroso por AppShell),
   *             por eso su fondo es transparente y avisa por `onDone`.
   */
  variant?: 'page' | 'overlay';
  onDone?: () => void;
}

export default function ForceChangePassword({ variant = 'page', onDone }: Props) {
  const navigate = useNavigate();
  const [passwordNueva, setPasswordNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!passwordNueva || passwordNueva.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (passwordNueva !== confirmacion) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const { redirectTo } = await authApi.forceChangePassword({
        password_nueva: passwordNueva,
        confirmacion,
      });
      if (variant === 'overlay') {
        // El home ya está montado detrás; solo refrescamos la sesión para que
        // desaparezca el modal (debe_cambiar_password pasó a false).
        onDone?.();
      } else {
        navigate(redirectTo || '/', { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cambiar la contraseña.');
    } finally {
      setLoading(false);
    }
  }

  const coincide = confirmacion.length > 0 && passwordNueva === confirmacion;

  return (
    // Ventana emergente bloqueante. En 'overlay' el fondo es transparente para
    // dejar ver el home del usuario (borroso, provisto por AppShell); en 'page'
    // usa su propio velo oscuro.
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
      variant === 'overlay' ? 'bg-transparent' : 'bg-slate-900/70 backdrop-blur-sm'
    }`}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="fcp-title"
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        {/* Encabezado */}
        <div className="flex items-start gap-3 border-b border-slate-100 bg-amber-50 px-6 py-5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <ShieldAlert className="size-6" />
          </div>
          <div>
            <h2 id="fcp-title" className="text-lg font-bold text-slate-900">
              Cambio de contraseña obligatorio
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Debes crear una nueva contraseña antes de continuar.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {/* El porqué del cambio */}
          <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-3">
            <Info className="mt-0.5 size-4 shrink-0 text-blue-600" />
            <p className="text-xs leading-relaxed text-blue-800">
              Por tu seguridad, reemplaza la contraseña temporal por una <strong>que recuerdes</strong>.
              Esto aparece en tu primer inicio de sesión o cuando Secretaría o la Dirección
              restablecen tu cuenta.
            </p>
          </div>

          {/* Nueva contraseña */}
          <div>
            <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-slate-700">
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                id="new-password"
                type={showPass ? 'text' : 'password'}
                value={passwordNueva}
                onChange={e => setPasswordNueva(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                autoFocus
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 pr-11 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-amber-500"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPass(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 transition-colors hover:text-slate-600"
                aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {/* Confirmar contraseña */}
          <div>
            <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium text-slate-700">
              Repite la nueva contraseña
            </label>
            <input
              id="confirm-password"
              type={showPass ? 'text' : 'password'}
              value={confirmacion}
              onChange={e => setConfirmacion(e.target.value)}
              placeholder="Vuelve a escribirla para confirmar"
              className={`w-full rounded-xl border bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:border-transparent focus:outline-none focus:ring-2
                ${confirmacion.length > 0 && !coincide
                  ? 'border-red-300 focus:ring-red-400'
                  : 'border-slate-200 focus:ring-amber-500'}`}
              autoComplete="new-password"
            />
            {confirmacion.length > 0 && !coincide && (
              <p className="mt-1 text-xs text-red-500">Las contraseñas no coinciden.</p>
            )}
          </div>

          {error && (
            <p className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600" role="alert">
              <span className="shrink-0">⚠</span> {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-3 font-medium text-white shadow-sm shadow-amber-600/20 transition-all duration-150 hover:bg-amber-700 active:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Actualizando…
              </span>
            ) : (
              <>Guardar y acceder <ArrowRight className="size-4" /></>
            )}
          </button>

          {/* Nota: recuperación vía Secretaría */}
          <div className="flex items-start gap-2.5 rounded-xl bg-slate-50 px-3.5 py-3">
            <LifeBuoy className="mt-0.5 size-4 shrink-0 text-slate-400" />
            <p className="text-xs leading-relaxed text-slate-500">
              <strong className="text-slate-600">¿Olvidaste tu contraseña?</strong> Contáctate con
              Secretaría para que restablezcan tu cuenta.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
