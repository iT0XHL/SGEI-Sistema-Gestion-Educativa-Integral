import { useState } from 'react';
import { useNavigate } from 'react-router';
import { GraduationCap, Eye, EyeOff, ArrowRight, BookOpen, Users, Shield, FileText } from 'lucide-react';
import type { Role } from '../data/mockData';
import { authApi } from '../../lib/api/auth.api';

interface RoleCard {
  role: Role;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  borderActive: string;
  credentials: { email: string; password: string };
}

const ROLES: RoleCard[] = [
  { role: 'Alumno',     label: 'Alumno / Padre',  description: 'Accede a tus notas, asistencias y pagos', icon: BookOpen, color: 'text-blue-600 bg-blue-50',    borderActive: 'border-blue-500 bg-blue-50 ring-2 ring-blue-200',   credentials: { email: 'carlos.mendoza@sgei.edu.pe', password: '••••••••' } },
  { role: 'Docente',    label: 'Docente',          description: 'Gestiona asistencias, tareas y calificaciones', icon: Users,  color: 'text-indigo-600 bg-indigo-50', borderActive: 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200', credentials: { email: 'ana.garcia@sgei.edu.pe',      password: '••••••••' } },
  { role: 'Admin',      label: 'Administrador',    description: 'Administra cuentas, horarios y reportes',  icon: Shield, color: 'text-slate-600 bg-slate-100',   borderActive: 'border-slate-500 bg-slate-50 ring-2 ring-slate-200',   credentials: { email: 'director@sgei.edu.pe',         password: '••••••••' } },
  { role: 'Secretaria', label: 'Secretaría',       description: 'Gestiona pagos, vouchers y exporta SIAGIE', icon: FileText,color: 'text-teal-600 bg-teal-50',     borderActive: 'border-teal-500 bg-teal-50 ring-2 ring-teal-200',     credentials: { email: 'secretaria@sgei.edu.pe',       password: '••••••••' } },
];

const ROLE_ROUTE: Record<Role, string> = {
  Alumno: '/alumno/inicio', Docente: '/docente/inicio', Admin: '/admin/inicio', Secretaria: '/secretaria/inicio',
};

export default function Login() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Role>('Alumno');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const selectedRole = ROLES.find(r => r.role === selected)!;

  function handleSelectRole(role: Role) {
    setSelected(role);
    setEmail('');
    setPassword('');
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Por favor, ingresa tu correo y contraseña.');
      return;
    }
    setLoading(true);
    try {
      const { redirectTo } = await authApi.login({ email: email.trim(), password, rol: selected });
      navigate(redirectTo || ROLE_ROUTE[selected]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Credenciales incorrectas.');
    } finally {
      setLoading(false);
    }
  }

  function fillDemo() {
    setEmail(selectedRole.credentials.email);
    setPassword('demo1234');
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-[42%] flex-col justify-between bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-12 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }} />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/30">
              <GraduationCap className="size-6 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-white tracking-tight">SGEI</p>
              <p className="text-xs text-blue-300/80 tracking-widest uppercase">Plataforma Educativa</p>
            </div>
          </div>
        </div>

        {/* Center copy */}
        <div className="relative z-10 space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight">
              Sistema de Gestión Educativa Integral
            </h1>
            <p className="mt-4 text-lg text-blue-200/80 leading-relaxed">
              Centraliza notas, asistencias, pagos y comunicación en una sola plataforma segura para toda la comunidad educativa.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { value: '450+', label: 'Estudiantes' },
              { value: '28',   label: 'Docentes' },
              { value: '100%', label: 'Digital' },
              { value: 'CNEB', label: 'Alineado' },
            ].map(stat => (
              <div key={stat.label} className="rounded-2xl bg-white/8 border border-white/10 p-4">
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-sm text-blue-300/80">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-sm text-white/30">© 2025 SGEI · Todos los derechos reservados</p>
        </div>
      </div>

      {/* ── Right panel — Login form ── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 px-6 py-12">
        {/* Mobile logo */}
        <div className="flex items-center gap-2 mb-8 lg:hidden">
          <div className="flex size-9 items-center justify-center rounded-xl bg-blue-600">
            <GraduationCap className="size-5 text-white" />
          </div>
          <p className="text-lg font-bold text-slate-900">SGEI</p>
        </div>

        <div className="w-full max-w-md">
          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-2xl font-bold text-slate-900">Bienvenido</h2>
            <p className="mt-1 text-sm text-slate-500">Selecciona tu perfil e ingresa tus credenciales</p>
          </div>

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            {ROLES.map(r => (
              <button
                key={r.role}
                type="button"
                onClick={() => handleSelectRole(r.role)}
                className={`flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all duration-150 text-left
                  ${selected === r.role
                    ? r.borderActive
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
              >
                <div className={`flex size-8 items-center justify-center rounded-lg shrink-0 ${r.color}`}>
                  <r.icon className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 leading-tight">{r.label}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Login form */}
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Correo institucional
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={selectedRole.credentials.email}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                autoComplete="email"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                  Contraseña
                </label>
                <button type="button" className="text-xs text-blue-600 hover:text-blue-800 transition-colors">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm pr-11"
                  autoComplete="current-password"
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

            {error && (
              <p className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5" role="alert">
                <span className="shrink-0">⚠</span> {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-3 rounded-xl font-medium transition-all duration-150 shadow-sm shadow-blue-600/20"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Ingresando…
                </span>
              ) : (
                <>Ingresar al sistema <ArrowRight className="size-4" /></>
              )}
            </button>

            <button
              type="button"
              onClick={fillDemo}
              className="w-full text-center text-xs text-slate-400 hover:text-blue-600 transition-colors py-1"
            >
              Usar credenciales de demo →
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            Acceso restringido solo a personal y familias autorizadas.
            <br />¿Problemas para acceder? Contacta a Secretaría.
          </p>
        </div>
      </div>
    </div>
  );
}
