import { useState } from 'react';
import { CheckCircle2, XCircle, Clock, Save, ChevronDown } from 'lucide-react';
import { TEACHER_ATTENDANCE } from '../../data/mockData';

type Status = 'present' | 'absent' | 'late' | null;

export default function AdminAsistenciaDocente() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState<Record<string, Status>>(
    Object.fromEntries(TEACHER_ATTENDANCE.map(t => [t.id, t.status]))
  );
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const present = Object.values(attendance).filter(v => v === 'present').length;
  const absent  = Object.values(attendance).filter(v => v === 'absent').length;
  const late    = Object.values(attendance).filter(v => v === 'late').length;
  const total   = TEACHER_ATTENDANCE.length;

  function mark(id: string, s: Status) {
    setSaved(false);
    setAttendance(prev => ({ ...prev, [id]: prev[id] === s ? null : s }));
  }

  function handleSave() {
    setSaving(true);
    setTimeout(() => { setSaving(false); setSaved(true); }, 900);
  }

  const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Setiembre','Octubre','Noviembre','Diciembre'];
  const historyData = MONTHS.slice(0, 5).map(m => ({
    month: m,
    present: Math.floor(Math.random() * 3 + 5),
    absent: Math.floor(Math.random() * 2),
    late: Math.floor(Math.random() * 2),
  }));

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Asistencia Docente</h1>
          <p className="text-sm text-slate-500 mt-0.5">Control de puntualidad del personal docente</p>
        </div>
        <div className="flex gap-3 items-center">
          <input
            type="date"
            value={date}
            onChange={e => { setDate(e.target.value); setSaved(false); }}
            className="bg-white border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              saved ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-800 hover:bg-slate-900 text-white shadow-sm'
            }`}
          >
            {saving ? (
              <svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            ) : saved ? <CheckCircle2 className="size-4" /> : <Save className="size-4" />}
            {saving ? 'Guardando…' : saved ? 'Registrado' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-700">{present}</p>
          <p className="text-sm font-medium text-emerald-600">Presentes</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-700">{late}</p>
          <p className="text-sm font-medium text-amber-600">Tardanzas</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-red-700">{absent}</p>
          <p className="text-sm font-medium text-red-600">Inasistencias</p>
        </div>
      </div>

      {/* Teacher list */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">{total} docentes · {new Date(date).toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="divide-y divide-slate-50">
          {TEACHER_ATTENDANCE.map(teacher => {
            const status = attendance[teacher.id];
            return (
              <div key={teacher.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex size-10 items-center justify-center rounded-full bg-slate-200 text-slate-700 text-sm font-semibold shrink-0">
                  {teacher.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{teacher.name}</p>
                  <p className="text-xs text-slate-400">{teacher.subject}</p>
                </div>
                <div className={`hidden sm:block text-xs font-medium ${
                  status === 'present' ? 'text-emerald-600' :
                  status === 'absent'  ? 'text-red-600' :
                  status === 'late'    ? 'text-amber-600' : 'text-slate-300'
                }`}>
                  {status === 'present' ? 'Presente' : status === 'absent' ? 'Falta' : status === 'late' ? 'Tardanza' : 'Sin marcar'}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {(['present', 'absent', 'late'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => mark(teacher.id, s)}
                      className={`flex size-9 items-center justify-center rounded-xl text-sm font-bold transition-all focus:outline-none focus:ring-2 focus:ring-offset-1
                        ${s === 'present' ?
                          (status === 'present' ? 'bg-emerald-500 text-white ring-emerald-200' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100') :
                        s === 'absent' ?
                          (status === 'absent'  ? 'bg-red-500 text-white ring-red-200'          : 'bg-red-50 text-red-600 hover:bg-red-100') :
                          (status === 'late'    ? 'bg-amber-400 text-white ring-amber-200'       : 'bg-amber-50 text-amber-600 hover:bg-amber-100')
                        }`}
                    >
                      {s === 'present' ? 'P' : s === 'absent' ? 'F' : 'T'}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Monthly history table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="text-sm font-semibold text-slate-700">Resumen mensual de asistencia docente — 2025</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">Mes</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-emerald-600">Presentes (prom.)</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-amber-600">Tardanzas</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-red-600">Inasistencias</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500">% Asistencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {historyData.map(row => (
                <tr key={row.month} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-slate-700">{row.month}</td>
                  <td className="text-center px-4 py-3 text-emerald-700 font-semibold">{row.present}/{total}</td>
                  <td className="text-center px-4 py-3 text-amber-700 font-semibold">{row.late}</td>
                  <td className="text-center px-4 py-3 text-red-700 font-semibold">{row.absent}</td>
                  <td className="text-center px-4 py-3">
                    <span className={`font-semibold ${row.absent === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {Math.round(row.present/total*100)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
