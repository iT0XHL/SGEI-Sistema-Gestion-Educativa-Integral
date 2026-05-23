import { useState, useEffect, useMemo } from 'react';
import {
  PlusCircle, Search, Loader2, AlertTriangle, Edit2, Trash2, ChevronDown, X,
  RefreshCw, Eye, EyeOff,
} from 'lucide-react';
import { DatePicker } from '../../components/DatePicker';
import {
  alumnosAdminApi, estructuraApi,
} from '../../../lib/api/admin.api';
import type {
  AlumnoResumenDTO, SeccionDTO,
  CreateAlumnoPayload, UpdateAlumnoPayload,
} from '../../../lib/api/admin.api';

const INIT_FORM = {
  usuario_login: '', password: '',
  nombres: '', apellido_paterno: '', apellido_materno: '', dni: '',
  fecha_nacimiento: '', sexo: 'M' as 'M' | 'F', seccion_id: '',
  grupo_sanguineo: '', codigo_siagie: '', direccion: '',
  distrito: '', telefono_emergencia: '', condicion_especial: '',
};

function generateLogin(nombres: string, apellido: string): string {
  const n = (nombres.split(' ')[0] || '').replace(/[^a-z]/gi, '').toLowerCase();
  const a = apellido.replace(/[^a-z]/gi, '').toLowerCase();
  if (!n || !a) return '';
  return `${n}.${a}@calasanz.edu.pe`;
}

function generatePassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

export default function SecretariaAlumnos() {
  const [alumnos, setAlumnos] = useState<AlumnoResumenDTO[]>([]);
  const [secciones, setSecciones] = useState<SeccionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [nivelTab, setNivelTab] = useState<'Primaria' | 'Secundaria' | ''>('');

  const [modal, setModal] = useState(false);
  const [modalMode, setModalMode] = useState<'crear' | 'editar'>('crear');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingOriginalLogin, setEditingOriginalLogin] = useState('');
  const [form, setForm] = useState(INIT_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [aluRes, secRes] = await Promise.all([
        alumnosAdminApi.listar({ limit: 200 }),
        estructuraApi.secciones(),
      ]);
      setAlumnos(aluRes.items);
      setSecciones(secRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return alumnos.filter(a => {
      const nombre = `${a.nombres} ${a.apellido_paterno} ${a.apellido_materno}`.toLowerCase();
      const matchSearch = !q || nombre.includes(q) || a.dni.includes(q) || (a.usuario_login ?? '').toLowerCase().includes(q);

      const nivel = a.seccion?.grado?.nivel?.nombre;
      const matchNivel = !nivelTab || nivel === nivelTab;

      return matchSearch && matchNivel;
    });
  }, [alumnos, search, nivelTab]);

  function openCreate() {
    setModalMode('crear');
    setEditingId(null);
    setEditingOriginalLogin('');
    setForm({ ...INIT_FORM, password: generatePassword() });
    setFormError('');
    setShowPassword(true);
    setModal(true);
  }

  function openEdit(alumno: AlumnoResumenDTO) {
    setModalMode('editar');
    setEditingId(alumno.id);
    setEditingOriginalLogin(alumno.usuario_login ?? '');
    setForm({
      ...INIT_FORM,
      usuario_login: alumno.usuario_login ?? '',
      password: '',
      nombres: alumno.nombres,
      apellido_paterno: alumno.apellido_paterno,
      apellido_materno: alumno.apellido_materno,
      dni: alumno.dni,
      seccion_id: alumno.seccion?.id ?? '',
    });
    setFormError('');
    setShowPassword(false);
    setModal(true);
  }

  function autoLogin() {
    const login = generateLogin(form.nombres, form.apellido_paterno);
    if (login) setForm(f => ({ ...f, usuario_login: login }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.usuario_login.trim()) { setFormError('Correo institucional es obligatorio'); return; }
    if (!form.password || form.password.length < 8) { setFormError('La contraseña debe tener al menos 8 caracteres'); return; }
    if (!form.seccion_id) { setFormError('Selecciona una sección'); return; }
    if (!/^\d{8}$/.test(form.dni)) { setFormError('DNI debe tener 8 dígitos'); return; }
    if (!form.fecha_nacimiento) { setFormError('Fecha de nacimiento es obligatoria'); return; }

    const seccion = secciones.find(s => s.id === form.seccion_id);
    if (!seccion) { setFormError('Sección inválida'); return; }

    const payload: CreateAlumnoPayload = {
      usuario_login: form.usuario_login.trim(),
      password: form.password,
      seccion_id: form.seccion_id,
      periodo_id: seccion.periodo_id,
      dni: form.dni,
      nombres: form.nombres.trim(),
      apellido_paterno: form.apellido_paterno.trim(),
      apellido_materno: form.apellido_materno.trim(),
      fecha_nacimiento: form.fecha_nacimiento,
      sexo: form.sexo,
      ...(form.grupo_sanguineo ? { grupo_sanguineo: form.grupo_sanguineo } : {}),
      ...(form.codigo_siagie ? { codigo_siagie: form.codigo_siagie } : {}),
      ...(form.direccion ? { direccion: form.direccion } : {}),
      ...(form.distrito ? { distrito: form.distrito } : {}),
      ...(form.telefono_emergencia ? { telefono_emergencia: form.telefono_emergencia } : {}),
      ...(form.condicion_especial ? { condicion_especial: form.condicion_especial } : {}),
    };

    setSaving(true);
    try {
      await alumnosAdminApi.crear(payload);
      await loadData();
      setModal(false);
      setForm(INIT_FORM);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al crear alumno');
    } finally {
      setSaving(false);
    }
  }

  async function handleActualizar(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    if (!form.usuario_login.trim()) { setFormError('Correo institucional es obligatorio'); return; }
    if (!form.seccion_id) { setFormError('Selecciona una sección'); return; }
    if (!/^\d{8}$/.test(form.dni)) { setFormError('DNI debe tener 8 dígitos'); return; }
    if (form.password && form.password.length < 8) {
      setFormError('La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }

    const payload: UpdateAlumnoPayload = {
      nombres: form.nombres.trim(),
      apellido_paterno: form.apellido_paterno.trim(),
      apellido_materno: form.apellido_materno.trim(),
      dni: form.dni,
      seccion_id: form.seccion_id,
      ...(form.usuario_login.trim() !== editingOriginalLogin
        ? { usuario_login: form.usuario_login.trim() }
        : {}),
      ...(form.grupo_sanguineo ? { grupo_sanguineo: form.grupo_sanguineo } : {}),
      ...(form.codigo_siagie ? { codigo_siagie: form.codigo_siagie } : {}),
      ...(form.direccion ? { direccion: form.direccion } : {}),
      ...(form.distrito ? { distrito: form.distrito } : {}),
      ...(form.telefono_emergencia ? { telefono_emergencia: form.telefono_emergencia } : {}),
      ...(form.condicion_especial ? { condicion_especial: form.condicion_especial } : {}),
    };

    setSaving(true);
    try {
      await alumnosAdminApi.actualizar(editingId, payload);
      if (form.password) {
        await alumnosAdminApi.resetContrasena(editingId, {
          password_nueva: form.password,
          confirmacion: form.password,
        });
      }
      await loadData();
      setModal(false);
      setForm(INIT_FORM);
      setEditingId(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al actualizar');
    } finally {
      setSaving(false);
    }
  }

  async function handleDesactivar(id: string) {
    setActionId(id);
    try {
      await alumnosAdminApi.desactivar(id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al desactivar');
    } finally {
      setActionId(null);
    }
  }

  if (loading) {
    return <div className="p-6 lg:p-8 max-w-6xl mx-auto"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestión de Alumnos</h1>
          <p className="text-sm text-slate-500 mt-0.5">{alumnos.filter(a => a.activo).length} activos · {alumnos.filter(a => !a.activo).length} inactivos</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm self-start sm:self-auto"
        >
          <PlusCircle className="size-4" /> Nuevo alumno
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
          <AlertTriangle className="size-5 text-red-600 shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setNivelTab('')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
            !nivelTab ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          Todos
        </button>
        {(['Primaria', 'Secundaria'] as const).map(n => (
          <button
            key={n}
            onClick={() => setNivelTab(n)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
              nivelTab === n ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {n}
          </button>
        ))}
        <div className="ml-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="search"
            placeholder="Buscar…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Alumno</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">DNI</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Grado / Sección</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Usuario</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map(a => {
              const nombre = `${a.nombres} ${a.apellido_paterno} ${a.apellido_materno}`;
              const nivel = a.seccion?.grado?.nivel?.nombre;
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
                  <td className="px-4 py-3.5 text-slate-600 font-mono text-xs">{a.dni}</td>
                  <td className="px-4 py-3.5 text-slate-600 text-xs">
                    {a.seccion?.grado?.nombre ? (
                      <div className="flex flex-col">
                        <span>{a.seccion.grado.nombre} "{a.seccion.nombre}"</span>
                        {nivel && <span className="text-[10px] text-slate-400">{nivel}</span>}
                      </div>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 text-xs hidden md:table-cell font-mono">{a.usuario_login ?? '—'}</td>
                  <td className="px-4 py-3.5 text-right flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEdit(a)}
                      className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      <Edit2 className="size-4" />
                    </button>
                    <button
                      onClick={() => handleDesactivar(a.id)}
                      disabled={actionId === a.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border bg-red-50 text-red-700 border-red-200 hover:bg-red-100 disabled:opacity-50"
                    >
                      {actionId === a.id ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
                      {actionId === a.id ? 'Eliminando...' : 'Eliminar'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <p className="text-slate-500">No se encontraron alumnos</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-800">
                {modalMode === 'crear' ? 'Nuevo alumno' : 'Editar alumno'}
              </h3>
              <button onClick={() => setModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="size-4 text-slate-500" />
              </button>
            </div>

            <form onSubmit={modalMode === 'crear' ? handleCreate : handleActualizar} className="p-6 space-y-4">
              {/* Datos personales */}
              <div className="grid grid-cols-2 gap-3">
                <input
                  required
                  placeholder="Nombre(s)"
                  value={form.nombres}
                  onChange={e => setForm({ ...form, nombres: e.target.value })}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
                <input
                  required
                  placeholder="Apellido paterno"
                  value={form.apellido_paterno}
                  onChange={e => setForm({ ...form, apellido_paterno: e.target.value })}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>

              <input
                required
                placeholder="Apellido materno"
                value={form.apellido_materno}
                onChange={e => setForm({ ...form, apellido_materno: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />

              <input
                required
                placeholder="DNI (8 dígitos)"
                maxLength={8}
                value={form.dni}
                onChange={e => setForm({ ...form, dni: e.target.value.replace(/\D/g, '').slice(0, 8) })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-400"
              />

              {modalMode === 'crear' && (
                <DatePicker
                  value={form.fecha_nacimiento}
                  onChange={v => setForm({ ...form, fecha_nacimiento: v })}
                  max={new Date().toISOString().split('T')[0]}
                  placeholder="Fecha de nacimiento"
                  color="teal"
                />
              )}

              {modalMode === 'crear' && (
                <div className="flex gap-2">
                  {(['M', 'F'] as const).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm({ ...form, sexo: s })}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                        form.sexo === s
                          ? s === 'M'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-pink-600 text-white border-pink-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {s === 'M' ? 'Masculino' : 'Femenino'}
                    </button>
                  ))}
                </div>
              )}

              <div className="relative">
                <select
                  required
                  value={form.seccion_id}
                  onChange={e => setForm({ ...form, seccion_id: e.target.value })}
                  className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400"
                >
                  <option value="">Selecciona sección</option>
                  {secciones.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.grado?.nivel?.nombre} — {s.grado?.nombre} "{s.nombre}"
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
              </div>

              {/* Credenciales de acceso */}
              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Credenciales de acceso
                </p>

                <div className="flex gap-2 mb-3">
                  <input
                    type="email"
                    required
                    placeholder="correo@calasanz.edu.pe"
                    value={form.usuario_login}
                    onChange={e => setForm({ ...form, usuario_login: e.target.value })}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                  <button
                    type="button"
                    onClick={autoLogin}
                    title="Generar desde nombres"
                    className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors"
                  >
                    <RefreshCw className="size-4" />
                  </button>
                </div>

                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder={modalMode === 'crear' ? 'Contraseña' : 'Nueva contraseña (dejar vacío para no cambiar)'}
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setForm(f => ({ ...f, password: generatePassword() })); setShowPassword(true); }}
                    title="Generar contraseña"
                    className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors"
                  >
                    <RefreshCw className="size-4" />
                  </button>
                </div>
              </div>

              {/* Datos opcionales */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Datos adicionales (opcional)
                </p>

                <input
                  placeholder="Grupo sanguíneo"
                  value={form.grupo_sanguineo}
                  onChange={e => setForm({ ...form, grupo_sanguineo: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />

                <input
                  placeholder="Código SIAGIE"
                  value={form.codigo_siagie}
                  onChange={e => setForm({ ...form, codigo_siagie: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />

                <input
                  placeholder="Dirección"
                  value={form.direccion}
                  onChange={e => setForm({ ...form, direccion: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />

                <input
                  placeholder="Distrito"
                  value={form.distrito}
                  onChange={e => setForm({ ...form, distrito: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />

                <input
                  placeholder="Teléfono emergencia"
                  value={form.telefono_emergencia}
                  onChange={e => setForm({ ...form, telefono_emergencia: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />

                <input
                  placeholder="Condición especial"
                  value={form.condicion_especial}
                  onChange={e => setForm({ ...form, condicion_especial: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>

              {formError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  <AlertTriangle className="size-4 text-red-500 shrink-0" />
                  <p className="text-xs text-red-700">{formError}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
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
                  {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                  {modalMode === 'crear' ? 'Crear alumno' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
