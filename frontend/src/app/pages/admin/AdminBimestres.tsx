import { useState, useEffect } from 'react';
import { BookMarked, CheckCircle2, AlertTriangle, Lock, Loader2, PlusCircle, X, Trash2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '../../components/ui/alert-dialog';
import { periodosApi, bimestresApi, type BimestreRow, type PeriodoRow } from '../../../lib/api/periodos.api';
import { DatePicker } from '../../components/DatePicker';

function formatDate(iso: string): string {
  if (!iso) return '—';
  const dateOnly = iso.split('T')[0];
  const [y, m, d] = dateOnly.split('-').map(Number);
  return `${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}`;
}

const EMPTY_FORM = {
  numero: '',
  nombre: '',
  fechaInicio: '',
  fechaFin: '',
};

export default function AdminBimestres() {
  const [periodoActivo, setPeriodoActivo] = useState<PeriodoRow | null>(null);
  const [items, setItems] = useState<BimestreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [closing, setClosing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Cargar período activo y bimestres
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      // Buscar período activo
      const periodosRes = await periodosApi.listar({ activo: true, limit: 1 });
      const activoPeriodo = periodosRes.items[0];
      setPeriodoActivo(activoPeriodo || null);

      // Cargar bimestres del período activo (si existe)
      if (activoPeriodo) {
        const bimestresRes = await bimestresApi.listar({ periodoId: activoPeriodo.id, limit: 100 });
        setItems(bimestresRes.items);
      } else {
        setItems([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  }

  async function handleCerrar(id: string) {
    try {
      setClosing(id);
      await bimestresApi.actualizar(id, { cerrado: true });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cerrando bimestre');
    } finally {
      setClosing(null);
    }
  }

  async function handleEliminar(id: string) {
    try {
      setDeleting(id);
      await bimestresApi.eliminar(id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error eliminando bimestre');
    } finally {
      setDeleting(null);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!form.numero.trim()) { setFormError('El número es obligatorio.'); return; }
    if (!form.nombre.trim()) { setFormError('El nombre es obligatorio.'); return; }
    if (!form.fechaInicio) { setFormError('La fecha de inicio es obligatoria.'); return; }
    if (!form.fechaFin) { setFormError('La fecha de fin es obligatoria.'); return; }
    if (!periodoActivo) { setFormError('No hay período activo.'); return; }
    if (form.fechaFin <= form.fechaInicio) {
      setFormError('La fecha de fin debe ser posterior a la fecha de inicio.');
      return;
    }

    try {
      setSaving(true);
      await bimestresApi.crear({
        periodo_id: periodoActivo.id,
        numero: parseInt(form.numero),
        nombre: form.nombre.trim(),
        fecha_inicio: form.fechaInicio,
        fecha_fin: form.fechaFin,
      });
      await loadData();
      setForm(EMPTY_FORM);
      setModal(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error creando bimestre');
    } finally {
      setSaving(false);
    }
  }

  const cerradosCount = items.filter(b => b.cerrado).length;

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500 mb-1">Panel de administración</p>
          <h1 className="text-2xl font-bold text-slate-900">Bimestres</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gestiona los bimestres del período académico activo</p>
        </div>
        {periodoActivo && (
          <button
            onClick={() => { setModal(true); setFormError(''); }}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm shrink-0"
          >
            <PlusCircle className="size-4" /> Nuevo bimestre
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
          <AlertTriangle className="size-5 text-red-600 shrink-0" />
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {/* Banner período activo */}
      {periodoActivo ? (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
          <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">Período activo: {periodoActivo.nombre}</p>
            <p className="text-xs text-emerald-600 mt-0.5">{cerradosCount} de {items.length} bimestres cerrados</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          <AlertTriangle className="size-5 text-amber-600 shrink-0" />
          <p className="text-sm font-medium text-amber-800">
            No hay período académico activo. Crea y activa un período primero en <strong>Período Académico</strong>.
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="size-8 text-slate-400 animate-spin" />
        </div>
      ) : (
      <>
      {/* Resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {items.map(b => (
          <div key={b.id} className={`rounded-2xl border p-4 text-center ${b.cerrado ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
            <p className={`text-lg font-bold ${b.cerrado ? 'text-red-700' : 'text-emerald-700'}`}>{b.nombre}</p>
            <p className={`text-xs font-medium mt-0.5 ${b.cerrado ? 'text-red-600' : 'text-emerald-600'}`}>
              {b.cerrado ? '🔒 Cerrado' : '✓ Abierto'}
            </p>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
          <BookMarked className="size-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-700">Bimestres del período activo</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">N°</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nombre</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Fecha inicio</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Fecha fin</th>
                <th className="text-center px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="text-right px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.map(b => (
                <tr key={b.id} className={`hover:bg-slate-50 transition-colors ${b.cerrado ? 'opacity-70' : ''}`}>
                  <td className="px-4 py-3.5 font-semibold text-slate-700">{b.numero}</td>
                  <td className="px-4 py-3.5 text-slate-800">
                    <div className="flex items-center gap-2">
                      {b.cerrado && <Lock className="size-3.5 text-red-500 shrink-0" />}
                      {b.nombre}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 hidden md:table-cell">{formatDate(b.fecha_inicio)}</td>
                  <td className="px-4 py-3.5 text-slate-500 hidden md:table-cell">{formatDate(b.fecha_fin)}</td>
                  <td className="px-4 py-3.5 text-center">
                    {b.cerrado ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        <Lock className="size-3" /> Cerrado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                        <CheckCircle2 className="size-3" /> Abierto
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!b.cerrado && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              disabled={closing === b.id}
                              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                            >
                              {closing === b.id ? <Loader2 className="size-3 animate-spin" /> : null}
                              Cerrar
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Cerrar {b.nombre}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción es <strong>irreversible</strong>. Al cerrar el bimestre, todas las notas registradas quedarán bloqueadas automáticamente por el sistema y <strong>no podrán modificarse</strong>.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-amber-600 hover:bg-amber-700 text-white"
                                onClick={() => handleCerrar(b.id)}
                              >
                                Sí, cerrar bimestre
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            disabled={deleting === b.id}
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deleting === b.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar {b.nombre}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Se eliminará permanentemente <strong>«{b.nombre}»</strong>. Esta acción no se puede deshacer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-600 hover:bg-red-700 text-white"
                              onClick={() => handleEliminar(b.id)}
                            >
                              Sí, eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* Modal crear bimestre */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-800">Nuevo bimestre</h3>
              <button onClick={() => setModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="size-4 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {formError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                  <AlertTriangle className="size-4 text-red-500 shrink-0" />
                  <p className="text-xs text-red-700">{formError}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Número <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min="1"
                    max="4"
                    value={form.numero}
                    onChange={e => setForm(f => ({ ...f, numero: e.target.value }))}
                    placeholder="1-4"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Nombre <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    maxLength={40}
                    value={form.nombre}
                    onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                    placeholder="Ej. Primer Bimestre"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Fecha inicio <span className="text-red-500">*</span></label>
                  <DatePicker value={form.fechaInicio} onChange={v => setForm(f => ({ ...f, fechaInicio: v }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Fecha fin <span className="text-red-500">*</span></label>
                  <DatePicker value={form.fechaFin} onChange={v => setForm(f => ({ ...f, fechaFin: v }))} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)} disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="flex-1 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                  {saving ? 'Creando...' : 'Crear bimestre'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
