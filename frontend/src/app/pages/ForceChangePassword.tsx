import { useState } from 'react';
import { useNavigate } from 'react-router';
import { GraduationCap, Eye, EyeOff, ArrowRight, Shield } from 'lucide-react';
import { authApi } from '../../lib/api/auth.api';

export default function ForceChangePassword() {
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
      navigate(redirectTo || '/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cambiar la contraseña.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-[42%] flex-col justify-between bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }} />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-amber-600/15 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-600 shadow-lg shadow-amber-600/30">
              <Shield className="size-6 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-white tracking-tight">SGEI</p>
              <p className="text-xs text-blue-300/80 tracking-widest uppercase">Cambio de Contraseña</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight">
              Configura tu nueva contraseña
            </h1>
            <p className="mt-4 text-lg text-blue-200/80 leading-relaxed">
              Por seguridad, debes establecer una nueva contraseña antes de acceder al sistema.
            </p>
          </div>

          <div className="rounded-2xl bg-white/8 border border-white/10 p-5 space-y-3">
            <p className="text-sm font-medium text-white">Requisitos:</p>
            <ul className="space-y-2 text-sm text-blue-200/70">
              <li className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-amber-400" />
                Mínimo 8 caracteres
              </li>
              <li className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-amber-400" />
                No debe ser igual a la anterior
              </li>
              <li className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-amber-400" />
                Debe coincidir la confirmación
              </li>
            </ul>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-sm text-white/30">© 2026 SGEI · Todos los derechos reservados</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 px-6 py-12">
        <div className="flex items-center gap-2 mb-8 lg:hidden">
          <div className="flex size-9 items-center justify-center rounded-xl bg-amber-600">
            <Shield className="size-5 text-white" />
          </div>
          <p className="text-lg font-bold text-slate-900">Cambiar Contraseña</p>
        </div>

        <div className="w-full max-w-md">
          <div className="mb-8 text-center lg:text-left">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <Shield className="size-5" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Cambio obligatorio</h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Tu contraseña fue restablecida por un administrador o es tu primer inicio de sesión. Establece una nueva.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Nueva contraseña
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showPass ? 'text' : 'password'}
                  value={passwordNueva}
                  onChange={e => setPasswordNueva(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all text-sm pr-11"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Confirmar nueva contraseña
              </label>
              <input
                id="confirm-password"
                type={showPass ? 'text' : 'password'}
                value={confirmacion}
                onChange={e => setConfirmacion(e.target.value)}
                placeholder="Repite la contraseña"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all text-sm"
                autoComplete="new-password"
              />
            </div>

            {error && (
              <p className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5" role="alert">
                <span className="shrink-0">⚠</span> {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-3 rounded-xl font-medium transition-all duration-150 shadow-sm shadow-amber-600/20"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Actualizando…
                </span>
              ) : (
                <>Actualizar y acceder <ArrowRight className="size-4" /></>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
