import { useState, useEffect, useCallback } from 'react';
import { PlusCircle, X, Trash2, Search, ChevronDown } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '../../components/ui/alert-dialog';
import { periodosApi, asignacionesApi, docentesAdminApi, estructuraApi } from '../../../lib/api/admin.api';
import type { PeriodoDTO, AsignacionDTO, DocenteDTO, NivelDTO, CursoDTO, SeccionDTO } from '../../../lib/api/admin.api';

export default function AdminAsignaciones() {
  const [items, setItems]           = useState<AsignacionDTO[]>([]);
  const [periodo, setPeriodo]       = useState<PeriodoDTO | null>(null);
  const [docentes, setDocentes]     = useState<DocenteDTO[]>([]);
  const [niveles, setNiveles]       = useState<NivelDTO[]>([]);
  const [cursos, setCursos]         = useState<CursoDTO[]>([]);
  const [secciones, setSecciones]   = useState<SeccionDTO[]>([]);
  const [loading, setLoading]       = useState(true);
  const [modal, setModal]           = useState(false);
  const [form, setForm]             = useState({ docente_id: '', curso_id: '', seccion_id: '', nivel_id: '' });
  const [formError, setFormError]   = useState('');

  const load = useCallback(async () => {
    try {
      const p = await periodosApi.listar({ activo: true, limit: 1 });
      const activo = p.items[0] ?? null;
      setPeriodo(activo);

      const [d, n] = await Promise.all([
        docentesAdminApi.listar({ activo: 'true', limit: 500 }),
        estructuraApi.niveles(),
      ]);
      setDocentes(d.items);
      setNiveles(n);

      if (activo) {
        const a = await asignacionesApi.listar({ periodoId: activo.id });
        setItems(a);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!form.nivel_id || !periodo) {
      setCursos([]);
      setSecciones([]);
      return;
    }
    Promise.all([
      estructuraApi.cursos(form.nivel_id),
      estructuraApi.secciones({ periodoId: periodo.id }),
    ]).then(([c, s]) => {
      setCursos(c);
      setSecciones(s);
    });
  }, [form.nivel_id, periodo]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!form.docente_id || !form.curso_id || !form.seccion_id || !periodo) {
      setFormError('Todos los campos son obligatorios.');
      return;
    }
    try {
      const nueva = await asignacionesApi.crear({
        docente_id: form.docente_id,
        curso_id: form.curso_id,
        seccion_id: form.seccion_id,
        periodo_id: periodo.id,
      });
      setItems(prev => [nueva, ...prev]);
      setModal(false);
      setForm({ docente_id: '', curso_id: '', seccion_id: '', nivel_id: '' });
    } catch {
      setFormError('Error al crear la asignación');
    }
  }

  async function handleDelete(id: string) {
    try {
      await asignacionesApi.eliminar(id);
      setItems(prev => prev.filter(a => a.id !== id));
    } catch {
      // silent
    }
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl mx-auto flex items-center justify-center min-h-[40vh]">
        <div className="flex items-center gap-3 text-slate-400">
          <svg className="animate-spin size-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          <span className="text-sm">Cargando asignaciones…</span>
        </div>
      </div>
    );
  }

  const inputCls = 'w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400';

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500 mb-1">Panel de administración</p>
          <h1 className="text-2xl font-bold text-slate-900">Asignaciones</h1>
          <p className="text-sm text-slate-500 mt-0.5">Asigna docentes a cursos y secciones</p>
        </div>
        <button
          onClick={() => { setModal(true); setFormError(''); }}
          disabled={!periodo}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm shrink-0"
        >
          <PlusCircle className="size-4" /> Nueva asignación
        </button>
      </div>

      {/* Period info */}
      {periodo ? (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 text-sm text-blue-800">
          Período activo: <strong>{periodo.nombre}</strong> · {items.length} asignación{items.length !== 1 ? 'es' : ''}
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-sm text-amber-800">
          No hay período activo. Crea y activa un período primero.
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Docente</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Curso</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Sección</th>
                <th className="text-center px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="text-right px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                    No hay asignaciones para este período
                  </td>
                </tr>
              ) : (
                items.map(a => (
                  <tr key={a.id} className={`hover:bg-slate-50 transition-colors ${!a.activo ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-slate-800">{a.docente.nombres} {a.docente.apellido_paterno}</p>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 hidden md:table-cell">{a.curso.nombre}</td>
                    <td className="px-4 py-3.5 text-slate-600 hidden md:table-cell">{a.seccion.nombre}</td>
                    <td className="px-4 py-3.5 text-center">
                      {a.activo ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {a.activo && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors">
                              <Trash2 className="size-3.5" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Dar de baja esta asignación?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Se desactivará la asignación de <strong>{a.docente.nombres} {a.docente.apellido_paterno}</strong> al curso <strong>{a.curso.nombre}</strong> en la sección <strong>{a.seccion.nombre}</strong>.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={() => handleDelete(a.id)}>
                                Sí, dar de baja
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-800">Nueva asignación</h3>
              <button onClick={() => setModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="size-4 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {formError && <p className="text-xs text-red-500">{formError}</p>}

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Docente <span className="text-red-500">*</span></label>
                <div className="relative">
                  <select value={form.docente_id} onChange={e => setForm(f => ({ ...f, docente_id: e.target.value }))} className={`${inputCls} appearance-none pr-8`}>
                    <option value="">Seleccionar docente</option>
                    {docentes.map(d => (
                      <option key={d.id} value={d.id}>{d.nombres} {d.apellido_paterno} {d.apellido_materno}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Nivel <span className="text-red-500">*</span></label>
                <div className="relative">
                  <select value={form.nivel_id} onChange={e => setForm(f => ({ ...f, nivel_id: e.target.value, curso_id: '', seccion_id: '' }))} className={`${inputCls} appearance-none pr-8`}>
                    <option value="">Seleccionar nivel</option>
                    {niveles.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Curso <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select value={form.curso_id} onChange={e => setForm(f => ({ ...f, curso_id: e.target.value }))} className={`${inputCls} appearance-none pr-8`} disabled={!form.nivel_id}>
                      <option value="">Seleccionar</option>
                      {cursos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Sección <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select value={form.seccion_id} onChange={e => setForm(f => ({ ...f, seccion_id: e.target.value }))} className={`${inputCls} appearance-none pr-8`} disabled={!form.nivel_id}>
                      <option value="">Seleccionar</option>
                      {secciones.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
                  Crear asignación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
