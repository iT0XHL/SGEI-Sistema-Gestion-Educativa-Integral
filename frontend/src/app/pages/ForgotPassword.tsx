import { useState } from 'react';
import { Link } from 'react-router';
import { GraduationCap, ArrowLeft, MailCheck } from 'lucide-react';
import { authApi } from '../../lib/api/auth.api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo procesar la solicitud.');
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
          {sent ? (
            <div className="text-center space-y-3 py-4">
              <MailCheck className="size-10 text-emerald-500 mx-auto" />
              <h2 className="text-lg font-semibold text-slate-900">Revisa tu correo</h2>
              <p className="text-sm text-slate-500">
                Si <span className="font-medium text-slate-700">{email}</span> tiene una cuenta registrada,
                te enviamos un enlace para restablecer tu contraseña. El enlace expira en 30 minutos.
              </p>
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Recuperar contraseña</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Ingresa tu correo y te enviaremos un enlace para elegir una nueva contraseña.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Correo
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                    autoComplete="email"
                  />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-60"
                >
                  {loading ? 'Enviando…' : 'Enviar enlace de recuperación'}
                </button>
              </form>
            </>
          )}

          <Link
            to="/"
            className="flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 pt-2"
          >
            <ArrowLeft className="size-3.5" /> Volver a iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
