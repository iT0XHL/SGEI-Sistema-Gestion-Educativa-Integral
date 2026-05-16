import { useState } from 'react';
import { School, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

interface InstitucionEducativa {
  codigo_modular: string;
  codigo_ugel: string;
  nombre_ugel: string;
  nombre: string;
  modalidad: string;
  gestion: string;
  departamento: string;
  provincia: string;
  distrito: string;
  direccion: string;
  activo: boolean;
}

const MOCK_INSTITUCION: InstitucionEducativa = {
  codigo_modular: '0563801',
  codigo_ugel:    '01',
  nombre_ugel:    'UGEL 01 San Juan de Miraflores',
  nombre:         'I.E. San José de Calasanz',
  modalidad:      'EBR',
  gestion:        'Privada',
  departamento:   'Lima',
  provincia:      'Lima',
  distrito:       'San Juan de Miraflores',
  direccion:      'Jr. Las Flores 123, Urb. Los Jardines',
  activo:         true,
};

export default function AdminInstitucion() {
  const [form, setForm] = useState<InstitucionEducativa>(MOCK_INSTITUCION);
  const [error, setError]   = useState('');
  const [saved, setSaved]   = useState(false);
  const [saving, setSaving] = useState(false);

  function setField<K extends keyof InstitucionEducativa>(k: K, v: InstitucionEducativa[K]) {
    setForm(f => ({ ...f, [k]: v }));
    setSaved(false);
    setError('');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!/^\d{7}$/.test(form.codigo_modular)) {
      setError('El código modular debe tener exactamente 7 dígitos numéricos.');
      return;
    }
    if (!form.nombre.trim() || !form.nombre_ugel.trim()) {
      setError('El nombre de la institución y el nombre de la UGEL son obligatorios.');
      return;
    }
    setSaving(true);
    // En producción: await fetch('/api/institucion', { method: 'PUT', body: JSON.stringify(form) });
    await new Promise(r => setTimeout(r, 800));
    setSaving(false);
    setSaved(true);
  }

  const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 transition-all';
  const selectCls = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400';
  const labelCls = 'block text-xs font-medium text-slate-600 mb-1.5';

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-800 shrink-0">
          <School className="size-6 text-white" />
        </div>
        <div>
          <p className="text-sm text-slate-500 mb-0.5">Panel de administración</p>
          <h1 className="text-2xl font-bold text-slate-900">Institución Educativa</h1>
          <p className="text-sm text-slate-500 mt-0.5">Configuración del registro institucional para reportes SIAGIE</p>
        </div>
      </div>

      {/* Feedback */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
          <AlertTriangle className="size-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {saved && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
          <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
          <p className="text-sm font-medium text-emerald-800">Configuración guardada correctamente.</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Sección 1 — Identificación MINEDU */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
            <h2 className="text-sm font-semibold text-slate-700">1. Identificación MINEDU</h2>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className={labelCls}>
                Código Modular <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                maxLength={7}
                value={form.codigo_modular}
                onChange={e => setField('codigo_modular', e.target.value.replace(/\D/g, '').slice(0, 7))}
                placeholder="0000000"
                className={`${inputCls} font-mono`}
              />
              <p className="text-xs text-slate-400 mt-1">Código único de 7 dígitos asignado por el MINEDU</p>
            </div>
            <div>
              <label className={labelCls}>Código UGEL <span className="text-red-500">*</span></label>
              <input
                type="text"
                maxLength={10}
                value={form.codigo_ugel}
                onChange={e => setField('codigo_ugel', e.target.value)}
                placeholder="Ej. 01"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Nombre UGEL <span className="text-red-500">*</span></label>
              <input
                type="text"
                maxLength={200}
                value={form.nombre_ugel}
                onChange={e => setField('nombre_ugel', e.target.value)}
                placeholder="Ej. UGEL 01 San Juan de Miraflores"
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* Sección 2 — Datos del colegio */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
            <h2 className="text-sm font-semibold text-slate-700">2. Datos del colegio</h2>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-3">
              <label className={labelCls}>Nombre de la institución <span className="text-red-500">*</span></label>
              <input
                type="text"
                maxLength={300}
                value={form.nombre}
                onChange={e => setField('nombre', e.target.value)}
                placeholder="Ej. I.E. San José de Calasanz"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Modalidad</label>
              <select value={form.modalidad} onChange={e => setField('modalidad', e.target.value)} className={selectCls}>
                {['EBR', 'EBE', 'EBA', 'ETP'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Gestión</label>
              <select value={form.gestion} onChange={e => setField('gestion', e.target.value)} className={selectCls}>
                {['Pública', 'Privada', 'Concertada'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Sección 3 — Ubicación */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
            <h2 className="text-sm font-semibold text-slate-700">3. Ubicación</h2>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className={labelCls}>Departamento</label>
              <input type="text" maxLength={100} value={form.departamento} onChange={e => setField('departamento', e.target.value)} placeholder="Lima" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Provincia</label>
              <input type="text" maxLength={100} value={form.provincia} onChange={e => setField('provincia', e.target.value)} placeholder="Lima" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Distrito</label>
              <input type="text" maxLength={100} value={form.distrito} onChange={e => setField('distrito', e.target.value)} placeholder="San Juan de Miraflores" className={inputCls} />
            </div>
            <div className="md:col-span-3">
              <label className={labelCls}>Dirección</label>
              <textarea
                maxLength={500}
                rows={3}
                value={form.direccion}
                onChange={e => setField('direccion', e.target.value)}
                placeholder="Jr. Las Flores 123, Urb. Los Jardines"
                className={`${inputCls} resize-none`}
              />
              <p className={`text-xs text-right mt-1 ${form.direccion.length >= 500 ? 'text-red-500' : 'text-slate-400'}`}>{form.direccion.length}/500</p>
            </div>
          </div>
        </div>

        {/* Estado activo */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800">Registro activo</p>
              <p className="text-xs text-slate-500 mt-0.5">Visible para reportes SIAGIE y vistas materializadas del sistema</p>
            </div>
            <button
              type="button"
              onClick={() => setField('activo', !form.activo)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 ${form.activo ? 'bg-slate-800' : 'bg-slate-200'}`}
              role="switch"
              aria-checked={form.activo}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform ${form.activo ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
          {!form.activo && (
            <div className="mt-3 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              <AlertCircle className="size-4 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-700">
                Desactivar este registro hará que el acta SIAGIE no incluya la cabecera del colegio.
              </p>
            </div>
          )}
        </div>

        {/* Guardar */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-60 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
          >
            {saving ? (
              <><svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Guardando…</>
            ) : saved ? (
              <><CheckCircle2 className="size-4" />Configuración guardada</>
            ) : (
              'Guardar configuración'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
