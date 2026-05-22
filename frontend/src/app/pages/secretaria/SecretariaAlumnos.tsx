// ============================================================
//  SecretariaAlumnos.tsx — Gestión de alumnos (vista Secretaría).
//  Conectado 100% al backend. Sin mock data.
//  Roles permitidos: Admin, Secretaria.
// ============================================================
import { useState, useEffect, useMemo } from 'react';
import {
  PlusCircle, Eye, EyeOff, X, Search, Copy, CheckCircle2,
  GraduationCap, Users, Loader2, ChevronDown, AlertCircle,
} from 'lucide-react';
import { DatePicker } from '../../components/DatePicker';
import {
  alumnosAdminApi,
  estructuraApi,
  type AlumnoResumenDTO,
  type SeccionDTO,
  type CreateAlumnoPayload,
} from '../../../lib/api/admin.api';

// ── Helpers ───────────────────────────────────────────────────
const GRUPOS_SANGUINEOS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function generateLogin(nombres: string, apellido: string): string {
  const n = normalize(nombres).split(' ')[0].replace(/[^a-z]/g, '');
  const a = normalize(apellido).replace(/[^a-z]/g, '');
  return `${n}.${a}@calasanz.edu.pe`;
}

function generatePassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

const INIT_FORM = {
  nombres:            '',
  apellido_paterno:   '',
  apellido_materno:   '',
  dni:                '',
  fecha_nacimiento:   '',
  sexo:               'M' as 'M' | 'F',
  seccion_id:         '',
  grupo_sanguineo:    '',
  codigo_siagie:      '',
  direccion:          '',
  distrito:           '',
  telefono_emergencia: '',
  condicion_especial:  '',
};

// ── Componente ────────────────────────────────────────────────
export default function SecretariaAlumnos() {
  const [alumnos,   setAlumnos]   = useState<AlumnoResumenDTO[]>([]);
  const [secciones, setSecciones] = useState<SeccionDTO[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [fetchError, setFetchError] = useState('');

  // Filtros
  const [search,     setSearch]     = useState('');
  const [filterNivel, setFilterNivel] = useState<'all' | 'Primaria' | 'Secundaria'>('all');
  const [filterSeccion, setFilterSeccion] = useState('');

  // Modal crear
  const [modal,  setModal]  = useState(false);
  const [form,   setForm]   = useState(INIT_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Credenciales generadas
  const [newCred, setNewCred]   = useState<{ nombre: string; login: string; pass: string } | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [copied,   setCopied]   = useState(false);

  // Acciones fila
  const [actionId, setActionId] = useState<string | null>(null);

  // ── Carga inicial ────────────────────────────────────────────
  useEffect(() => {
    async function cargar() {
      setLoading(true);
      setFetchError('');
      try {
        const [alumnosRes, seccionesRes] = await Promise.all([
          alumnosAdminApi.listar({ limit: 200, activo: 'true' }),
          estructuraApi.secciones(),
        ]);
        setAlumnos(alumnosRes.items);
        setSecciones(seccionesRes);
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : 'Error al cargar datos.');
      } finally {
        setLoading(false);
      }
    }
    cargar();
  }, []);

  // ── Filtrado ─────────────────────────────────────────────────
  const seccionesFiltered = useMemo(
    () => secciones.filter(s => filterNivel === 'all' || s.grado.nivel.nombre === filterNivel),
    [secciones, filterNivel],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return alumnos.filter(a => {
      const nombre = `${a.nombres} ${a.apellido_paterno} ${a.apellido_materno}`.toLowerCase();
      const matchSearch = !q || nombre.includes(q) || a.dni.includes(q) || (a.usuario_login ?? '').toLowerCase().includes(q);
      const matchNivel  = filterNivel === 'all' || a.seccion.grado.nivel?.nombre === filterNivel;
      const matchSecc   = !filterSeccion || a.seccion.id === filterSeccion;
      return matchSearch && matchNivel && matchSecc;
    });
  }, [alumnos, search, filterNivel, filterSeccion]);

  // Contadores
  const countSec = alumnos.filter(a => a.seccion.grado.nivel?.nombre === 'Secundaria').length;
  const countPri = alumnos.filter(a => a.seccion.grado.nivel?.nombre === 'Primaria').length;

  // ── Crear alumno ─────────────────────────────────────────────
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.seccion_id) { setFormError('Selecciona una sección.'); return; }
    if (!/^\d{8}$/.test(form.dni)) { setFormError('El DNI debe tener exactamente 8 dígitos.'); return; }
    if (!form.fecha_nacimiento) { setFormError('La fecha de nacimiento es obligatoria.'); return; }

    const seccion = secciones.find(s => s.id === form.seccion_id);
    if (!seccion) { setFormError('Sección inválida.'); return; }

    const usuario_login = generateLogin(form.nombres, form.apellido_paterno);
    const password      = generatePassword();

    const payload: CreateAlumnoPayload = {
      usuario_login,
      password,
      seccion_id:       form.seccion_id,
      periodo_id:       seccion.periodo_id,
      dni:              form.dni,
      nombres:          form.nombres.trim(),
      apellido_paterno: form.apellido_paterno.trim(),
      apellido_materno: form.apellido_materno.trim(),
      fecha_nacimiento: form.fecha_nacimiento,
      sexo:             form.sexo,
      ...(form.grupo_sanguineo     ? { grupo_sanguineo:     form.grupo_sanguineo }     : {}),
      ...(form.codigo_siagie       ? { codigo_siagie:       form.codigo_siagie }       : {}),
      ...(form.direccion           ? { direccion:           form.direccion }           : {}),
      ...(form.distrito            ? { distrito:            form.distrito }            : {}),
      ...(form.telefono_emergencia ? { telefono_emergencia: form.telefono_emergencia } : {}),
      ...(form.condicion_especial  ? { condicion_especial:  form.condicion_especial }  : {}),
    };

    setSaving(true);
    setFormError('');
    try {
      const alumno = await alumnosAdminApi.crear(payload);
      setAlumnos(prev => [alumno, ...prev]);
      setNewCred({
        nombre: `${alumno.nombres} ${alumno.apellido_paterno}`,
        login:  usuario_login,
        pass:   password,
      });
      setForm(INIT_FORM);
      setModal(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al crear el alumno.');
    } finally {
      setSaving(false);
    }
  }

  // ── Desactivar alumno ─────────────────────────────────────────
  async function handleDesactivar(id: string) {
    setActionId(id);
    try {
      await alumnosAdminApi.desactivar(id);
      setAlumnos(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Error al desactivar el alumno.');
    } finally {
      setActionId(null);
    }
  }

  function copyCredentials() {
    if (!newCred) return;
    navigator.clipboard.writeText(`Usuario: ${newCred.login}\nContraseña: ${newCred.pass}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Render ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-slate-200 rounded" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-200 rounded-2xl" />)}
        </div>
        <div className="h-12 bg-slate-200 rounded-xl" />
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 mx-4 my-2 bg-slate-100 rounded" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500 mb-1">Panel de secretaría</p>
          <h1 className="text-2xl font-bold text-slate-900">Gestión de Alumnos</h1>
          <p className="text-sm text-slate-500 mt-0.5">{alumnos.length} alumnos activos registrados</p>
        </div>
        <button
          onClick={() => { setModal(true); setFormError(''); setForm(INIT_FORM); }}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm self-start sm:self-auto"
        >
          <PlusCircle className="size-4" /> Agregar alumno
        </button>
      </div>

      {/* Error */}
      {fetchError && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
          <AlertCircle className="size-5 text-red-600 shrink-0" />
          <p className="text-sm text-red-800 flex-1">{fetchError}</p>
          <button onClick={() => setFetchError('')} className="p-1 rounded-lg hover:bg-red-100">
            <X className="size-4 text-red-500" />
          </button>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="flex size-9 items-center justify-center rounded-xl bg-teal-50 mb-2">
            <Users className="size-5 text-teal-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{alumnos.length}</p>
          <p className="text-sm text-slate-500 mt-0.5">Total alumnos</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50 mb-2">
            <GraduationCap className="size-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{countSec}</p>
          <p className="text-sm text-slate-500 mt-0.5">Secundaria</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="flex size-9 items-center justify-center rounded-xl bg-purple-50 mb-2">
            <GraduationCap className="size-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{countPri}</p>
          <p className="text-sm text-slate-500 mt-0.5">Primaria</p>
        </div>
      </div>

      {/* Credenciales banner */}
      {newCred && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800 mb-1">
                Credenciales generadas para <span className="text-amber-900">{newCred.nombre}</span> — mostrar UNA SOLA VEZ
              </p>
              <div className="bg-white rounded-xl border border-amber-200 p-4 space-y-2 font-mono text-sm">
                <p className="text-slate-700">
                  <span className="text-slate-500">Usuario:</span> {newCred.login}
                </p>
                <p className="text-slate-700 flex items-center gap-2">
                  <span className="text-slate-500">Contraseña:</span>
                  {showPass ? newCred.pass : '••••••••••'}
                  <button onClick={() => setShowPass(p => !p)} className="text-slate-400 hover:text-slate-600">
                    {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </p>
              </div>
            </div>
            <button onClick={() => setNewCred(null)} className="p-1.5 rounded-lg hover:bg-amber-100 shrink-0">
              <X className="size-4 text-amber-700" />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={copyCredentials}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-medium transition-colors"
            >
              {copied ? <CheckCircle2 className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? '¡Copiado!' : 'Copiar credenciales'}
            </button>
            <p className="text-xs text-amber-600">Entrega las credenciales al alumno o apoderado de forma segura.</p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {(['all', 'Primaria', 'Secundaria'] as const).map(n => (
            <button
              key={n}
              onClick={() => { setFilterNivel(n); setFilterSeccion(''); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filterNivel === n ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {n === 'all' ? 'Todos' : n}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="search"
            placeholder="Buscar alumno, DNI, usuario…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </div>

        <div className="relative">
          <select
            value={filterSeccion}
            onChange={e => setFilterSeccion(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400 min-w-[160px]"
          >
            <option value="">Todas las secciones</option>
            {seccionesFiltered.map(s => (
              <option key={s.id} value={s.id}>
                {s.grado.nombre} &quot;{s.nombre}&quot;
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Alumno</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">DNI</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sexo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Grado / Sección</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Usuario</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(a => {
                const nombre = `${a.nombres} ${a.apellido_paterno} ${a.apellido_materno}`;
                return (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-8 items-center justify-center rounded-full bg-teal-100 text-teal-700 text-xs font-semibold shrink-0">
                          {initials(nombre)}
                        </div>
                        <span className="font-semibold text-slate-800">{nombre}</span>
                      </div>
                    </td>
                    <td className="text-center px-4 py-3.5">
                      <span className="font-mono text-xs text-slate-600">{a.dni}</span>
                    </td>
                    <td className="text-center px-4 py-3.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${
                        a.bloqueo_manual
                          ? 'bg-slate-50 text-slate-500 border-slate-200'
                          : 'bg-teal-50 text-teal-700 border-teal-200'
                      }`}>
                        {a.bloqueo_manual ? 'Bloqueado' : 'Activo'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {a.seccion.grado.nombre} &quot;{a.seccion.nombre}&quot;
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      {a.usuario_login ? (
                        <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg">{a.usuario_login}</span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => handleDesactivar(a.id)}
                        disabled={actionId === a.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border bg-red-50 text-red-700 border-red-200 hover:bg-red-100 disabled:opacity-50"
                      >
                        {actionId === a.id ? <Loader2 className="size-3 animate-spin" /> : null}
                        Desactivar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="flex flex-col items-center py-12 text-center">
              <Users className="size-10 text-slate-200 mb-3" />
              <p className="text-slate-500">No se encontraron alumnos</p>
              {(search || filterNivel !== 'all' || filterSeccion) && (
                <button
                  onClick={() => { setSearch(''); setFilterNivel('all'); setFilterSeccion(''); }}
                  className="mt-2 text-sm text-teal-600 hover:underline"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal crear alumno */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-800">Agregar nuevo alumno</h3>
              <button onClick={() => setModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="size-4 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {/* Nombres */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre(s) <span className="text-red-500">*</span></label>
                <input
                  required
                  value={form.nombres}
                  onChange={e => setForm(f => ({ ...f, nombres: e.target.value }))}
                  placeholder="Ej. Ana Lucía"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>

              {/* Apellidos */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Apellido paterno <span className="text-red-500">*</span></label>
                  <input
                    required
                    value={form.apellido_paterno}
                    onChange={e => setForm(f => ({ ...f, apellido_paterno: e.target.value }))}
                    placeholder="Ej. Pérez"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Apellido materno <span className="text-red-500">*</span></label>
                  <input
                    required
                    value={form.apellido_materno}
                    onChange={e => setForm(f => ({ ...f, apellido_materno: e.target.value }))}
                    placeholder="Ej. Torres"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>
              </div>

              {/* DNI */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">DNI <span className="text-red-500">*</span></label>
                <input
                  value={form.dni}
                  onChange={e => setForm(f => ({ ...f, dni: e.target.value.replace(/\D/g, '').slice(0, 8) }))}
                  placeholder="8 dígitos"
                  maxLength={8}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono focus:outline-none focus:ring-2 transition-all ${
                    form.dni.length > 0 && form.dni.length !== 8
                      ? 'border-red-400 bg-red-50 focus:ring-red-400'
                      : form.dni.length === 8
                        ? 'border-emerald-400 bg-emerald-50 focus:ring-emerald-400'
                        : 'border-slate-200 bg-slate-50 focus:ring-teal-400'
                  }`}
                />
                {form.dni.length > 0 && form.dni.length !== 8 && (
                  <p className="text-xs text-red-600 mt-1">El DNI debe tener exactamente 8 dígitos.</p>
                )}
              </div>

              {/* Fecha de nacimiento */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Fecha de nacimiento <span className="text-red-500">*</span></label>
                <DatePicker
                  value={form.fecha_nacimiento}
                  onChange={v => setForm(f => ({ ...f, fecha_nacimiento: v }))}
                  max={new Date().toISOString().split('T')[0]}
                  placeholder="DD/MM/AAAA"
                  color="teal"
                  hasError={false}
                />
              </div>

              {/* Sexo */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Sexo <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  {([['M', 'Masculino'], ['F', 'Femenino']] as const).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, sexo: val }))}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                        form.sexo === val
                          ? val === 'M'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-pink-600 text-white border-pink-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sección */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Sección <span className="text-red-500">*</span></label>
                <div className="relative">
                  <select
                    required
                    value={form.seccion_id}
                    onChange={e => setForm(f => ({ ...f, seccion_id: e.target.value }))}
                    className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400"
                  >
                    <option value="">Selecciona una sección</option>
                    {secciones.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.grado.nivel.nombre} — {s.grado.nombre} &quot;{s.nombre}&quot;
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Grupo sanguíneo (opcional) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Grupo sanguíneo</label>
                <div className="relative">
                  <select
                    value={form.grupo_sanguineo}
                    onChange={e => setForm(f => ({ ...f, grupo_sanguineo: e.target.value }))}
                    className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400"
                  >
                    <option value="">Sin especificar</option>
                    {GRUPOS_SANGUINEOS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Error */}
              {formError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  <AlertCircle className="size-4 text-red-500 shrink-0" />
                  <p className="text-xs text-red-700">{formError}</p>
                </div>
              )}

              <div className="bg-teal-50 border border-teal-200 rounded-xl p-3">
                <p className="text-xs text-teal-700">
                  El usuario se generará automáticamente del nombre y la contraseña se mostrará <strong>una sola vez</strong>.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                >
                  {saving ? <><Loader2 className="size-4 animate-spin" /> Guardando…</> : 'Crear alumno'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
