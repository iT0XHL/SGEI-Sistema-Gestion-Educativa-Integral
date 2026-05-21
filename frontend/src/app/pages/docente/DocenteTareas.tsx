import { useState, useRef, useEffect } from 'react';
import {
  Upload, PlusCircle, FileText, ExternalLink, Trash2, CheckCircle2,
  Clock, X, ChevronDown, Download, Save, Calendar, ChevronLeft,
  ChevronRight, Pencil, AlertCircle,
} from 'lucide-react';
import { useSession } from '../../../lib/hooks/useSession';
import { apiClient } from '../../../lib/api/client';
import { materialesApi } from '../../../lib/api/materiales.api';
import { actividadesApi } from '../../../lib/api/actividades.api';
import { asistenciasApi } from '../../../lib/api/asistencias.api';
import { getCourseColor } from '../../../lib/courseColors';
import { TIPOS_CON_ARCHIVO } from '../../../types/material';
import type { Material, TipoMaterial } from '../../../types/material';
import type { Actividad, Entrega, TipoActividad } from '../../../types/actividad';
import type { AsignacionDocente } from '../../../lib/api/alumnos.api';
import type { ResumenAsistencia } from '../../../types/asistencia';

// ── Types ──────────────────────────────────────────────────────────────────────

type ModalType     = 'material' | 'actividad' | null;
type ActivityType  = 'Tarea' | 'Práctica' | 'Examen' | 'Proyecto' | 'Exposición' | 'Laboratorio';

interface AsignacionOpcion {
  id:        string;
  cursoId:   string;
  seccionId: string;
  label:     string;
  curso:     string;
  seccion:   string;
  colorIdx:  number;
}

interface AlumnoRow {
  id:       string;
  nombre:   string;
  initials: string;
}

// ── Maps ───────────────────────────────────────────────────────────────────────

const ACTIVITY_TYPES: ActivityType[] = ['Tarea', 'Práctica', 'Examen', 'Proyecto', 'Exposición', 'Laboratorio'];

const ACTIVITY_TYPE_MAP: Record<ActivityType, TipoActividad> = {
  'Tarea':       'tarea',
  'Práctica':    'practica',
  'Examen':      'evaluacion',
  'Proyecto':    'proyecto',
  'Exposición':  'tarea',
  'Laboratorio': 'practica',
};

const DB_TO_UI_TYPE: Record<TipoActividad, ActivityType> = {
  'tarea':      'Tarea',
  'practica':   'Práctica',
  'evaluacion': 'Examen',
  'proyecto':   'Proyecto',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS_ES   = ['L','M','M','J','V','S','D'];

function isValidISODate(iso: string): boolean {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = new Date(iso + 'T00:00:00');
  return !isNaN(d.getTime());
}

function safeInitYear(value: string): number {
  if (isValidISODate(value)) return new Date(value + 'T00:00:00').getFullYear();
  return new Date().getFullYear();
}

function safeInitMonth(value: string): number {
  if (isValidISODate(value)) return new Date(value + 'T00:00:00').getMonth();
  return new Date().getMonth();
}

/** Formatea YYYY-MM-DD → "15 mayo 2025" */
function formatDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS_ES[m! - 1]} ${y}`;
}

/** Formatea ISO 8601 completo → "15 mayo 2025" */
function formatISOFull(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`;
}

/** Construye fecha_limite en ISO 8601 con zona horaria (esperado por el backend) */
function buildFechaLimite(date: string, hour: string, minute: string, period: 'AM' | 'PM'): string {
  let h = parseInt(hour);
  if (period === 'PM' && h < 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return `${date}T${String(h).padStart(2, '0')}:${minute}:00.000Z`;
}

function matIconBg(tipo: TipoMaterial): string {
  switch (tipo) {
    case 'PDF':    return 'bg-red-50';
    case 'enlace': return 'bg-blue-50';
    case 'video':  return 'bg-purple-50';
    case 'imagen': return 'bg-green-50';
    default:       return 'bg-slate-50';
  }
}

function MatIcon({ tipo }: { tipo: TipoMaterial }) {
  if (tipo === 'PDF' || tipo === 'imagen' || tipo === 'otro') {
    const cls = tipo === 'PDF' ? 'text-red-600' : tipo === 'imagen' ? 'text-green-600' : 'text-slate-600';
    return <FileText className={`size-5 ${cls}`} />;
  }
  const cls = tipo === 'video' ? 'text-purple-600' : 'text-blue-600';
  return <ExternalLink className={`size-5 ${cls}`} />;
}

// ── DatePicker (unchanged visual) ─────────────────────────────────────────────

function DatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const today = new Date();
  const [open, setOpen]           = useState(false);
  const [viewYear, setViewYear]   = useState(() => safeInitYear(value));
  const [viewMonth, setViewMonth] = useState(() => safeInitMonth(value));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isValidISODate(value)) {
      const d = new Date(value + 'T00:00:00');
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value]);

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
    const safeYear  = isNaN(viewYear)  ? today.getFullYear() : viewYear;
    const safeMonth = isNaN(viewMonth) ? today.getMonth()    : viewMonth;
    const firstDay  = new Date(safeYear, safeMonth, 1).getDay();
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
      <div
        role="button" tabIndex={0}
        onClick={() => setOpen(o => !o)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setOpen(o => !o); }}
        className={`w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
          open ? 'border-indigo-400 bg-white ring-2 ring-indigo-200' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
        }`}
      >
        <Calendar className="size-4 text-slate-400 shrink-0" />
        <span className={`flex-1 ${value ? 'text-slate-800' : 'text-slate-400'}`}>
          {value ? formatDate(value) : 'Seleccionar fecha…'}
        </span>
        {value ? (
          <button type="button" onClick={e => { e.stopPropagation(); onChange(''); setOpen(false); }} className="p-0.5 rounded-md hover:bg-slate-200 text-slate-400 transition-colors">
            <X className="size-3" />
          </button>
        ) : (
          <ChevronDown className={`size-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </div>
      {open && (
        <div className="mt-2 bg-white rounded-2xl border border-indigo-200 shadow-md p-4 select-none">
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"><ChevronLeft className="size-4 text-slate-600" /></button>
            <span className="text-sm font-semibold text-slate-800">{MONTHS_ES[viewMonth]} {viewYear}</span>
            <button type="button" onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"><ChevronRight className="size-4 text-slate-600" /></button>
          </div>
          <div className="grid grid-cols-7 mb-1">
            {DAYS_ES.map((d, i) => <div key={i} className="text-center text-[10px] font-semibold text-slate-400 py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-y-1">
            {grid.map((day, i) => {
              if (!day) return <div key={i} />;
              const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = selectedParts
                ? selectedParts[0] === viewYear && selectedParts[1] === viewMonth + 1 && selectedParts[2] === day
                : false;
              const isToday = iso === todayISO;
              return (
                <button key={i} type="button" onClick={() => selectDay(day)}
                  className={`text-xs py-1.5 rounded-lg transition-all font-medium ${
                    isSelected ? 'bg-indigo-600 text-white shadow-sm' :
                    isToday    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                    'text-slate-700 hover:bg-slate-100'
                  }`}
                >{day}</button>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
            <button type="button" onClick={() => { onChange(todayISO); setOpen(false); }} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors">Hoy</button>
            <span className="text-xs text-slate-400">{value ? formatDate(value) : 'Sin fecha seleccionada'}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── TimePicker (unchanged visual) ─────────────────────────────────────────────

function TimePicker({
  hour, onHourChange, minute, onMinuteChange, period, onPeriodChange,
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
      <div className="relative flex-1">
        <select value={hour} onChange={e => onHourChange(e.target.value)} className={selectCls}>
          {hours.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
      </div>
      <span className="text-slate-400 font-semibold text-base select-none">:</span>
      <div className="relative flex-1">
        <select value={minute} onChange={e => onMinuteChange(e.target.value)} className={selectCls}>
          {minutes.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
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

// ── Main component ─────────────────────────────────────────────────────────────

export default function DocenteTareas() {
  const { session, loading: sessionLoading } = useSession();

  // Selector de asignación
  const [asignaciones,  setAsignaciones]  = useState<AsignacionDocente[]>([]);
  const [asignacionSel, setAsignacionSel] = useState<AsignacionOpcion | null>(null);

  // Datos de tabs
  const [materials,   setMaterials]   = useState<Material[]>([]);
  const [activities,  setActivities]  = useState<Actividad[]>([]);
  const [entregasMap, setEntregasMap] = useState<Record<string, Entrega[]>>({});
  const [alumnos,     setAlumnos]     = useState<AlumnoRow[]>([]);

  // UI
  const [activeTab,   setActiveTab]   = useState<'materiales' | 'actividades' | 'calificaciones'>('materiales');
  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingTab,  setLoadingTab]  = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [gradeSaved,  setGradeSaved]  = useState(false);

  // Calificaciones pendientes (entregaId → valor string)
  const [pendingGrades, setPendingGrades] = useState<Record<string, string>>({});

  // Modal
  const [modal,          setModal]          = useState<ModalType>(null);
  const [submittingMat,  setSubmittingMat]  = useState(false);
  const [submittingAct,  setSubmittingAct]  = useState(false);

  // Form material
  const [matTipo,  setMatTipo]  = useState<TipoMaterial>('PDF');
  const [matTitle, setMatTitle] = useState('');
  const [matUrl,   setMatUrl]   = useState('');
  const [matFile,  setMatFile]  = useState<File | null>(null);
  const matFileRef = useRef<HTMLInputElement>(null);

  // Form actividad
  const [actTitle,      setActTitle]      = useState('');
  const [actType,       setActType]       = useState<ActivityType>('Tarea');
  const [actInstr,      setActInstr]      = useState('');
  const [actDue,        setActDue]        = useState('');
  const [actDueHour,    setActDueHour]    = useState('8');
  const [actDueMinute,  setActDueMinute]  = useState('00');
  const [actDuePeriod,  setActDuePeriod]  = useState<'AM' | 'PM'>('AM');
  const [actScore,      setActScore]      = useState('20');
  const [editingActId,  setEditingActId]  = useState<string | null>(null);

  // ── Helpers ──────────────────────────────────────────────────

  function toOpcion(a: AsignacionDocente, i: number): AsignacionOpcion {
    return {
      id:        a.id,
      cursoId:   a.curso_id,
      seccionId: a.seccion_id,
      label:     `${a.curso.nombre} — ${a.seccion.nombre}`,
      curso:     a.curso.nombre,
      seccion:   a.seccion.nombre,
      colorIdx:  i,
    };
  }

  const opciones: AsignacionOpcion[] = asignaciones.map(toOpcion);

  function getEntrega(actividadId: string, alumnoId: string): Entrega | null {
    return entregasMap[actividadId]?.find(e => e.alumno_id === alumnoId) ?? null;
  }

  // ── Carga inicial: asignaciones ──────────────────────────────

  useEffect(() => {
    if (sessionLoading || !session) return;
    let aborted = false;

    async function init() {
      setLoadingInit(true);
      try {
        const asigs = await apiClient.get<AsignacionDocente[]>('/api/asignaciones', {
          docenteId: session!.entidadId,
        });
        if (aborted) return;
        setAsignaciones(asigs);
        if (asigs.length > 0) setAsignacionSel(toOpcion(asigs[0]!, 0));
      } catch (err) {
        if (!aborted) setError(err instanceof Error ? err.message : 'Error al cargar asignaciones.');
      } finally {
        if (!aborted) setLoadingInit(false);
      }
    }

    init();
    return () => { aborted = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, sessionLoading]);

  // ── Cargar materiales, actividades y alumnos al cambiar asignación ──

  useEffect(() => {
    if (!asignacionSel) return;
    let aborted = false;

    setLoadingTab(true);
    setError(null);
    setEntregasMap({});
    setPendingGrades({});
    setGradeSaved(false);

    async function cargarTab() {
      try {
        const [mats, acts, resumen] = await Promise.all([
          materialesApi.listar({ cursoId: asignacionSel!.cursoId, seccionId: asignacionSel!.seccionId }),
          actividadesApi.listar({ cursoId: asignacionSel!.cursoId, seccionId: asignacionSel!.seccionId }),
          asistenciasApi.resumen(asignacionSel!.seccionId).catch((): ResumenAsistencia[] => []),
        ]);
        if (aborted) return;
        setMaterials(mats);
        setActivities(acts);
        setAlumnos(resumen.map((r: ResumenAsistencia) => ({
          id:       r.alumno_id,
          nombre:   r.alumno_nombre,
          initials: r.alumno_nombre.split(' ').map((n: string) => n[0]).slice(0, 2).join(''),
        })));
      } catch (err) {
        if (!aborted) setError(err instanceof Error ? err.message : 'Error al cargar datos.');
      } finally {
        if (!aborted) setLoadingTab(false);
      }
    }

    cargarTab();
    return () => { aborted = true; };
  }, [asignacionSel]);

  // ── Cargar entregas cuando se activa tab calificaciones (lazy) ──

  useEffect(() => {
    if (activeTab !== 'calificaciones' || activities.length === 0) return;
    let aborted = false;

    async function cargarEntregas() {
      const map: Record<string, Entrega[]> = {};
      await Promise.all(
        activities.map(async act => {
          const entregas = await actividadesApi.listarEntregas(act.id).catch((): Entrega[] => []);
          map[act.id] = entregas;
        })
      );
      if (!aborted) setEntregasMap(map);
    }

    cargarEntregas();
    return () => { aborted = true; };
  }, [activeTab, activities]);

  // ── Form reset ────────────────────────────────────────────────

  function resetMatForm() {
    setMatTipo('PDF'); setMatTitle(''); setMatUrl(''); setMatFile(null);
  }

  function resetActForm() {
    setActTitle(''); setActType('Tarea'); setActInstr('');
    setActDue(''); setActDueHour('8'); setActDueMinute('00');
    setActDuePeriod('AM'); setActScore('20'); setEditingActId(null);
  }

  // ── Materiales ────────────────────────────────────────────────

  async function handleSubmitMaterial(e: React.FormEvent) {
    e.preventDefault();
    if (!asignacionSel || !matTitle.trim()) return;
    setSubmittingMat(true);
    setError(null);
    try {
      let nuevo: Material;
      if (TIPOS_CON_ARCHIVO.includes(matTipo)) {
        if (!matFile) { setError('Selecciona un archivo.'); setSubmittingMat(false); return; }
        nuevo = await materialesApi.crearConArchivo({
          curso_id:   asignacionSel.cursoId,
          seccion_id: asignacionSel.seccionId,
          titulo:     matTitle,
          tipo:       matTipo as 'PDF' | 'imagen' | 'otro',
          archivo:    matFile,
        });
      } else {
        if (!matUrl.trim()) { setError('Ingresa una URL válida.'); setSubmittingMat(false); return; }
        nuevo = await materialesApi.crearConUrl({
          curso_id:   asignacionSel.cursoId,
          seccion_id: asignacionSel.seccionId,
          titulo:     matTitle,
          tipo:       matTipo as 'enlace' | 'video',
          url:        matUrl,
        });
      }
      setMaterials(prev => [nuevo, ...prev]);
      resetMatForm();
      setModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al publicar material.');
    } finally {
      setSubmittingMat(false);
    }
  }

  async function handleDeleteMaterial(mat: Material) {
    try {
      await materialesApi.eliminar(mat.id);
      setMaterials(prev => prev.filter(m => m.id !== mat.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar material.');
    }
  }

  async function handleAbrirMaterial(mat: Material) {
    try {
      if (TIPOS_CON_ARCHIVO.includes(mat.tipo)) {
        const { url } = await materialesApi.getArchivoUrl(mat.id);
        window.open(url, '_blank');
      } else {
        window.open(mat.url, '_blank');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al abrir material.');
    }
  }

  // ── Actividades ───────────────────────────────────────────────

  async function handleSubmitActividad(e: React.FormEvent) {
    e.preventDefault();
    if (!asignacionSel || !actTitle.trim() || !actDue) return;
    setSubmittingAct(true);
    setError(null);
    try {
      const fechaLimite = buildFechaLimite(actDue, actDueHour, actDueMinute, actDuePeriod);
      const payload = {
        curso_id:       asignacionSel.cursoId,
        seccion_id:     asignacionSel.seccionId,
        titulo:         actTitle,
        descripcion:    actInstr || null,
        tipo:           ACTIVITY_TYPE_MAP[actType],
        fecha_limite:   fechaLimite,
        puntaje_maximo: parseInt(actScore) || 20,
      };

      if (editingActId) {
        const actualizada = await actividadesApi.actualizar(editingActId, payload);
        setActivities(prev => prev.map(a => a.id === editingActId ? actualizada : a));
      } else {
        const nueva = await actividadesApi.crear(payload);
        setActivities(prev => [nueva, ...prev]);
      }

      resetActForm();
      setModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar actividad.');
    } finally {
      setSubmittingAct(false);
    }
  }

  async function handleDeleteActivity(act: Actividad) {
    try {
      await actividadesApi.eliminar(act.id);
      setActivities(prev => prev.filter(a => a.id !== act.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar actividad.');
    }
  }

  function handleOpenEditAct(act: Actividad) {
    setActTitle(act.titulo);
    setActType(DB_TO_UI_TYPE[act.tipo ?? 'tarea'] ?? 'Tarea');
    setActInstr(act.descripcion ?? '');

    const dt = new Date(act.fecha_limite);
    const fecha = act.fecha_limite.split('T')[0] ?? '';
    setActDue(fecha);
    const hours = dt.getUTCHours();
    const period = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    setActDueHour(String(h12));
    setActDueMinute(String(dt.getUTCMinutes()).padStart(2, '0'));
    setActDuePeriod(period);
    setActScore(String(act.puntaje_maximo));

    setEditingActId(act.id);
    setModal('actividad');
  }

  // ── Calificaciones ────────────────────────────────────────────

  function handleGradeChange(entregaId: string, valor: string) {
    setGradeSaved(false);
    setPendingGrades(prev => ({ ...prev, [entregaId]: valor }));
  }

  function computeStudentAvg(alumnoId: string): string {
    if (activities.length === 0) return '—';
    const vals = activities
      .map(act => {
        const pending = (() => {
          const e = getEntrega(act.id, alumnoId);
          return e ? (pendingGrades[e.id] ?? e.nota?.toString() ?? '') : '';
        })();
        return parseFloat(pending);
      })
      .filter(v => !isNaN(v));
    if (vals.length === 0) return '—';
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
  }

  async function handleSaveGrades() {
    const entries = Object.entries(pendingGrades).filter(([, v]) => v !== '');
    if (entries.length === 0) { setGradeSaved(true); return; }
    setSaving(true);
    setError(null);
    try {
      await Promise.all(
        entries.map(async ([entregaId, valor]) => {
          const nota = parseFloat(valor);
          if (isNaN(nota) || nota < 0) return;

          // Buscar actividadId en entregasMap
          let actividadId: string | null = null;
          for (const [actId, entregas] of Object.entries(entregasMap)) {
            if (entregas.some(e => e.id === entregaId)) { actividadId = actId; break; }
          }
          if (!actividadId) return;

          await actividadesApi.calificar(actividadId, entregaId, {
            nota,
            estado: 'calificado',
          });

          setEntregasMap(prev => ({
            ...prev,
            [actividadId!]: (prev[actividadId!] ?? []).map(e =>
              e.id === entregaId ? { ...e, nota, estado: 'calificado' as const } : e
            ),
          }));
        })
      );
      setGradeSaved(true);
      setPendingGrades({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar calificaciones.');
    } finally {
      setSaving(false);
    }
  }

  // ── Derived ───────────────────────────────────────────────────

  const c = asignacionSel ? getCourseColor(asignacionSel.colorIdx) : getCourseColor(0);

  const tabs = [
    { id: 'materiales'     as const, label: 'Materiales' },
    { id: 'actividades'    as const, label: 'Actividades' },
    { id: 'calificaciones' as const, label: 'Calificaciones' },
  ];

  // ── Skeleton inicial ──────────────────────────────────────────

  if (loadingInit || sessionLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
        <div className="animate-pulse space-y-2">
          <div className="h-8 w-64 rounded bg-slate-100" />
          <div className="h-4 w-48 rounded bg-slate-100" />
        </div>
        <div className="h-14 rounded-2xl bg-slate-100 animate-pulse" />
        <div className="h-12 rounded-xl bg-slate-100 animate-pulse" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">

      {/* Header + selector de asignación */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tareas y Materiales</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gestiona los recursos de tus cursos</p>
        </div>
        <div className="relative">
          <select
            value={asignacionSel?.id ?? ''}
            onChange={e => {
              const op = opciones.find(o => o.id === e.target.value) ?? null;
              setAsignacionSel(op);
              setGradeSaved(false);
            }}
            className="appearance-none bg-white border border-slate-200 text-slate-700 text-sm rounded-xl px-4 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm"
          >
            {opciones.length === 0 && <option value="">Sin asignaciones</option>}
            {opciones.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Course badge */}
      {asignacionSel && (
        <div className={`flex items-center gap-3 ${c.light} ${c.border} border rounded-2xl px-4 py-3`}>
          <div className={`flex size-8 items-center justify-center rounded-lg ${c.bg} text-white`}>
            <FileText className="size-4" />
          </div>
          <div>
            <p className={`text-sm font-semibold ${c.text}`}>{asignacionSel.label}</p>
            <p className="text-xs text-slate-500">{session?.nombre ?? '—'} · {alumnos.length} estudiantes</p>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
          <AlertCircle className="size-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 flex-1">{error}</p>
          <button onClick={() => setError(null)} className="p-1 rounded-lg hover:bg-red-100"><X className="size-4 text-red-400" /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto sm:inline-flex">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${activeTab === tab.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {tab.label}
            {tab.id === 'calificaciones' && activities.length > 0 && (
              <span className="ml-1.5 text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">
                {activities.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════
          Tab: Materiales
         ═══════════════════════════════════════════ */}
      {activeTab === 'materiales' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => { resetMatForm(); setModal('material'); }}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
            >
              <PlusCircle className="size-4" /> Subir material
            </button>
          </div>

          {loadingTab ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 rounded-2xl bg-slate-100 animate-pulse" />
            ))
          ) : materials.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <FileText className="size-10 text-slate-200 mb-3" />
              <p className="text-slate-500">No hay materiales publicados</p>
            </div>
          ) : (
            materials.map(mat => (
              <div key={mat.id} className="flex items-center gap-4 bg-white rounded-2xl border border-slate-200 p-4">
                <div className={`flex size-10 items-center justify-center rounded-xl shrink-0 ${matIconBg(mat.tipo)}`}>
                  <MatIcon tipo={mat.tipo} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{mat.titulo}</p>
                  <p className="text-xs text-slate-400">Publicado {formatISOFull(mat.fecha_publicacion)}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleAbrirMaterial(mat)}
                    className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 transition-colors"
                    title="Abrir/descargar"
                  >
                    <Download className="size-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteMaterial(mat)}
                    className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════
          Tab: Actividades
         ═══════════════════════════════════════════ */}
      {activeTab === 'actividades' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => { resetActForm(); setModal('actividad'); }}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
            >
              <PlusCircle className="size-4" /> Crear actividad
            </button>
          </div>

          {loadingTab ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-slate-100 animate-pulse" />
            ))
          ) : activities.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <ClipboardListIcon className="size-10 text-slate-200 mb-3" />
              <p className="text-slate-500">No hay actividades creadas aún</p>
              <p className="text-xs text-slate-400 mt-1">Las actividades aparecerán en la tabla de Calificaciones automáticamente</p>
            </div>
          ) : (
            activities.map(act => {
              const vencida = new Date(act.fecha_limite) < new Date();
              return (
                <div key={act.id} className="bg-white rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-slate-800">{act.titulo}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Vence: {formatISOFull(act.fecha_limite)} · Puntaje: {act.puntaje_maximo} pts
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
                        onClick={() => handleDeleteActivity(act)}
                        className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors"
                        title="Eliminar actividad"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                        vencida
                          ? 'bg-slate-50 text-slate-500 border-slate-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {vencida ? <CheckCircle2 className="size-3" /> : <Clock className="size-3" />}
                        {vencida ? DB_TO_UI_TYPE[act.tipo ?? 'tarea'] : 'Activa'}
                      </span>
                    </div>
                  </div>
                  {act.descripcion && (
                    <p className="text-sm text-slate-500 bg-slate-50 rounded-xl p-3 leading-relaxed">{act.descripcion}</p>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════
          Tab: Calificaciones
         ═══════════════════════════════════════════ */}
      {activeTab === 'calificaciones' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-700">Calificaciones por actividad</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {activities.length === 0
                  ? 'Crea actividades para que aparezcan aquí'
                  : `${activities.length} actividad${activities.length !== 1 ? 'es' : ''} registrada${activities.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            <p className="text-xs text-slate-500">Rango: 0–{activities[0]?.puntaje_maximo ?? 100}</p>
          </div>

          {activities.length === 0 ? (
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
                      {activities.map(act => (
                        <th key={act.id} className="text-center px-3 py-3 text-xs font-semibold text-slate-500 min-w-[110px]">
                          <div className="truncate max-w-[100px]" title={act.titulo}>{act.titulo}</div>
                          <div className="text-[10px] font-normal text-slate-400 mt-0.5">Máx: {act.puntaje_maximo}</div>
                        </th>
                      ))}
                      <th className="text-center px-4 py-3 text-xs font-semibold text-indigo-700 uppercase min-w-[80px]">Promedio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {alumnos.map(alumno => (
                      <tr key={alumno.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 sticky left-0 bg-white">
                          <div className="flex items-center gap-2">
                            <div className="flex size-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold shrink-0">
                              {alumno.initials}
                            </div>
                            <span className="font-medium text-slate-800 whitespace-nowrap">{alumno.nombre}</span>
                          </div>
                        </td>
                        {activities.map(act => {
                          const entrega = getEntrega(act.id, alumno.id);
                          const val = entrega
                            ? (pendingGrades[entrega.id] ?? (entrega.nota !== null ? String(entrega.nota) : ''))
                            : null;
                          const num = val !== null ? parseFloat(val) : NaN;
                          const isValid = val === null || val === '' || (!isNaN(num) && num >= 0 && num <= act.puntaje_maximo);
                          const filled = val !== null && val !== '' && isValid;
                          return (
                            <td key={act.id} className="text-center px-2 py-2">
                              {entrega ? (
                                <input
                                  type="number"
                                  min="0"
                                  max={act.puntaje_maximo}
                                  value={val ?? ''}
                                  onChange={e => handleGradeChange(entrega.id, e.target.value)}
                                  className={`w-14 text-center text-sm border rounded-xl py-1.5 transition-all focus:outline-none focus:ring-2 ${
                                    !isValid && val !== ''
                                      ? 'border-red-400 bg-red-50 text-red-700 focus:ring-red-400'
                                      : filled
                                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800 focus:ring-emerald-400'
                                        : 'border-slate-200 bg-slate-50 text-slate-700 focus:ring-indigo-400'
                                  }`}
                                  placeholder="—"
                                />
                              ) : (
                                <span className="text-slate-300 text-sm">—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="text-center px-4 py-3">
                          <span className="text-sm font-bold text-indigo-700">{computeStudentAvg(alumno.id)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button
                  onClick={handleSaveGrades}
                  disabled={saving || gradeSaved}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                >
                  {saving ? (
                    <><svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Guardando…</>
                  ) : gradeSaved ? (
                    <><CheckCircle2 className="size-4" />Guardado</>
                  ) : (
                    <><Save className="size-4" />Guardar calificaciones</>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════
          Modal: Subir material
         ═══════════════════════════════════════════ */}
      {modal === 'material' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-800">Subir material de clase</h3>
              <button onClick={() => { resetMatForm(); setModal(null); }} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="size-4 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleSubmitMaterial} className="p-6 space-y-4">

              {/* Título */}
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

              {/* Selector de tipo */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipo</label>
                <div className="flex flex-wrap gap-2">
                  {(['PDF', 'enlace', 'video', 'imagen', 'otro'] as TipoMaterial[]).map(t => (
                    <button key={t} type="button" onClick={() => setMatTipo(t)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all capitalize ${
                        matTipo === t
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Campo condicional según tipo */}
              {TIPOS_CON_ARCHIVO.includes(matTipo) ? (
                <div>
                  <input
                    ref={matFileRef}
                    type="file"
                    accept={matTipo === 'PDF' ? '.pdf' : matTipo === 'imagen' ? 'image/*' : '*'}
                    onChange={e => setMatFile(e.target.files?.[0] ?? null)}
                    className="hidden"
                  />
                  <div
                    onClick={() => matFileRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); setMatFile(e.dataTransfer.files[0] ?? null); }}
                    className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-indigo-300 hover:bg-indigo-50/20 transition-colors cursor-pointer"
                  >
                    {matFile ? (
                      <div>
                        <CheckCircle2 className="size-7 text-emerald-500 mx-auto mb-2" />
                        <p className="text-sm text-emerald-700 font-medium truncate">{matFile.name}</p>
                        <p className="text-xs text-slate-400 mt-1">{(matFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    ) : (
                      <div>
                        <Upload className="size-7 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">Arrastra el archivo o <span className="text-indigo-600 font-medium">selecciona</span></p>
                        <p className="text-xs text-slate-400 mt-1">Máx. 5 MB</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">URL</label>
                  <input
                    type="url"
                    value={matUrl}
                    onChange={e => setMatUrl(e.target.value)}
                    placeholder={matTipo === 'video' ? 'https://youtube.com/watch?v=...' : 'https://...'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div className="flex gap-3">
                <button type="button" onClick={() => { resetMatForm(); setModal(null); }}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit" disabled={submittingMat}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
                  {submittingMat ? 'Publicando…' : 'Publicar material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          Modal: Crear / editar actividad
         ═══════════════════════════════════════════ */}
      {modal === 'actividad' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h3 className="text-base font-semibold text-slate-800">
                {editingActId ? 'Editar actividad' : 'Crear actividad'}
              </h3>
              <button onClick={() => { resetActForm(); setModal(null); }} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="size-4 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleSubmitActividad} className="p-6 space-y-4">

              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipo de actividad</label>
                <div className="flex flex-wrap gap-2">
                  {ACTIVITY_TYPES.map(t => (
                    <button key={t} type="button" onClick={() => setActType(t)}
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

              {/* Título */}
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

              {/* Instrucciones */}
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
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Puntaje (0–100)</label>
                  <input
                    type="number" min="1" max="100"
                    value={actScore}
                    onChange={e => setActScore(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Hora límite */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Hora límite de entrega
                  <span className="ml-1.5 text-xs font-normal text-slate-400">(horas: 8–12)</span>
                </label>
                <TimePicker
                  hour={actDueHour}     onHourChange={setActDueHour}
                  minute={actDueMinute} onMinuteChange={setActDueMinute}
                  period={actDuePeriod} onPeriodChange={setActDuePeriod}
                />
              </div>

              <div className="flex gap-3 pb-2">
                <button type="button" onClick={() => { resetActForm(); setModal(null); }}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit" disabled={submittingAct || !actTitle.trim() || !actDue}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
                  {submittingAct ? 'Guardando…' : editingActId ? 'Guardar cambios' : 'Publicar actividad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ClipboardListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  );
}
