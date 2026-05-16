import { useState, useRef, useEffect } from 'react';
import { Upload, PlusCircle, FileText, ExternalLink, Trash2, CheckCircle2, Clock, X, ChevronDown, Download, Save, Calendar, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { MATERIALS, ACTIVITIES, STUDENTS_3A, COURSES, COLOR_MAP } from '../../data/mockData';

type ModalType = 'material' | 'actividad' | null;
type ActivityType = 'Tarea' | 'Práctica' | 'Examen' | 'Proyecto' | 'Exposición' | 'Laboratorio';

type Activity = {
  id: string;
  title: string;
  courseId: string;
  dueDate: string;
  dueTime?: string;
  maxScore: number;
  status: 'pending' | 'submitted' | 'graded';
  score: number | null;
  instructions?: string;
};

const ACTIVITY_TYPES: ActivityType[] = ['Tarea', 'Práctica', 'Examen', 'Proyecto', 'Exposición', 'Laboratorio'];

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS_ES = ['L','M','M','J','V','S','D'];

/** Devuelve true sólo si iso tiene formato YYYY-MM-DD y es una fecha real */
function isValidISODate(iso: string): boolean {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = new Date(iso + 'T00:00:00');
  return !isNaN(d.getTime());
}

/** Año seguro para inicializar el DatePicker (scope de módulo, sin hooks) */
function safeInitYear(value: string): number {
  if (isValidISODate(value)) return new Date(value + 'T00:00:00').getFullYear();
  return new Date().getFullYear();
}

/** Mes seguro para inicializar el DatePicker (scope de módulo, sin hooks) */
function safeInitMonth(value: string): number {
  if (isValidISODate(value)) return new Date(value + 'T00:00:00').getMonth();
  return new Date().getMonth();
}

/** Formatea YYYY-MM-DD → "15 mayo 2025" */
function formatDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS_ES[m - 1]} ${y}`;
}

/** Custom DatePicker component — inline expansion (no absolute/overflow issues) */
function DatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const today = new Date();
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear]   = useState(() => safeInitYear(value));
  const [viewMonth, setViewMonth] = useState(() => safeInitMonth(value));
  const ref = useRef<HTMLDivElement>(null);

  // Sync view when value changes externally
  useEffect(() => {
    if (isValidISODate(value)) {
      const d = new Date(value + 'T00:00:00');
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  function buildGrid() {
    // Guard against NaN values (invalid date state)
    const safeYear  = isNaN(viewYear)  ? today.getFullYear() : viewYear;
    const safeMonth = isNaN(viewMonth) ? today.getMonth()    : viewMonth;
    const firstDay = new Date(safeYear, safeMonth, 1).getDay();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(safeYear, safeMonth + 1, 0).getDate();
    const cells: (number | null)[] = [
      ...Array(startOffset).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }

  const grid = buildGrid();
  const selectedParts = (value && isValidISODate(value)) ? value.split('-').map(Number) : null;
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  function selectDay(day: number) {
    const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(iso);
    setOpen(false);
  }

  return (
    <div ref={ref}>
      {/* Trigger — div to avoid nested <button> invalid HTML */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(o => !o)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setOpen(o => !o); }}
        className={`w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
          open
            ? 'border-indigo-400 bg-white ring-2 ring-indigo-200'
            : 'border-slate-200 bg-slate-50 hover:border-slate-300'
        }`}
      >
        <Calendar className="size-4 text-slate-400 shrink-0" />
        <span className={`flex-1 ${value ? 'text-slate-800' : 'text-slate-400'}`}>
          {value ? formatDate(value) : 'Seleccionar fecha…'}
        </span>
        {value ? (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onChange(''); setOpen(false); }}
            className="p-0.5 rounded-md hover:bg-slate-200 text-slate-400 transition-colors"
          >
            <X className="size-3" />
          </button>
        ) : (
          <ChevronDown className={`size-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </div>

      {/* Inline calendar — expands in document flow, no overflow clipping */}
      {open && (
        <div className="mt-2 bg-white rounded-2xl border border-indigo-200 shadow-md p-4 select-none">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              <ChevronLeft className="size-4 text-slate-600" />
            </button>
            <span className="text-sm font-semibold text-slate-800">
              {MONTHS_ES[viewMonth]} {viewYear}
            </span>
            <button type="button" onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              <ChevronRight className="size-4 text-slate-600" />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS_ES.map((d, i) => (
              <div key={i} className="text-center text-[10px] font-semibold text-slate-400 py-1">{d}</div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-y-1">
            {grid.map((day, i) => {
              if (!day) return <div key={i} />;
              const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = selectedParts
                ? selectedParts[0] === viewYear && selectedParts[1] === viewMonth + 1 && selectedParts[2] === day
                : false;
              const isToday = iso === todayISO;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={`text-xs py-1.5 rounded-lg transition-all font-medium ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : isToday
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
            <button
              type="button"
              onClick={() => { onChange(todayISO); setOpen(false); }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              Hoy
            </button>
            <span className="text-xs text-slate-400">{value ? formatDate(value) : 'Sin fecha seleccionada'}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/** TimePicker component — dropdowns para hora, minutos y AM/PM */
function TimePicker({
  hour, onHourChange,
  minute, onMinuteChange,
  period, onPeriodChange,
}: {
  hour: string; onHourChange: (v: string) => void;
  minute: string; onMinuteChange: (v: string) => void;
  period: 'AM' | 'PM'; onPeriodChange: (v: 'AM' | 'PM') => void;
}) {
  const hours   = ['8','9','10','11','12'];
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
  const selectCls = 'flex-1 px-2.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none text-center';
  return (
    <div className="flex items-center gap-1.5">
      {/* Hora */}
      <div className="relative flex-1">
        <select value={hour} onChange={e => onHourChange(e.target.value)} className={selectCls}>
          {hours.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
      </div>
      <span className="text-slate-400 font-semibold text-base select-none">:</span>
      {/* Minutos */}
      <div className="relative flex-1">
        <select value={minute} onChange={e => onMinuteChange(e.target.value)} className={selectCls}>
          {minutes.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      {/* AM / PM */}
      <div className="relative">
        <select value={period} onChange={e => onPeriodChange(e.target.value as 'AM' | 'PM')}
          className="px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none"
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  );
}

export default function DocenteTareas() {
  const [activeTab, setActiveTab] = useState<'materiales' | 'actividades' | 'calificaciones'>('materiales');
  const [modal, setModal] = useState<ModalType>(null);
  const [materials, setMaterials] = useState(MATERIALS);
  const [activities, setActivities] = useState<Activity[]>(ACTIVITIES as Activity[]);
  const [selectedCourse, setSelectedCourse] = useState('c1');
  const [matTitle, setMatTitle] = useState('');
  const [actTitle, setActTitle] = useState('');
  const [actType, setActType] = useState<ActivityType>('Tarea');
  const [actInstr, setActInstr] = useState('');
  const [actDue, setActDue] = useState('');
  const [actDueHour, setActDueHour]     = useState('8');
  const [actDueMinute, setActDueMinute] = useState('00');
  const [actDuePeriod, setActDuePeriod] = useState<'AM' | 'PM'>('AM');
  const [actScore, setActScore] = useState('20');
  const [editingActId, setEditingActId] = useState<string | null>(null);

  // Grade state: keyed by [studentId][activityId]
  const [grades, setGrades] = useState<Record<string, Record<string, string>>>(
    () => Object.fromEntries(
      STUDENTS_3A.map(s => [
        s.id,
        Object.fromEntries(ACTIVITIES.map(a => [a.id, a.score?.toString() ?? '']))
      ])
    )
  );
  const [gradeSaved, setGradeSaved] = useState(false);

  const course = COURSES.find(c => c.id === selectedCourse)!;
  const c = COLOR_MAP[course.color];

  // Activities for the currently selected course
  const courseActivities = activities.filter(a => a.courseId === selectedCourse);

  function handleAddMaterial(e: React.FormEvent) {
    e.preventDefault();
    if (!matTitle.trim()) return;
    setMaterials(prev => [{
      // 🔄 Corrección #9: 'pdf' → 'PDF' (ENUM academic_schema.tipo_material)
      id: `m${Date.now()}`, title: matTitle, type: 'PDF', date: new Date().toLocaleDateString('es-PE'), size: '—', courseId: selectedCourse
    }, ...prev]);
    setMatTitle('');
    setModal(null);
  }

  function resetActForm() {
    setActTitle(''); setActType('Tarea'); setActInstr('');
    setActDue(''); setActDueHour('8'); setActDueMinute('00'); setActDuePeriod('AM');
    setActScore('20'); setEditingActId(null);
  }

  function handleAddActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!actTitle.trim()) return;
    const dueTimeStr = actDue ? `${actDueHour}:${actDueMinute} ${actDuePeriod}` : undefined;

    if (editingActId) {
      // Modo edición
      setActivities(prev => prev.map(a => a.id === editingActId ? {
        ...a,
        title: `[${actType}] ${actTitle}`,
        courseId: selectedCourse,
        dueDate: actDue || '—',
        dueTime: dueTimeStr,
        maxScore: parseInt(actScore) || 20,
        instructions: actInstr,
      } : a));
    } else {
      // Modo creación
      const newId = `act${Date.now()}`;
      const newAct: Activity = {
        id: newId,
        title: `[${actType}] ${actTitle}`,
        courseId: selectedCourse,
        dueDate: actDue || '—',
        dueTime: dueTimeStr,
        maxScore: parseInt(actScore) || 20,
        status: 'pending',
        score: null,
        instructions: actInstr,
      };
      setActivities(prev => [newAct, ...prev]);
      setGrades(prev => {
        const next = { ...prev };
        STUDENTS_3A.forEach(s => {
          next[s.id] = { ...(next[s.id] || {}), [newId]: '' };
        });
        return next;
      });
    }

    setGradeSaved(false);
    resetActForm();
    setModal(null);
  }

  function handleOpenEditAct(act: Activity) {
    // Extraer tipo del título [Tipo] Título
    const match = act.title.match(/^\[(.+?)\]\s+(.+)$/);
    const tipo  = (match?.[1] ?? 'Tarea') as ActivityType;
    const titulo = match?.[2] ?? act.title;
    setActType(ACTIVITY_TYPES.includes(tipo as ActivityType) ? tipo : 'Tarea');
    setActTitle(titulo);
    setActInstr(act.instructions || '');
    setActDue(act.dueDate === '—' ? '' : act.dueDate);
    setActScore(String(act.maxScore));
    // Parsear hora si existe
    if (act.dueTime) {
      const [timePart, per] = act.dueTime.split(' ');
      const [h, m] = timePart.split(':');
      setActDueHour(h || '8');
      setActDueMinute(m || '00');
      setActDuePeriod((per as 'AM' | 'PM') || 'AM');
    } else {
      setActDueHour('8'); setActDueMinute('00'); setActDuePeriod('AM');
    }
    setEditingActId(act.id);
    setModal('actividad');
  }

  function removeActivity(id: string) {
    setActivities(prev => prev.filter(a => a.id !== id));
    setGrades(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(sid => { delete next[sid][id]; });
      return next;
    });
  }

  function removeMaterial(id: string) {
    setMaterials(prev => prev.filter(m => m.id !== id));
  }

  function computeStudentAvg(studentId: string): string {
    if (courseActivities.length === 0) return '—';
    const vals = courseActivities
      .map(a => parseFloat(grades[studentId]?.[a.id] || ''))
      .filter(v => !isNaN(v));
    if (vals.length === 0) return '—';
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
  }

  function handleGradeChange(studentId: string, actId: string, value: string) {
    setGrades(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [actId]: value }
    }));
    setGradeSaved(false);
  }

  const tabs = [
    { id: 'materiales' as const, label: 'Materiales' },
    { id: 'actividades' as const, label: 'Actividades' },
    { id: 'calificaciones' as const, label: 'Calificaciones' },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tareas y Materiales</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gestiona los recursos de tus cursos</p>
        </div>
        <div className="relative">
          <select
            value={selectedCourse}
            onChange={e => { setSelectedCourse(e.target.value); setGradeSaved(false); }}
            className="appearance-none bg-white border border-slate-200 text-slate-700 text-sm rounded-xl px-4 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm"
          >
            {COURSES.slice(0, 4).map(c => <option key={c.id} value={c.id}>{c.name} — {c.grade}° {c.section}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Course badge */}
      <div className={`flex items-center gap-3 ${c.light} ${c.border} border rounded-2xl px-4 py-3`}>
        <div className={`flex size-8 items-center justify-center rounded-lg ${c.bg} text-white`}>
          <FileText className="size-4" />
        </div>
        <div>
          <p className={`text-sm font-semibold ${c.text}`}>{course.name} — {course.grade}° {course.section}</p>
          <p className="text-xs text-slate-500">{course.teacher} · {course.totalStudents} estudiantes</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto sm:inline-flex">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${activeTab === tab.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {tab.label}
            {tab.id === 'calificaciones' && courseActivities.length > 0 && (
              <span className="ml-1.5 text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">
                {courseActivities.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Materiales */}
      {activeTab === 'materiales' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setModal('material')}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
            >
              <PlusCircle className="size-4" /> Subir material
            </button>
          </div>
          {materials.filter(m => m.courseId === selectedCourse).length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <FileText className="size-10 text-slate-200 mb-3" />
              <p className="text-slate-500">No hay materiales publicados</p>
            </div>
          ) : materials.filter(m => m.courseId === selectedCourse).map(mat => (
            <div key={mat.id} className="flex items-center gap-4 bg-white rounded-2xl border border-slate-200 p-4">
              <div className={`flex size-10 items-center justify-center rounded-xl shrink-0 ${
                // 🔄 Corrección #9: 'pdf' → 'PDF', 'link' → 'enlace'
                mat.type === 'PDF' ? 'bg-red-50' : 'bg-blue-50'
              }`}>
                {mat.type === 'PDF' ? <FileText className="size-5 text-red-600" /> : <ExternalLink className="size-5 text-blue-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{mat.title}</p>
                <p className="text-xs text-slate-400">Publicado {mat.date}{mat.size !== '—' ? ` · ${mat.size}` : ''}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 transition-colors">
                  <Download className="size-4" />
                </button>
                <button onClick={() => removeMaterial(mat.id)} className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors">
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Actividades */}
      {activeTab === 'actividades' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setModal('actividad')}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
            >
              <PlusCircle className="size-4" /> Crear actividad
            </button>
          </div>
          {courseActivities.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <ClipboardListIcon className="size-10 text-slate-200 mb-3" />
              <p className="text-slate-500">No hay actividades creadas aún</p>
              <p className="text-xs text-slate-400 mt-1">Las actividades aparecerán en la tabla de Calificaciones automáticamente</p>
            </div>
          ) : courseActivities.map(act => (
            <div key={act.id} className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-slate-800">{act.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Vence: {act.dueDate}{act.dueTime ? ` a las ${act.dueTime}` : ''} · Puntaje: {act.maxScore} pts
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleOpenEditAct(act)}
                    className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-colors"
                    title="Editar actividad"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    onClick={() => removeActivity(act.id)}
                    className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors"
                    title="Eliminar actividad"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${ 
                    act.status === 'pending'   ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    act.status === 'submitted' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {act.status === 'pending' ? <Clock className="size-3" /> : <CheckCircle2 className="size-3" />}
                    {act.status === 'pending' ? 'Pendiente' : act.status === 'submitted' ? 'Entregado' : 'Calificado'}
                  </span>
                </div>
              </div>
              {act.instructions && (
                <p className="text-sm text-slate-500 bg-slate-50 rounded-xl p-3 leading-relaxed">{act.instructions}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tab: Calificaciones — dinámico por actividades del docente */}
      {activeTab === 'calificaciones' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-700">Calificaciones por actividad</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {courseActivities.length === 0
                  ? 'Crea actividades para que aparezcan aquí'
                  : `${courseActivities.length} actividad${courseActivities.length !== 1 ? 'es' : ''} registrada${courseActivities.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            <p className="text-xs text-slate-500">Rango: 0–20</p>
          </div>

          {courseActivities.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <FileText className="size-10 text-slate-200 mb-3" />
              <p className="text-slate-600 font-medium">No hay actividades para calificar</p>
              <p className="text-sm text-slate-400 mt-1">Ve a la pestaña <strong>Actividades</strong> y crea una actividad</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 sticky left-0 bg-slate-50 min-w-[180px]">
                        Estudiante
                      </th>
                      {courseActivities.map(a => (
                        <th key={a.id} className="text-center px-3 py-3 text-xs font-semibold text-slate-500 min-w-[110px]">
                          <div className="truncate max-w-[100px]" title={a.title}>{a.title}</div>
                          <div className="text-[10px] font-normal text-slate-400 mt-0.5">Máx: {a.maxScore}</div>
                        </th>
                      ))}
                      <th className="text-center px-4 py-3 text-xs font-semibold text-indigo-700 uppercase min-w-[80px]">Promedio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {STUDENTS_3A.map(student => (
                      <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 sticky left-0 bg-white">
                          <div className="flex items-center gap-2">
                            <div className="flex size-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold shrink-0">
                              {student.initials}
                            </div>
                            <span className="font-medium text-slate-800 whitespace-nowrap">{student.name}</span>
                          </div>
                        </td>
                        {courseActivities.map(act => {
                          const val = grades[student.id]?.[act.id] ?? '';
                          const num = parseFloat(val);
                          const isValid = val === '' || (!isNaN(num) && num >= 0 && num <= act.maxScore);
                          const filled = val !== '' && isValid;
                          return (
                            <td key={act.id} className="text-center px-2 py-2">
                              <input
                                type="number"
                                min="0"
                                max={act.maxScore}
                                value={val}
                                onChange={e => handleGradeChange(student.id, act.id, e.target.value)}
                                className={`w-14 text-center text-sm border rounded-xl py-1.5 transition-all focus:outline-none focus:ring-2 ${
                                  !isValid && val !== ''
                                    ? 'border-red-400 bg-red-50 text-red-700 focus:ring-red-400'
                                    : filled
                                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800 focus:ring-emerald-400'
                                      : 'border-slate-200 bg-slate-50 text-slate-700 focus:ring-indigo-400'
                                }`}
                                placeholder="—"
                              />
                            </td>
                          );
                        })}
                        <td className="text-center px-4 py-3">
                          <span className="text-sm font-bold text-indigo-700">{computeStudentAvg(student.id)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setGradeSaved(true)}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                >
                  {gradeSaved
                    ? <><CheckCircle2 className="size-4" />Guardado</>
                    : <><Save className="size-4" />Guardar calificaciones</>
                  }
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Add Material Modal */}
      {modal === 'material' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-800">Subir material de clase</h3>
              <button onClick={() => setModal(null)} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="size-4 text-slate-500" /></button>
            </div>
            <form onSubmit={handleAddMaterial} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Título del material</label>
                <input
                  value={matTitle}
                  onChange={e => setMatTitle(e.target.value)}
                  maxLength={200}
                  placeholder="Ej. Guía de ejercicios — Capítulo 4"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className={`text-xs text-right mt-1 ${matTitle.length >= 200 ? 'text-red-500' : 'text-slate-400'}`}>
                  {matTitle.length}/200
                </p>
              </div>
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-indigo-300 hover:bg-indigo-50/20 transition-colors cursor-pointer">
                <Upload className="size-7 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Arrastra el archivo o <span className="text-indigo-600 font-medium">selecciona</span></p>
                <p className="text-xs text-slate-400 mt-1">PDF, DOCX, XLSX, links · Máx. 10 MB</p>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setModal(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancelar</button>
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">Publicar material</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Activity Modal */}
      {modal === 'actividad' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h3 className="text-base font-semibold text-slate-800">
                {editingActId ? 'Editar actividad' : 'Crear actividad'}
              </h3>
              <button onClick={() => { resetActForm(); setModal(null); }} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="size-4 text-slate-500" /></button>
            </div>
            <form onSubmit={handleAddActivity} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipo de actividad</label>
                <div className="flex flex-wrap gap-2">
                  {ACTIVITY_TYPES.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setActType(t)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                        actType === t
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Título</label>
                <input
                  value={actTitle}
                  onChange={e => setActTitle(e.target.value)}
                  maxLength={200}
                  placeholder={`Ej. ${actType} N° 3 — Capítulo 5`}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className={`text-xs text-right mt-1 ${actTitle.length >= 200 ? 'text-red-500' : 'text-slate-400'}`}>
                  {actTitle.length}/200
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Instrucciones</label>
                <textarea
                  value={actInstr}
                  onChange={e => setActInstr(e.target.value)}
                  maxLength={2000}
                  rows={3}
                  placeholder="Describe qué deben hacer los estudiantes…"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
                <p className={`text-xs text-right mt-1 ${actInstr.length >= 2000 ? 'text-red-500' : 'text-slate-400'}`}>
                  {actInstr.length}/2000
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Fecha límite</label>
                  <DatePicker value={actDue} onChange={setActDue} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Puntaje (0–20)</label>
                  <input type="number" min="0" max="20" value={actScore} onChange={e => setActScore(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              {/* Hora límite de entrega */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Hora límite de entrega
                  <span className="ml-1.5 text-xs font-normal text-slate-400">(horas: 8–12)</span>
                </label>
                <TimePicker
                  hour={actDueHour}       onHourChange={setActDueHour}
                  minute={actDueMinute}   onMinuteChange={setActDueMinute}
                  period={actDuePeriod}   onPeriodChange={setActDuePeriod}
                />
              </div>
              <div className="flex gap-3 pb-2">
                <button type="button" onClick={() => { resetActForm(); setModal(null); }} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancelar</button>
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
                  {editingActId ? 'Guardar cambios' : 'Publicar actividad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline SVG icon to avoid extra import
function ClipboardListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  );
}