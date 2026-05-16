import { useState } from 'react';
import { CheckCircle2, XCircle, Clock, Save, ChevronDown, Info, AlertCircle, X } from 'lucide-react';
import { STUDENTS_3A } from '../../data/mockData';

type AttendanceStatus = 'present' | 'absent' | 'late' | null;

const GRADES = ['1°', '2°', '3°', '4°', '5°'];
const SECTIONS = ['A', 'B', 'C'];
const SUBJECTS = ['Matemática', 'Comunicación', 'Ciencias Sociales', 'C. y Tecnología', 'Inglés'];

export default function DocenteAsistencia() {
  const [grade, setGrade] = useState('3°');
  const [section, setSection] = useState('A');
  const [subject, setSubject] = useState('Matemática');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>(
    Object.fromEntries(STUDENTS_3A.map(s => [s.id, null]))
  );
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const marked = Object.values(attendance).filter(v => v !== null).length;
  const total = STUDENTS_3A.length;
  const progress = Math.round((marked / total) * 100);

  function mark(id: string, status: AttendanceStatus) {
    setSaved(false);
    setAttendance(prev => ({
      ...prev,
      [id]: prev[id] === status ? null : status,
    }));
  }

  function markAll(status: AttendanceStatus) {
    setSaved(false);
    setAttendance(Object.fromEntries(STUDENTS_3A.map(s => [s.id, status])));
  }

  // ── Corrección 2: handleSave con fetch real (mock descomentable) ──────────
  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setErrorMsg(null);

    const registros = Object.entries(attendance).map(([alumno_id, estado]) => ({
      alumno_id,
      estado, // 'present' | 'absent' | 'late'
    }));

    try {
      // En producción: descommentar la llamada real
      // const res = await fetch('/api/asistencia', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     fecha:      date,          // ISO: '2026-05-05'
      //     seccion_id: `${grade}-${section}`,
      //     registros,
      //   }),
      // });
      // if (!res.ok) throw new Error('Error al guardar');

      // Mock: simular latencia de red
      await new Promise(r => setTimeout(r, 1000));
      void registros; // evitar warning de variable no usada en mock

      setSaved(true);
    } catch {
      setErrorMsg('No se pudo guardar la asistencia. Intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  }

  const presentCount = Object.values(attendance).filter(v => v === 'present').length;
  const absentCount  = Object.values(attendance).filter(v => v === 'absent').length;
  const lateCount    = Object.values(attendance).filter(v => v === 'late').length;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Registro de Asistencia</h1>
          <p className="text-sm text-slate-500 mt-0.5">Marca la asistencia del día para tu sección</p>
        </div>
        <button
          onClick={handleSave}
          disabled={marked < total || saving || saved}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            saved
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-sm'
          }`}
        >
          {saving ? (
            <><svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Guardando…</>
          ) : saved ? (
            <><CheckCircle2 className="size-4" />Asistencia guardada</>
          ) : (
            <><Save className="size-4" />Guardar asistencia</>
          )}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Curso', value: subject, setter: setSubject, options: SUBJECTS },
            { label: 'Grado', value: grade, setter: setGrade, options: GRADES.map(g => g) },
            { label: 'Sección', value: section, setter: setSection, options: SECTIONS },
          ].map(f => (
            <div key={f.label}>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{f.label}</label>
              <div className="relative">
                <select
                  value={f.value}
                  onChange={e => f.setter(e.target.value)}
                  className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {f.options.map(o => <option key={o}>{o}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Fecha</label>
            <input
              type="date"
              value={date}
              onChange={e => { setDate(e.target.value); setSaved(false); }}
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Progress + quick actions */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-slate-700">Progreso del registro</span>
              <span className="text-sm font-bold text-slate-800">{marked}/{total} marcados</span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${marked === total ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-500">Marcar todos:</span>
            <button onClick={() => markAll('present')} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200 hover:bg-emerald-100 transition-colors">
              <CheckCircle2 className="size-3.5" /> Presente
            </button>
            <button onClick={() => markAll('absent')} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-medium border border-red-200 hover:bg-red-100 transition-colors">
              <XCircle className="size-3.5" /> Falta
            </button>
          </div>
        </div>

        {/* Summary chips */}
        <div className="flex gap-3 flex-wrap">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
            <CheckCircle2 className="size-3.5" /> {presentCount} Presentes
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 text-xs font-semibold">
            <XCircle className="size-3.5" /> {absentCount} Faltas
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold">
            <Clock className="size-3.5" /> {lateCount} Tardanzas
          </span>
        </div>
      </div>

      {/* Student list */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">
            {grade}° Secundaria {section} — {total} estudiantes
          </p>
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <Info className="size-3.5" /> Haz clic en P/F/T para marcar
          </span>
        </div>
        <div className="divide-y divide-slate-50">
          {STUDENTS_3A.map((student, idx) => {
            const status = attendance[student.id];
            return (
              <div key={student.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                <span className="text-xs font-medium text-slate-400 w-6 shrink-0">{idx + 1}</span>
                <div className="flex size-9 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-sm font-semibold shrink-0">
                  {student.initials}
                </div>
                <p className="flex-1 text-sm font-medium text-slate-800">{student.name}</p>

                {/* Status indicator */}
                <div className={`hidden sm:flex items-center gap-1.5 text-xs font-medium transition-all ${
                  status === 'present' ? 'text-emerald-600' :
                  status === 'absent'  ? 'text-red-600' :
                  status === 'late'    ? 'text-amber-600' :
                  'text-slate-300'}`
                }>
                  {status === 'present' && <><CheckCircle2 className="size-3.5" />Presente</>}
                  {status === 'absent'  && <><XCircle className="size-3.5" />Falta</>}
                  {status === 'late'    && <><Clock className="size-3.5" />Tardanza</>}
                  {!status && <span className="text-slate-300">Sin marcar</span>}
                </div>

                {/* Buttons */}
                <div className="flex gap-1.5 shrink-0">
                  {(['present', 'absent', 'late'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => mark(student.id, s)}
                      aria-label={`Marcar ${s === 'present' ? 'Presente' : s === 'absent' ? 'Falta' : 'Tardanza'}`}
                      aria-pressed={status === s}
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

      {saved && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">Asistencia registrada exitosamente</p>
            <p className="text-xs text-emerald-600 mt-0.5">El registro del {new Date(date).toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} ha sido guardado.</p>
          </div>
        </div>
      )}

      {/* ── Error banner ── */}
      {errorMsg && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
          <AlertCircle className="size-5 text-red-600 shrink-0" />
          <p className="text-sm font-medium text-red-800 flex-1">{errorMsg}</p>
          <button onClick={() => setErrorMsg(null)} className="p-1 rounded-lg hover:bg-red-100">
            <X className="size-4 text-red-500" />
          </button>
        </div>
      )}
    </div>
  );
}