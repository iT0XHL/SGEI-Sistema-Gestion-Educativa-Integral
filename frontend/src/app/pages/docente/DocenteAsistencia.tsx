import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Clock, Save, ChevronDown, Info, AlertCircle, X } from 'lucide-react';
import { useSession } from '../../../lib/hooks/useSession';
import { apiClient } from '../../../lib/api/client';
import { asistenciasApi } from '../../../lib/api/asistencias.api';
import { UI_TO_DB, DB_TO_UI } from '../../../types/asistencia';
import type { AsignacionDocente } from '../../../lib/api/alumnos.api';
import type { ResumenAsistencia } from '../../../types/asistencia';

type AttendanceStatus = 'present' | 'absent' | 'late' | null;

interface AlumnoAsistencia {
  id:       string;
  nombre:   string;
  initials: string;
}

interface AsignacionOpcion {
  id:        string;
  cursoId:   string;
  seccionId: string;
  label:     string;
  curso:     string;
  seccion:   string;
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-3.5 animate-pulse">
      <div className="w-6 h-4 rounded bg-slate-100 shrink-0" />
      <div className="size-9 rounded-full bg-slate-100 shrink-0" />
      <div className="flex-1 h-4 rounded bg-slate-100" />
      <div className="hidden sm:flex gap-1.5">
        <div className="size-9 rounded-xl bg-slate-100" />
        <div className="size-9 rounded-xl bg-slate-100" />
        <div className="size-9 rounded-xl bg-slate-100" />
      </div>
    </div>
  );
}

export default function DocenteAsistencia() {
  const { session, loading: sessionLoading } = useSession();

  const [asignaciones,           setAsignaciones]           = useState<AsignacionDocente[]>([]);
  const [asignacionSeleccionada, setAsignacionSeleccionada] = useState<AsignacionOpcion | null>(null);
  const [alumnos,                setAlumnos]                = useState<AlumnoAsistencia[]>([]);
  const [loadingAlumnos,         setLoadingAlumnos]         = useState(false);
  const [date,                   setDate]                   = useState(new Date().toISOString().split('T')[0]);
  const [attendance,             setAttendance]             = useState<Record<string, AttendanceStatus>>({});
  const [saved,                  setSaved]                  = useState(false);
  const [saving,                 setSaving]                 = useState(false);
  const [errorMsg,               setErrorMsg]               = useState<string | null>(null);
  const [loading,                setLoading]                = useState(true);

  const opciones: AsignacionOpcion[] = asignaciones.map(a => ({
    id:        a.id,
    cursoId:   a.curso_id,
    seccionId: a.seccion_id,
    label:     `${a.curso.nombre} — ${a.seccion.nombre}`,
    curso:     a.curso.nombre,
    seccion:   a.seccion.nombre,
  }));

  // Carga inicial de asignaciones del docente
  useEffect(() => {
    if (sessionLoading || !session) return;
    let aborted = false;

    async function cargarAsignaciones() {
      try {
        const asigs = await apiClient.get<AsignacionDocente[]>('/api/asignaciones', {
          docenteId: session!.entidadId,
        });
        if (aborted) return;
        setAsignaciones(asigs);
        if (asigs.length > 0) {
          const primera = asigs[0]!;
          setAsignacionSeleccionada({
            id:        primera.id,
            cursoId:   primera.curso_id,
            seccionId: primera.seccion_id,
            label:     `${primera.curso.nombre} — ${primera.seccion.nombre}`,
            curso:     primera.curso.nombre,
            seccion:   primera.seccion.nombre,
          });
        }
      } catch (err) {
        if (!aborted) setErrorMsg(err instanceof Error ? err.message : 'Error al cargar asignaciones.');
      } finally {
        if (!aborted) setLoading(false);
      }
    }

    cargarAsignaciones();
    return () => { aborted = true; };
  }, [session, sessionLoading]);

  // Recarga alumnos y asistencia existente al cambiar asignación o fecha
  useEffect(() => {
    if (!asignacionSeleccionada || !date) return;
    setSaved(false);
    let aborted = false;
    setLoadingAlumnos(true);

    async function cargarAlumnosYAsistencia(seccionId: string, fecha: string) {
      try {
        const [resumen, registrosHoy] = await Promise.all([
          asistenciasApi.resumen(seccionId),
          asistenciasApi.listar({ seccionId, fecha }),
        ]);
        if (aborted) return;

        const alumnosLista: AlumnoAsistencia[] = resumen.map((r: ResumenAsistencia) => ({
          id:       r.alumno_id,
          nombre:   r.alumno_nombre,
          initials: r.alumno_nombre
            .split(' ')
            .map((n: string) => n[0])
            .slice(0, 2)
            .join(''),
        }));
        setAlumnos(alumnosLista);

        const estadoInicial: Record<string, AttendanceStatus> = {};
        alumnosLista.forEach(a => { estadoInicial[a.id] = null; });
        registrosHoy.forEach(r => {
          const estadoUI = DB_TO_UI[r.estado];
          // 'justified' no tiene botón en la UI del docente — se muestra sin marcar
          estadoInicial[r.alumno_id] = estadoUI === 'justified' ? null : estadoUI;
        });
        setAttendance(estadoInicial);
      } catch (err) {
        if (!aborted) setErrorMsg(err instanceof Error ? err.message : 'Error al cargar alumnos.');
      } finally {
        if (!aborted) setLoadingAlumnos(false);
      }
    }

    cargarAlumnosYAsistencia(asignacionSeleccionada.seccionId, date);
    return () => { aborted = true; };
  }, [asignacionSeleccionada, date]);

  const marked   = Object.values(attendance).filter(v => v !== null).length;
  const total    = alumnos.length;
  const progress = total > 0 ? Math.round((marked / total) * 100) : 0;

  function mark(id: string, status: AttendanceStatus) {
    setSaved(false);
    setAttendance(prev => ({
      ...prev,
      [id]: prev[id] === status ? null : status,
    }));
  }

  function markAll(status: AttendanceStatus) {
    setSaved(false);
    setAttendance(Object.fromEntries(alumnos.map(a => [a.id, status])));
  }

  async function handleSave() {
    if (!asignacionSeleccionada) return;
    setSaving(true);
    setSaved(false);
    setErrorMsg(null);

    const registros = Object.entries(attendance)
      .filter(([, estado]) => estado !== null)
      .map(([alumno_id, estadoUI]) => ({
        alumno_id,
        estado: UI_TO_DB[estadoUI as keyof typeof UI_TO_DB],
      }));

    if (registros.length === 0) {
      setErrorMsg('Debes marcar al menos un alumno antes de guardar.');
      setSaving(false);
      return;
    }

    try {
      await asistenciasApi.guardar({
        seccion_id:    asignacionSeleccionada.seccionId,
        asignacion_id: asignacionSeleccionada.id,
        fecha:         date,
        registros,
      });
      setSaved(true);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al guardar la asistencia.');
    } finally {
      setSaving(false);
    }
  }

  const presentCount = Object.values(attendance).filter(v => v === 'present').length;
  const absentCount  = Object.values(attendance).filter(v => v === 'absent').length;
  const lateCount    = Object.values(attendance).filter(v => v === 'late').length;

  if (loading || sessionLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
        <div className="animate-pulse space-y-2">
          <div className="h-8 w-64 rounded bg-slate-100" />
          <div className="h-4 w-48 rounded bg-slate-100" />
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="h-10 rounded-xl bg-slate-100 animate-pulse" />
            <div className="h-10 rounded-xl bg-slate-100 animate-pulse" />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Registro de Asistencia</h1>
          <p className="text-sm text-slate-500 mt-0.5">Marca la asistencia del día para tu sección</p>
        </div>
        <button
          onClick={handleSave}
          disabled={marked === 0 || saving || saved}
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

      {/* Selectores */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Asignación</label>
            <div className="relative">
              <select
                value={asignacionSeleccionada?.id ?? ''}
                onChange={e => {
                  const opcion = opciones.find(o => o.id === e.target.value) ?? null;
                  setAsignacionSeleccionada(opcion);
                  setSaved(false);
                }}
                className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {opciones.length === 0 && <option value="">Sin asignaciones</option>}
                {opciones.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
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

      {/* Progreso y acciones rápidas */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-slate-700">Progreso del registro</span>
              <span className="text-sm font-bold text-slate-800">{marked}/{total} marcados</span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${marked === total && total > 0 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
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

        {/* Chips de resumen */}
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

      {/* Lista de alumnos */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">
            {asignacionSeleccionada
              ? `${asignacionSeleccionada.seccion} — ${total} estudiantes`
              : 'Selecciona una asignación'}
          </p>
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <Info className="size-3.5" /> Haz clic en P/F/T para marcar
          </span>
        </div>
        <div className="divide-y divide-slate-50">
          {loadingAlumnos ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
          ) : alumnos.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-10">
              {asignacionSeleccionada
                ? 'No hay alumnos registrados en esta sección.'
                : 'Selecciona una asignación para ver los alumnos.'}
            </p>
          ) : (
            alumnos.map((alumno, idx) => {
              const status = attendance[alumno.id];
              return (
                <div key={alumno.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                  <span className="text-xs font-medium text-slate-400 w-6 shrink-0">{idx + 1}</span>
                  <div className="flex size-9 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-sm font-semibold shrink-0">
                    {alumno.initials}
                  </div>
                  <p className="flex-1 text-sm font-medium text-slate-800">{alumno.nombre}</p>

                  {/* Indicador de estado */}
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

                  {/* Botones P / F / T */}
                  <div className="flex gap-1.5 shrink-0">
                    {(['present', 'absent', 'late'] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => mark(alumno.id, s)}
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
            })
          )}
        </div>
      </div>

      {saved && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">Asistencia registrada exitosamente</p>
            <p className="text-xs text-emerald-600 mt-0.5">
              El registro del {new Date(date + 'T00:00:00').toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} ha sido guardado.
            </p>
          </div>
        </div>
      )}

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
