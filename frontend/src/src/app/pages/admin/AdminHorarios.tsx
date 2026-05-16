import { useState } from 'react';
import { PlusCircle, X, AlertTriangle, ChevronDown, Loader2 } from 'lucide-react';
import { SCHEDULE, COLOR_MAP } from '../../data/mockData';

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const HOURS = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];
const COURSES_LIST = ['Matemática', 'Comunicación', 'Ciencias Sociales', 'C. y Tecnología', 'Inglés', 'Ed. Física', 'Arte y Cultura', 'Ed. para el Trabajo'];
const TEACHERS_LIST = ['Prof. Ana García', 'Prof. José Ramos', 'Prof. María Lupaca', 'Prof. Luis Quispe', 'Prof. Sandra Flores', 'Prof. Marco Benítez'];
const GRADE_NUMS = ['1°', '2°', '3°', '4°', '5°'];
const SECTION_LIST = ['A', 'B', 'C'];
const COLOR_LIST = ['blue', 'emerald', 'amber', 'purple', 'indigo', 'red', 'pink', 'teal'] as const;

type ScheduleItem = typeof SCHEDULE[number];

export default function AdminHorarios() {
  const [schedule, setSchedule] = useState(SCHEDULE);
  const [modal, setModal] = useState(false);
  const [conflictWarn, setConflictWarn] = useState('');

  // 🔑 Estado para la cadena de resolución de UUIDs (Corrección #5)
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState('');

  // Filter state: two-level
  const [filterGradeNum, setFilterGradeNum] = useState<string>('Todos');
  const [filterSection, setFilterSection] = useState<string>('Todos');

  // Form state: grade and section separate
  const [form, setForm] = useState({
    day: 'Lunes', start: '08:00', end: '09:00',
    course: 'Matemática',
    formGradeNum: '1°', formSection: 'A',
    teacher: 'Prof. Ana García', room: 'Aula 301', color: 'blue' as const
  });

  // Compute the combined grade string for form
  const formGrade = `${form.formGradeNum} ${form.formSection}`;

  // Available sections for the selected grade filter
  const sectionsForFilterGrade = filterGradeNum === 'Todos'
    ? []
    : Array.from(new Set(
        schedule
          .filter(s => s.grade.startsWith(filterGradeNum))
          .map(s => s.grade.split(' ')[1])
      )).sort();

  const filtered = schedule.filter(s => {
    const gradeMatch = filterGradeNum === 'Todos' || s.grade.startsWith(filterGradeNum);
    const secMatch   = filterSection === 'Todos'   || s.grade.endsWith(filterSection);
    return gradeMatch && secMatch;
  });

  function checkConflict(newItem: { day: string; start: string; end: string; teacher: string; grade: string }): string {
    const existing = schedule.find(s =>
      s.teacher === newItem.teacher &&
      s.day === newItem.day &&
      ((newItem.start >= s.start && newItem.start < s.end) ||
       (newItem.end > s.start && newItem.end <= s.end))
    );
    if (existing) return `⚠ Conflicto: ${newItem.teacher} ya tiene clase en ${newItem.day} ${existing.start}–${existing.end} (${existing.course} · ${existing.grade})`;

    const gradeConflict = schedule.find(s =>
      s.grade === newItem.grade &&
      s.day === newItem.day &&
      ((newItem.start >= s.start && newItem.start < s.end) ||
       (newItem.end > s.start && newItem.end <= s.end))
    );
    if (gradeConflict) return `⚠ Conflicto de sección: ${newItem.grade} ya tiene ${gradeConflict.course} en ${newItem.day} ${gradeConflict.start}–${gradeConflict.end}`;

    return '';
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const conflict = checkConflict({ ...form, grade: formGrade });
    if (conflict) { setConflictWarn(conflict); return; }

    setResolving(true);
    setResolveError('');

    try {
      // Pasos 1, 2 y 3 son independientes — se ejecutan en paralelo
      const [docente_id, curso_id, seccionData] = await Promise.all([
        resolveDocenteId(form.teacher),   // 🔑 Paso 1: docente_id
        resolveCursoId(form.course),      // 🔑 Paso 2: curso_id
        resolveSeccionHorario(form.formGradeNum, form.formSection), // 🔑 Paso 3: seccion_id + periodo_id
      ]);

      // Paso 4 — asignacion_id depende de los tres anteriores
      const asignacion_id = await resolveAsignacionId(
        docente_id,
        curso_id,
        seccionData.seccion_id,
        seccionData.periodo_id,
      );

      // Payload final con FK resuelta — listo para INSERT a academic_schema.horario
      // const payload = {
      //   asignacion_id,        // 🔑 UUID real — FK obligatoria
      //   dia: form.day,
      //   hora_inicio: form.start,
      //   hora_fin: form.end,
      // };
      // await insertHorario(payload);
      void asignacion_id; // usado en el payload real

      const item: ScheduleItem = {
        id: `h${Date.now()}`,
        day: form.day, start: form.start, end: form.end,
        course: form.course, grade: formGrade,
        teacher: form.teacher, room: form.room, color: form.color,
      };
      setSchedule(prev => [...prev, item]);
      setModal(false);
      setConflictWarn('');
    } catch {
      setResolveError(
        `No se encontró la asignación para ${form.teacher} / ${form.course} / ${formGrade}.`
      );
    } finally {
      setResolving(false);
    }
  }

  function removeItem(id: string) {
    setSchedule(prev => prev.filter(s => s.id !== id));
  }

  const byDay = DAYS.map(day => ({
    day,
    items: filtered.filter(s => s.day === day).sort((a, b) => a.start.localeCompare(b.start))
  }));

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Horarios Escolares</h1>
          <p className="text-sm text-slate-500 mt-0.5">{schedule.length} bloques programados · Año 2025</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Level 1: Grade filter */}
          <div className="relative">
            <select
              value={filterGradeNum}
              onChange={e => { setFilterGradeNum(e.target.value); setFilterSection('Todos'); }}
              className="appearance-none bg-white border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="Todos">Todos los grados</option>
              {GRADE_NUMS.map(g => <option key={g} value={g}>{g} Grado</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Level 2: Section filter — only visible when a grade is selected */}
          {filterGradeNum !== 'Todos' && sectionsForFilterGrade.length > 0 && (
            <div className="relative">
              <select
                value={filterSection}
                onChange={e => setFilterSection(e.target.value)}
                className="appearance-none bg-white border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value="Todos">Todas las secciones</option>
                {sectionsForFilterGrade.map(s => <option key={s} value={s}>Sección {s}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
            </div>
          )}

          <button
            onClick={() => { setModal(true); setConflictWarn(''); }}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
          >
            <PlusCircle className="size-4" /> Agregar bloque
          </button>
        </div>
      </div>

      {/* Active filter badge */}
      {filterGradeNum !== 'Todos' && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Filtrando:</span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 text-white rounded-full text-xs font-medium">
            {filterGradeNum} Grado {filterSection !== 'Todos' ? `— Sección ${filterSection}` : ''}
            <button onClick={() => { setFilterGradeNum('Todos'); setFilterSection('Todos'); }}>
              <X className="size-3" />
            </button>
          </span>
          <span className="text-xs text-slate-400">{filtered.length} bloque{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Weekly grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-5 divide-x divide-slate-100">
          {byDay.map(({ day, items }) => (
            <div key={day} className="min-h-[400px]">
              <div className="bg-slate-50 border-b border-slate-100 px-3 py-2.5 text-center">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">{day}</p>
                <p className="text-xs text-slate-400">{items.length} clases</p>
              </div>
              <div className="p-2 space-y-2">
                {items.length === 0 ? (
                  <div className="flex items-center justify-center h-24">
                    <p className="text-xs text-slate-300">Sin clases</p>
                  </div>
                ) : items.map(item => {
                  const c = COLOR_MAP[item.color as keyof typeof COLOR_MAP] || COLOR_MAP.blue;
                  return (
                    <div key={item.id} className={`relative group rounded-xl p-2.5 border ${c.light} ${c.border} overflow-hidden`}>
                      <p className={`text-xs font-semibold ${c.text} leading-tight`}>{item.course}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{item.grade}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{item.start}–{item.end}</p>
                      <p className="text-[10px] text-slate-400 truncate">{item.room}</p>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 p-0.5 rounded-md bg-white/80 text-red-500 hover:text-red-700 transition-all"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* List view */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="text-sm font-semibold text-slate-700">Listado completo de bloques</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">Día</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Horario</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Curso</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Grado/Sec.</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 hidden md:table-cell">Docente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 hidden lg:table-cell">Aula</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(item => {
                const c = COLOR_MAP[item.color as keyof typeof COLOR_MAP] || COLOR_MAP.blue;
                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-700">{item.day}</td>
                    <td className="px-4 py-3 text-slate-600">{item.start}–{item.end}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`size-2 rounded-full ${c.dot}`} />
                        <span className="font-medium text-slate-800">{item.course}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${c.light} ${c.text} ${c.border}`}>{item.grade}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{item.teacher}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs hidden lg:table-cell">{item.room}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => removeItem(item.id)} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                        <X className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add block modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-800">Agregar bloque horario</h3>
              <button onClick={() => setModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="size-4 text-slate-500" /></button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              {conflictWarn && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                  <AlertTriangle className="size-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{conflictWarn}</p>
                </div>
              )}
              {/* 🔑 Error de resolución de asignacion_id */}
              {resolveError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                  <AlertTriangle className="size-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{resolveError}</p>
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Día', val: form.day, key: 'day', opts: DAYS },
                  { label: 'Inicio', val: form.start, key: 'start', opts: HOURS },
                  { label: 'Fin', val: form.end, key: 'end', opts: HOURS },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{f.label}</label>
                    <select value={f.val} onChange={e => { setForm(p=>({...p,[f.key]:e.target.value})); setConflictWarn(''); setResolveError(''); }}
                      className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400">
                      {f.opts.map(o=><option key={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Curso</label>
                  <select value={form.course} onChange={e => { setForm(p=>({...p, course: e.target.value})); setConflictWarn(''); setResolveError(''); }}
                    className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400">
                    {COURSES_LIST.map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Docente</label>
                  <select value={form.teacher} onChange={e => { setForm(p=>({...p, teacher: e.target.value})); setConflictWarn(''); setResolveError(''); }}
                    className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400">
                    {TEACHERS_LIST.map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
                {/* Two-level grade/section selects */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Grado</label>
                  <select value={form.formGradeNum} onChange={e => { setForm(p=>({...p, formGradeNum: e.target.value})); setConflictWarn(''); setResolveError(''); }}
                    className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400">
                    {GRADE_NUMS.map(g=><option key={g} value={g}>{g} Grado</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Sección</label>
                  <select value={form.formSection} onChange={e => { setForm(p=>({...p, formSection: e.target.value})); setConflictWarn(''); setResolveError(''); }}
                    className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400">
                    {SECTION_LIST.map(s=><option key={s} value={s}>Sección {s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Aula</label>
                  <input
                    value={form.room}
                    onChange={e => setForm(p=>({...p, room: e.target.value}))}
                    maxLength={20}
                    placeholder="Ej. Aula 301"
                    className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                  <p className={`text-xs text-right mt-1 ${form.room.length >= 20 ? 'text-red-500' : 'text-slate-400'}`}>
                    {form.room.length}/20
                  </p>
                </div>
                <div className="flex items-end pb-0.5">
                  <div className="bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 font-medium w-full text-center">
                    <span className="text-xs text-slate-500">Combinado: </span>{formGrade}
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => { setModal(false); setResolveError(''); }} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancelar</button>
                <button
                  type="submit"
                  disabled={resolving}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                >
                  {resolving
                    ? <><Loader2 className="size-4 animate-spin" /> Resolviendo datos…</>
                    : 'Agregar bloque'
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 🔑 Corrección #5 — Resolución de asignacion_id antes del INSERT a horario
// La tabla academic_schema.horario requiere asignacion_id UUID NOT NULL
// que referencia asignacion_docente(id). Se resuelve en 4 pasos.
// ─────────────────────────────────────────────────────────────────────────────

/** Paso 1 — Resolver docente_id desde nombre del docente */
async function resolveDocenteId(nombre: string): Promise<string> {
  await new Promise(r => setTimeout(r, 150));
  // En producción: GET /api/docentes?nombre={encodeURIComponent(nombre)}
  const slug = nombre.toLowerCase().replace(/\s+/g, '-').replace(/prof\./g, '').trim();
  return `doc-uuid-${slug}`;
}

/** Paso 2 — Resolver curso_id desde nombre del curso */
async function resolveCursoId(nombre: string): Promise<string> {
  await new Promise(r => setTimeout(r, 150));
  // En producción: GET /api/cursos?nombre={encodeURIComponent(nombre)}
  const slug = nombre.toLowerCase().replace(/\s+/g, '-');
  return `cur-uuid-${slug}`;
}

/** Paso 3 — Resolver seccion_id y periodo_id desde grado + sección */
async function resolveSeccionHorario(grado: string, seccion: string): Promise<{ seccion_id: string; periodo_id: string }> {
  await new Promise(r => setTimeout(r, 150));
  // En producción: GET /api/secciones?grado={grado}&seccion={seccion}&periodo_activo=true
  return {
    seccion_id: `sec-uuid-${grado.replace('°', '')}-${seccion}`.toLowerCase(),
    periodo_id: 'per-uuid-2025-activo',
  };
}

/** Paso 4 — Resolver asignacion_id (depende de los 3 anteriores) */
async function resolveAsignacionId(
  docente_id: string,
  curso_id: string,
  seccion_id: string,
  periodo_id: string,
): Promise<string> {
  await new Promise(r => setTimeout(r, 200));
  // En producción: GET /api/asignaciones?docente_id={X}&curso_id={Y}&seccion_id={Z}&periodo_id={W}
  return `asig-uuid-${docente_id}-${curso_id}-${seccion_id}-${periodo_id}`.slice(0, 60);
}