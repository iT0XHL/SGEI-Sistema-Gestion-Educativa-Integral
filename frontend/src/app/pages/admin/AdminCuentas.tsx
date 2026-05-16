import { useState } from 'react';
import { PlusCircle, Eye, EyeOff, X, UserCheck, UserX, Search, Copy, CheckCircle2, ChevronDown, Phone } from 'lucide-react';
import { TEACHER_ACCOUNTS } from '../../data/mockData';

const MATERIAS = [
  'Matemática',
  'Comunicación',
  'Historia, Geografía y Economía',
  'Ciencias Sociales',
  'Ciencia y Tecnología',
  'Inglés',
  'Educación Física',
  'Arte y Cultura',
  'Educación para el Trabajo',
  'DPCC',
  'Formación Religiosa',
  'Tutoría',
  'Computación e Informática',
];

interface Account {
  id: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  name: string;       // display: computed from the three name fields
  dni: string;
  role: string;
  subject: string;
  email: string;
  telefono: string;
  status: 'active' | 'inactive';
  created: string;
}

export default function AdminCuentas() {
  const [accounts, setAccounts] = useState<Account[]>(TEACHER_ACCOUNTS as Account[]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [copied, setCopied] = useState(false);

  // Estado para mostrar errores tras intento de envío
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Form state — 4 campos NOT NULL separados + campos existentes
  const [form, setForm] = useState({
    nombres: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    dni: '',
    role: 'Docente',
    subject: '',
    email: '',
    telefono: '',
  });

  const fullName = [form.nombres, form.apellidoPaterno, form.apellidoMaterno].filter(Boolean).join(' ');
  const dniError = form.dni.length > 0 && form.dni.length !== 8 ? 'El DNI debe tener exactamente 8 dígitos.' : '';

  const filtered = accounts.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase()) ||
    a.role.toLowerCase().includes(search.toLowerCase())
  );

  function generatePassword() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
    return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitAttempted(true);
    if (!form.nombres.trim() || !form.apellidoPaterno.trim()) return;
    if (dniError || form.dni.length !== 8) return;
    if (!form.email.trim()) return;
    if (form.email.length > 150) return;                                         // Corrección 2.2
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return;                 // Corrección 2.2
    if (form.role === 'Docente' && !form.subject) return;  // área obligatoria para Docente
    const pass = generatePassword();
    const newAccount: Account = {
      id: `ta${Date.now()}`,
      nombres: form.nombres,
      apellidoPaterno: form.apellidoPaterno,
      apellidoMaterno: form.apellidoMaterno,
      name: fullName,
      dni: form.dni,
      role: form.role,
      subject: form.subject || '—',
      email: form.email,
      telefono: form.telefono,
      status: 'active',
      created: new Date().toLocaleDateString('es-PE'),
    };
    setAccounts(prev => [newAccount, ...prev]);
    setCredentials({ email: form.email, password: pass });
    setForm({ nombres: '', apellidoPaterno: '', apellidoMaterno: '', dni: '', role: 'Docente', subject: '', email: '', telefono: '' });
    setSubmitAttempted(false);
    setModal(false);
  }

  function toggleStatus(id: string) {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, status: a.status === 'active' ? 'inactive' : 'active' } : a));
  }

  function copyCredentials() {
    if (!credentials) return;
    navigator.clipboard.writeText(`Correo: ${credentials.email}\nContraseña: ${credentials.password}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestión de Cuentas</h1>
          <p className="text-sm text-slate-500 mt-0.5">{accounts.filter(a=>a.status==='active').length} usuarios activos</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="search"
              placeholder="Buscar usuario…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 w-48"
            />
          </div>
          <button
            onClick={() => { setModal(true); setSubmitAttempted(false); }}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
          >
            <PlusCircle className="size-4" /> Nueva cuenta
          </button>
        </div>
      </div>

      {/* Credentials reveal (shown once after creation) */}
      {credentials && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800 mb-2">⚠ Credenciales generadas — Muéstralas UNA SOLA VEZ</p>
              <div className="bg-white rounded-xl border border-amber-200 p-4 space-y-2 font-mono text-sm">
                <p className="text-slate-700"><span className="text-slate-500">Correo:</span> {credentials.email}</p>
                <p className="text-slate-700 flex items-center gap-2">
                  <span className="text-slate-500">Contraseña:</span>
                  {showPass ? credentials.password : '••••••••••'}
                  <button onClick={() => setShowPass(p=>!p)} className="text-slate-400 hover:text-slate-600">
                    {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </p>
              </div>
            </div>
            <button onClick={() => setCredentials(null)} className="p-1.5 rounded-lg hover:bg-amber-100 shrink-0">
              <X className="size-4 text-amber-700" />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={copyCredentials}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-medium transition-colors"
            >
              {copied ? <CheckCircle2 className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? 'Copiado!' : 'Copiar credenciales'}
            </button>
            <p className="text-xs text-amber-600">Entrégalas al usuario de forma segura. No se mostrarán nuevamente.</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Usuario</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Rol</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Correo</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Creado</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map(acc => (
              <tr key={acc.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 text-xs font-semibold shrink-0">
                      {acc.name.split(' ').map(n=>n[0]).slice(0,2).join('')}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{acc.name}</p>
                      {acc.subject !== '—' && <p className="text-xs text-slate-400">{acc.subject}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${
                    acc.role === 'Docente' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-teal-50 text-teal-700 border-teal-200'
                  }`}>
                    {acc.role}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-slate-500 text-sm hidden md:table-cell">{acc.email}</td>
                <td className="px-4 py-3.5 text-slate-400 text-xs hidden lg:table-cell">{acc.created}</td>
                <td className="text-center px-4 py-3.5">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                    acc.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}>
                    {acc.status === 'active' ? <><UserCheck className="size-3" />Activo</> : <><UserX className="size-3" />Inactivo</>}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right">
                  <button
                    onClick={() => toggleStatus(acc.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border ${
                      acc.status === 'active'
                        ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    {acc.status === 'active' ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="flex flex-col items-center py-12 text-center">
            <p className="text-slate-500">No se encontraron usuarios</p>
          </div>
        )}
      </div>

      {/* Create account modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h3 className="text-base font-semibold text-slate-800">Crear nueva cuenta</h3>
              <button onClick={() => setModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="size-4 text-slate-500" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">

              {/* Nombres separados — NOT NULL */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Nombre(s) <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={form.nombres}
                  onChange={e => setForm(f => ({ ...f, nombres: e.target.value }))}
                  placeholder="Ej. Juan Carlos"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
                {submitAttempted && !form.nombres.trim() && (
                  <p className="mt-1 text-xs text-red-500">Campo obligatorio</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Apellido paterno <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    value={form.apellidoPaterno}
                    onChange={e => setForm(f => ({ ...f, apellidoPaterno: e.target.value }))}
                    placeholder="Ej. Pérez"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                  {submitAttempted && !form.apellidoPaterno.trim() && (
                    <p className="mt-1 text-xs text-red-500">Campo obligatorio</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Apellido materno</label>
                  <input
                    value={form.apellidoMaterno}
                    onChange={e => setForm(f => ({ ...f, apellidoMaterno: e.target.value }))}
                    placeholder="Ej. González"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </div>
              </div>

              {/* Nombre completo preview */}
              {fullName && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                  <span className="text-xs text-slate-500">Nombre completo: </span>
                  <span className="text-xs font-semibold text-slate-800">{fullName}</span>
                </div>
              )}

              {/* DNI — NOT NULL, 8 dígitos */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  DNI <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.dni}
                  onChange={e => setForm(f => ({ ...f, dni: e.target.value.replace(/\D/g, '').slice(0, 8) }))}
                  placeholder="8 dígitos"
                  maxLength={8}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono focus:outline-none focus:ring-2 transition-all ${
                    dniError
                      ? 'border-red-400 bg-red-50 text-red-700 focus:ring-red-400'
                      : form.dni.length === 8
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-800 focus:ring-emerald-400'
                        : 'border-slate-200 bg-slate-50 focus:ring-slate-400'
                  }`}
                />
                {dniError && (
                  <p className="flex items-center gap-1 mt-1 text-xs text-red-600">
                    <svg className="size-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {dniError}
                  </p>
                )}
                {form.dni.length === 8 && (
                  <p className="flex items-center gap-1 mt-1 text-xs text-emerald-600">
                    <svg className="size-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    DNI válido
                  </p>
                )}
              </div>

              {/* Rol + Área */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Rol</label>
                  <div className="relative">
                    <select
                      value={form.role}
                      onChange={e => setForm(f => ({ ...f, role: e.target.value, subject: '' }))}
                      className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    >
                      <option>Docente</option>
                      <option>Secretaría</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                {form.role === 'Docente' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Área / Materia <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        required
                        value={form.subject}
                        onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                        className={`w-full appearance-none border text-sm rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 transition-all ${
                          form.subject
                            ? 'border-emerald-400 bg-emerald-50 text-emerald-800 focus:ring-emerald-400'
                            : 'border-slate-200 bg-slate-50 text-slate-500 focus:ring-slate-400'
                        }`}
                      >
                        <option value="">Seleccionar materia…</option>
                        {MATERIAS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                    </div>
                    {!form.subject && (
                      <p className="mt-1 text-xs text-red-500">Campo obligatorio</p>
                    )}
                  </div>
                )}
              </div>

              {/* Teléfono */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <span className="flex items-center gap-1.5"><Phone className="size-3.5 text-slate-400" /> Número de teléfono</span>
                </label>
                <input
                  type="tel"
                  value={form.telefono}
                  onChange={e => setForm(f => ({ ...f, telefono: e.target.value.replace(/\D/g, '').slice(0, 9) }))}
                  placeholder="Ej. 987654321"
                  maxLength={9}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>

              {/* Correo institucional */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Correo institucional <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  maxLength={150}
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="nombre.apellido@sgei.edu.pe"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
                {submitAttempted && !form.email.trim() && (
                  <p className="mt-1 text-xs text-red-500">Campo obligatorio</p>
                )}
                {submitAttempted && form.email.trim() && form.email.length > 150 && (
                  <p className="mt-1 text-xs text-red-500">El correo no puede superar los 150 caracteres</p>
                )}
                {submitAttempted && form.email.trim() && form.email.length <= 150 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) && (
                  <p className="mt-1 text-xs text-red-500">El formato del correo no es válido</p>
                )}
              </div>

              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-500">La contraseña se generará automáticamente y se mostrará <strong>una sola vez</strong>. Entrégala al usuario de forma segura.</p>
              </div>
              <div className="flex gap-3 pb-2">
                <button type="button" onClick={() => setModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancelar</button>
                <button type="submit" className="flex-1 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">Crear cuenta</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}