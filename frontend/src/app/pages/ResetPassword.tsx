import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { GraduationCap, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { authApi } from '../../lib/api/auth.api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setError('El enlace no es válido. Solicita uno nuevo.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate('/'), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'El enlace es inválido o expiró.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="flex size-9 items-center justify-center rounded-xl bg-blue-600">
            <GraduationCap className="size-5 text-white" />
          </div>
          <p className="text-lg font-bold text-slate-900">SGEI</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          {done ? (
            <div className="text-center space-y-3 py-4">
              <CheckCircle2 className="size-10 text-emerald-500 mx-auto" />
              <h2 className="text-lg font-semibold text-slate-900">Contraseña actualizada</h2>
              <p className="text-sm text-slate-500">Redirigiendo al inicio de sesión…</p>
            </div>
          ) : !token ? (
            <div className="text-center space-y-3 py-4">
              <p className="text-sm text-red-600">
                El enlace no incluye un token válido. Solicita uno nuevo desde la pantalla de inicio de sesión.
              </p>
              <Link to="/" className="text-sm text-blue-600 hover:underline">Volver a iniciar sesión</Link>
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Elige una nueva contraseña</h2>
                <p className="mt-1 text-sm text-slate-500">Mínimo 8 caracteres.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Nueva contraseña
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPass ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm pr-11"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirm" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Confirmar contraseña
                  </label>
                  <input
                    id="confirm"
                    type={showPass ? 'text' : 'password'}
                    required
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                    autoComplete="new-password"
                  />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-60"
                >
                  {loading ? 'Guardando…' : 'Cambiar contraseña'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
