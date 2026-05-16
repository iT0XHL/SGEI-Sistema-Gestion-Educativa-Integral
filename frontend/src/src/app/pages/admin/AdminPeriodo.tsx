import { useState } from 'react';
import { PlusCircle, X, CalendarRange, CheckCircle2, AlertTriangle, ChevronDown } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '../../components/ui/alert-dialog';
import { DatePicker } from '../../components/DatePicker';

interface PeriodoAcademico {
  id: string;
  anio: number;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
}

const MOCK_PERIODOS: PeriodoAcademico[] = [
  { id: 'p1', anio: 2025, nombre: 'Año Escolar 2025', fecha_inicio: '2025-03-10', fecha_fin: '2025-12-19', activo: true },
  { id: 'p2', anio: 2024, nombre: 'Año Escolar 2024', fecha_inicio: '2024-03-11', fecha_fin: '2024-12-20', activo: false },
];

function formatDate(iso: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  return `${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}`;
}

const EMPTY_FORM = { anio: new Date().getFullYear() + 1, nombre: '', fechaInicio: '', fechaFin: '' };

export default function AdminPeriodo() {
  const [items, setItems]       = useState<PeriodoAcademico[]>(MOCK_PERIODOS);
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saved, setSaved]       = useState(false);

  function handleActivar(id: string) {
    setItems(prev => prev.map(p => ({ ...p, activo: p.id === id })));
    // En producción: await fetch(`/api/periodos/${id}/activar`, { method: 'PATCH' });
  }

  function handleCreate(e: React.FormEvent) {
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
    const nuevo: PeriodoAcademico = {
      id: `p${Date.now()}`,
      anio: Number(form.anio),
      nombre: form.nombre.trim(),
      fecha_inicio: form.fechaInicio,
      fecha_fin: form.fechaFin,
      activo: false,
    };
    // En producción: await fetch('/api/periodos', { method: 'POST', body: JSON.stringify(nuevo) });
    setItems(prev => [nuevo, ...prev]);
    setForm(EMPTY_FORM);
    setModal(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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

      {/* Períodos table */}
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
                          <button className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-900 text-white transition-colors">
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
                <button type="submit" className="flex-1 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
                  Crear período
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}