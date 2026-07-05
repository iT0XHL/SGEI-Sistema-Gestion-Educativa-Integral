import { useState, useEffect, useMemo } from 'react';
import {
  PlusCircle, Search, Loader2, AlertTriangle, Edit2, Trash2,
} from 'lucide-react';
import {
  alumnosAdminApi,
} from '../../../lib/api/admin.api';
import type {
  AlumnoResumenDTO,
} from '../../../lib/api/admin.api';
import UserFormModal from '../../components/UserFormModal';

function initials(name: string) {
  return name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

export default function SecretariaAlumnos() {
  const [alumnos, setAlumnos] = useState<AlumnoResumenDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [nivelTab, setNivelTab] = useState<'Primaria' | 'Secundaria' | ''>('');

  const [modal, setModal] = useState(false);
  const [modalMode, setModalMode] = useState<'crear' | 'editar'>('crear');
  const [editingAlumno, setEditingAlumno] = useState<AlumnoResumenDTO | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const aluRes = await alumnosAdminApi.listar({ limit: 200 });
      setAlumnos(aluRes.items);
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
    setEditingAlumno(null);
    setModal(true);
  }

  function openEdit(alumno: AlumnoResumenDTO) {
    setModalMode('editar');
    setEditingAlumno(alumno);
    setModal(true);
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
              const nombre = `${a.nombres} ${a.apellido_paterno} ${a.apellido_materno}${a.sufijo_homonimo ?? ''}`;
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

      {modal && modalMode === 'crear' && (
        <UserFormModal
          mode="create"
          rol="Alumno"
          lockRol={true}
          onClose={() => setModal(false)}
          onSuccess={() => { setModal(false); loadData(); }}
        />
      )}

      {modal && modalMode === 'editar' && editingAlumno && (
        <UserFormModal
          mode="edit"
          rol="Alumno"
          lockRol={true}
          initialData={{
            id: editingAlumno.id,
            usuario_login: editingAlumno.usuario_login ?? '',
            nombres: editingAlumno.nombres,
            apellido_paterno: editingAlumno.apellido_paterno,
            apellido_materno: editingAlumno.apellido_materno,
            dni: editingAlumno.dni,
            seccion_id: editingAlumno.seccion?.id ?? '',
          }}
          onClose={() => setModal(false)}
          onSuccess={() => { setModal(false); loadData(); }}
        />
      )}
    </div>
  );
}
