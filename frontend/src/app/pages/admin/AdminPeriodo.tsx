import { useState, useEffect } from 'react';
import { PlusCircle, X, CalendarRange, CheckCircle2, AlertTriangle, ChevronDown, Loader2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '../../components/ui/alert-dialog';
import { DatePicker } from '../../components/DatePicker';
import { periodosApi, type PeriodoRow } from '../../../lib/api/periodos.api';

interface PeriodoAcademico extends PeriodoRow {}

function formatDate(iso: string): string {
  if (!iso) return '—';
  const dateOnly = iso.split('T')[0];
  const [y, m, d] = dateOnly.split('-').map(Number);
  return `${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}`;
}

const EMPTY_FORM = { anio: new Date().getFullYear() + 1, nombre: '', fechaInicio: '', fechaFin: '' };

export default function AdminPeriodo() {
  const [items, setItems]           = useState<PeriodoAcademico[]>([]);
  const [modal, setModal]           = useState(false);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [formError, setFormError]   = useState('');
  const [saved, setSaved]           = useState(false);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [saving, setSaving]         = useState(false);
  const [activating, setActivating] = useState<string | null>(null);

  // Cargar períodos al montar
  useEffect(() => {
    loadPeriodos();
  }, []);

  async function loadPeriodos() {
    try {
      setLoading(true);
      const res = await periodosApi.listar({ limit: 100 });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando períodos');
    } finally {
      setLoading(false);
    }
  }

  async function handleActivar(id: string) {
    try {
      setActivating(id);
      await periodosApi.actualizar(id, { activo: true });
      await loadPeriodos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error activando período');
    } finally {
      setActivating(null);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!form.anio || !form.nombre.trim() || !form.fechaInicio || !form.fechaFin) {
      setFormError('Todos los campos son obligatorios.');
      return;
    }
    if (form.fechaFin <= form.fechaInicio) {
      setFormError('La fecha fin debe ser posterior a la fecha inicio.');
      return;
    }
    try {
      setSaving(true);
      await periodosApi.crear({
        anio: Number(form.anio),
        nombre: form.nombre.trim(),
        fecha_inicio: form.fechaInicio,
        fecha_fin: form.fechaFin,
        activo: false,
      });
      await loadPeriodos();
      setForm(EMPTY_FORM);
      setModal(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error creando período');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500 mb-1">Panel de administración</p>
          <h1 className="text-2xl font-bold text-slate-900">Período Académico</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gestiona los años escolares y activa el período vigente</p>
        </div>
        <button
          onClick={() => { setModal(true); setFormError(''); setSaved(false); }}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm shrink-0"
        >
          <PlusCircle className="size-4" /> Nuevo período
        </button>
      </div>

      {saved && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
          <p className="text-sm font-medium text-emerald-800">Período creado correctamente.</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
          <AlertTriangle className="size-5 text-red-600 shrink-0" />
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="size-8 text-slate-400 animate-spin" />
        </div>
      ) : (
      /* Períodos table */
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
          <CalendarRange className="size-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-700">Períodos registrados</h2>
          <span className="ml-auto text-xs text-slate-400">{items.length} registro{items.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Año</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nombre</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Fecha inicio</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Fecha fin</th>
                <th className="text-center px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="text-right px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.map(p => (
                <tr key={p.id} className={`hover:bg-slate-50 transition-colors ${p.activo ? 'bg-emerald-50/30' : ''}`}>
                  <td className="px-4 py-3.5 font-semibold text-slate-800">{p.anio}</td>
                  <td className="px-4 py-3.5 text-slate-700">{p.nombre}</td>
                  <td className="px-4 py-3.5 text-slate-500 hidden md:table-cell">{formatDate(p.fecha_inicio)}</td>
                  <td className="px-4 py-3.5 text-slate-500 hidden md:table-cell">{formatDate(p.fecha_fin)}</td>
                  <td className="px-4 py-3.5 text-center">
                    {p.activo ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                        <span className="size-1.5 rounded-full bg-emerald-500 inline-block" /> Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                        <span className="size-1.5 rounded-full bg-slate-400 inline-block" /> Inactivo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    {!p.activo && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            disabled={activating === p.id}
                            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-900 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {activating === p.id ? <Loader2 className="size-3 animate-spin" /> : null}
                            Activar período
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Activar este período?</AlertDialogTitle>
                            <AlertDialogDescription>
                              El período <strong>{p.nombre}</strong> pasará a estar activo. El período actualmente activo será desactivado automáticamente por el sistema.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleActivar(p.id)}>
                              Sí, activar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Create modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <h3 className="text-base font-semibold text-slate-800">Crear nuevo período académico</h3>
              <button onClick={() => setModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="size-4 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4 overflow-y-auto">
              {formError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                  <AlertTriangle className="size-4 text-red-500 shrink-0" />
                  <p className="text-xs text-red-700">{formError}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Año <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min={2020}
                    max={2099}
                    value={form.anio}
                    onChange={e => setForm(f => ({ ...f, anio: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Nombre <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    maxLength={100}
                    value={form.nombre}
                    onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                    placeholder="Ej. Año Escolar 2026"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Fecha inicio <span className="text-red-500">*</span></label>
                  <DatePicker value={form.fechaInicio} onChange={v => setForm(f => ({ ...f, fechaInicio: v })) } />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Fecha fin <span className="text-red-500">*</span></label>
                  <DatePicker value={form.fechaFin} onChange={v => setForm(f => ({ ...f, fechaFin: v }))} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="flex-1 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                  {saving ? 'Creando...' : 'Crear período'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}