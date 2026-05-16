import { useState, useMemo } from 'react';
import { PlusCircle, X, Trash2, PenLine, Save, ChevronDown, ArrowUp, ArrowDown, ListChecks } from 'lucide-react';
import { COURSES, COMPETENCIES } from '../../data/mockData';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '../../components/ui/alert-dialog';

type TipoCompetencia = 'regular' | 'transversal';

interface Competencia {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: TipoCompetencia;
  orden: number;
  cursoId: string;
}

// Construir estado inicial a partir de COMPETENCIES del mockData
function buildInitial(): Competencia[] {
  return Object.entries(COMPETENCIES).flatMap(([cursoId, names]) =>
    names.map((nombre, i) => ({
      id: `comp-${cursoId}-${i}`,
      nombre,
      descripcion: '',
      tipo: 'regular' as TipoCompetencia,
      orden: i + 1,
      cursoId,
    }))
  );
}

const TIPO_COLORS: Record<TipoCompetencia, string> = {
  regular:      'bg-blue-100 text-blue-700',
  transversal:  'bg-purple-100 text-purple-700',
};

const EMPTY_FORM = { nombre: '', descripcion: '', tipo: 'regular' as TipoCompetencia };

export default function AdminCompetencias() {
  const [competencias, setCompetencias] = useState<Competencia[]>(buildInitial());
  const [filterNivel,  setFilterNivel]  = useState('Secundaria');
  const [filterCurso,  setFilterCurso]  = useState('c1');
  const [modal, setModal]     = useState(false);
  const [form, setForm]       = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  // Edición inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm]   = useState(EMPTY_FORM);

  const cursosNivel = useMemo(() =>
    COURSES.filter(c => c.level === filterNivel),
  [filterNivel]);

  const filtered = useMemo(() =>
    competencias
      .filter(c => c.cursoId === filterCurso)
      .sort((a, b) => a.orden - b.orden),
  [competencias, filterCurso]);

  // Mover competencia
  function moveUp(id: string) {
    const arr = [...filtered];
    const idx = arr.findIndex(c => c.id === id);
    if (idx <= 0) return;
    const newOrden = arr[idx].orden;
    const prevOrden = arr[idx - 1].orden;
    setCompetencias(prev => prev.map(c => {
      if (c.id === arr[idx].id)     return { ...c, orden: prevOrden };
      if (c.id === arr[idx - 1].id) return { ...c, orden: newOrden };
      return c;
    }));
  }

  function moveDown(id: string) {
    const arr = [...filtered];
    const idx = arr.findIndex(c => c.id === id);
    if (idx >= arr.length - 1) return;
    const newOrden = arr[idx].orden;
    const nextOrden = arr[idx + 1].orden;
    setCompetencias(prev => prev.map(c => {
      if (c.id === arr[idx].id)     return { ...c, orden: nextOrden };
      if (c.id === arr[idx + 1].id) return { ...c, orden: newOrden };
      return c;
    }));
  }

  function handleDelete(id: string) {
    // En producción: await fetch(`/api/competencias/${id}`, { method: 'DELETE' });
    setCompetencias(prev => prev.filter(c => c.id !== id));
  }

  function startEdit(comp: Competencia) {
    setEditingId(comp.id);
    setEditForm({ nombre: comp.nombre, descripcion: comp.descripcion, tipo: comp.tipo });
  }

  function saveEdit(id: string) {
    if (!editForm.nombre.trim()) return;
    // En producción: await fetch(`/api/competencias/${id}`, { method: 'PUT', body: JSON.stringify(editForm) });
    setCompetencias(prev => prev.map(c => c.id === id ? { ...c, ...editForm } : c));
    setEditingId(null);
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!form.nombre.trim()) { setFormError('El nombre es obligatorio.'); return; }
    const maxOrden = filtered.length > 0 ? Math.max(...filtered.map(c => c.orden)) + 1 : 1;
    const nueva: Competencia = {
      id: `comp-${filterCurso}-${Date.now()}`,
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim(),
      tipo: form.tipo,
      orden: maxOrden,
      cursoId: filterCurso,
    };
    // En producción: await fetch('/api/competencias', { method: 'POST', body: JSON.stringify(nueva) });
    setCompetencias(prev => [...prev, nueva]);
    setForm(EMPTY_FORM);
    setModal(false);
  }

  const inputCls = 'w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400';

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500 mb-1">Panel de administración</p>
          <h1 className="text-2xl font-bold text-slate-900">Competencias</h1>
          <p className="text-sm text-slate-500 mt-0.5">Administra las competencias curriculares por curso</p>
        </div>
        <button
          onClick={() => { setModal(true); setFormError(''); }}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm shrink-0"
        >
          <PlusCircle className="size-4" /> Nueva competencia
        </button>
      </div>

      {/* Filtros de curso */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nivel</label>
          <div className="relative">
            <select value={filterNivel} onChange={e => { setFilterNivel(e.target.value); setFilterCurso(COURSES.find(c => c.level === e.target.value)?.id ?? 'c1'); }}
              className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-slate-400">
              {['Primaria', 'Secundaria'].map(n => <option key={n}>{n}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Curso</label>
          <div className="relative">
            <select value={filterCurso} onChange={e => setFilterCurso(e.target.value)}
              className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-slate-400">
              {cursosNivel.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
        <p className="text-xs text-slate-400 self-end pb-2.5">{filtered.length} competencia{filtered.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
          <ListChecks className="size-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-700">
            {COURSES.find(c => c.id === filterCurso)?.name ?? 'Curso'}
          </h2>
        </div>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <ListChecks className="size-10 text-slate-200 mb-3" />
            <p className="text-slate-500">No hay competencias para este curso</p>
            <p className="text-xs text-slate-400 mt-1">Haz clic en «Nueva competencia» para agregar una</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-center px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider w-16">Orden</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nombre</th>
                  <th className="text-center px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo</th>
                  <th className="text-right px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((comp, idx) => {
                  const isEditing = editingId === comp.id;
                  return (
                    <tr key={comp.id} className="hover:bg-slate-50 transition-colors">
                      {/* Orden + reorder buttons */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => moveUp(comp.id)} disabled={idx === 0}
                            className="p-1 rounded-md hover:bg-slate-200 disabled:opacity-30 text-slate-500 transition-colors">
                            <ArrowUp className="size-3.5" />
                          </button>
                          <span className="text-xs font-semibold text-slate-600 w-5 text-center">{idx + 1}</span>
                          <button onClick={() => moveDown(comp.id)} disabled={idx === filtered.length - 1}
                            className="p-1 rounded-md hover:bg-slate-200 disabled:opacity-30 text-slate-500 transition-colors">
                            <ArrowDown className="size-3.5" />
                          </button>
                        </div>
                      </td>
                      {/* Nombre */}
                      <td className="px-4 py-3.5">
                        {isEditing ? (
                          <div className="space-y-2">
                            <input value={editForm.nombre} onChange={e => setEditForm(f => ({ ...f, nombre: e.target.value }))}
                              maxLength={300}
                              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400" />
                            <textarea value={editForm.descripcion} onChange={e => setEditForm(f => ({ ...f, descripcion: e.target.value }))}
                              maxLength={1000} rows={2} placeholder="Descripción (opcional)"
                              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none" />
                          </div>
                        ) : (
                          <div>
                            <p className="font-medium text-slate-800">{comp.nombre}</p>
                            {comp.descripcion && <p className="text-xs text-slate-400 mt-0.5">{comp.descripcion}</p>}
                          </div>
                        )}
                      </td>
                      {/* Tipo */}
                      <td className="px-4 py-3.5 text-center">
                        {isEditing ? (
                          <select value={editForm.tipo} onChange={e => setEditForm(f => ({ ...f, tipo: e.target.value as TipoCompetencia }))}
                            className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400">
                            <option value="regular">regular</option>
                            <option value="transversal">transversal</option>
                          </select>
                        ) : (
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${TIPO_COLORS[comp.tipo]}`}>
                            {comp.tipo}
                          </span>
                        )}
                      </td>
                      {/* Acciones */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isEditing ? (
                            <>
                              <button onClick={() => saveEdit(comp.id)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium">
                                <Save className="size-3" /> Guardar
                              </button>
                              <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
                                <X className="size-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => startEdit(comp)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium">
                                <PenLine className="size-3" /> Editar
                              </button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <button className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors">
                                    <Trash2 className="size-3.5" />
                                  </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Eliminar competencia?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Se eliminará permanentemente <strong>«{comp.nombre}»</strong>. Esta acción no se puede deshacer.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={() => handleDelete(comp.id)}>
                                      Sí, eliminar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal nueva competencia */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-800">Nueva competencia</h3>
              <button onClick={() => setModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="size-4 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {formError && <p className="text-xs text-red-500">{formError}</p>}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Nombre <span className="text-red-500">*</span></label>
                <input type="text" maxLength={300} value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej. Resuelve problemas de cantidad"
                  className={inputCls} />
                <p className={`text-xs text-right mt-1 ${form.nombre.length >= 300 ? 'text-red-500' : 'text-slate-400'}`}>{form.nombre.length}/300</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Descripción <span className="text-slate-400">(opcional)</span></label>
                <textarea maxLength={1000} rows={3} value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Describe brevemente la competencia…"
                  className={`${inputCls} resize-none`} />
                <p className={`text-xs text-right mt-1 ${form.descripcion.length >= 1000 ? 'text-red-500' : 'text-slate-400'}`}>{form.descripcion.length}/1000</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Tipo</label>
                <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as TipoCompetencia }))} className={inputCls}>
                  <option value="regular">regular</option>
                  <option value="transversal">transversal</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
                  Agregar competencia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
