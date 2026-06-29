import { useState, useEffect, useMemo } from 'react';
import {
  Users, CheckCircle2, XCircle, Clock, ShieldCheck, Filter,
  CalendarSearch, AlertCircle, Loader2, ChevronDown, BarChart3, ListChecks,
} from 'lucide-react';
import { asistenciasApi } from '../../../lib/api/asistencias.api';
import { cargarSecciones, obtenerPeriodoActivo } from '../../../lib/api/horarios.api';
import type { SeccionRow } from '../../../lib/api/horarios.api';
import type { AsistenciaRegistro, EstadoAsistencia, ResumenAsistencia } from '../../../types/asistencia';

const ESTADO_META: Record<EstadoAsistencia, { label: string; cls: string; Icon: React.ElementType }> = {
  P: { label: 'Presente',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icon: CheckCircle2 },
  F: { label: 'Falta',       cls: 'bg-red-50 text-red-700 border-red-200',             Icon: XCircle },
  T: { label: 'Tardanza',    cls: 'bg-amber-50 text-amber-700 border-amber-200',       Icon: Clock },
  J: { label: 'Justificado', cls: 'bg-blue-50 text-blue-700 border-blue-200',          Icon: ShieldCheck },
};

function nombreAlumno(r: AsistenciaRegistro): string {
  if (!r.alumno) return r.alumno_id;
  return `${r.alumno.apellido_paterno} ${r.alumno.apellido_materno}, ${r.alumno.nombres}`.trim();
}

function nombreDocente(r: AsistenciaRegistro): string {
  if (!r.registrador) return '—';
  return `${r.registrador.nombres} ${r.registrador.apellido_paterno}`.trim();
}

function pctColor(p: number): string {
  if (p >= 90) return 'bg-emerald-500';
  if (p >= 70) return 'bg-amber-400';
  return 'bg-red-400';
}

export default function AdminAsistenciaAlumnos() {
  const [secciones, setSecciones] = useState<SeccionRow[]>([]);
  const [seccionId, setSeccionId] = useState('');
  const [tab,       setTab]       = useState<'resumen' | 'sesiones'>('resumen');

  const [resumen,   setResumen]   = useState<ResumenAsistencia[]>([]);
  const [registros, setRegistros] = useState<AsistenciaRegistro[]>([]);

  const [fechaDesde,   setFechaDesde]   = useState('');
  const [fechaHasta,   setFechaHasta]   = useState('');
  const [estado,       setEstado]       = useState<'' | EstadoAsistencia>('');
  const [alumnoFiltro, setAlumnoFiltro] = useState('');

  const [loading,    setLoading]    = useState(true);
  const [cargando,   setCargando]   = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [sinPeriodo, setSinPeriodo] = useState(false);

  // Carga inicial: período activo + secciones.
  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const periodo = await obtenerPeriodoActivo();
        if (aborted) return;
        if (!periodo) { setSinPeriodo(true); return; }
        const secs = await cargarSecciones(periodo.id);
        if (aborted) return;
        setSecciones(secs);
        if (secs.length > 0) setSeccionId(secs[0]!.id);
      } catch (err) {
        if (!aborted) setError(err instanceof Error ? err.message : 'Error al cargar secciones.');
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => { aborted = true; };
  }, []);

  // Carga del resumen al cambiar de sección.
  useEffect(() => {
    if (!seccionId) { setResumen([]); return; }
    let aborted = false;
    setCargando(true);
    setError(null);
    (async () => {
      try {
        const data = await asistenciasApi.resumen(seccionId);
        if (!aborted) setResumen(data);
      } catch (err) {
        if (!aborted) setError(err instanceof Error ? err.message : 'Error al cargar el resumen.');
      } finally {
        if (!aborted) setCargando(false);
      }
    })();
    return () => { aborted = true; };
  }, [seccionId]);

  // Carga de sesiones (detalle) según filtros de servidor.
  useEffect(() => {
    if (!seccionId || tab !== 'sesiones') return;
    let aborted = false;
    setCargando(true);
    setError(null);
    (async () => {
      try {
        const data = await asistenciasApi.listar({
          seccionId,
          ...(estado ? { estado } : {}),
          ...(fechaDesde ? { fechaDesde } : {}),
          ...(fechaHasta ? { fechaHasta } : {}),
          limit: 3000,
        });
        if (!aborted) setRegistros(data);
      } catch (err) {
        if (!aborted) setError(err instanceof Error ? err.message : 'Error al cargar las sesiones.');
      } finally {
        if (!aborted) setCargando(false);
      }
    })();
    return () => { aborted = true; };
  }, [seccionId, tab, estado, fechaDesde, fechaHasta]);

  const seccionLabel = useMemo(() => {
    const s = secciones.find(x => x.id === seccionId);
    return s ? `${s.grado?.nombre ?? ''} ${s.nombre}`.trim() : '';
  }, [secciones, seccionId]);

  // Totales del resumen.
  const totales = useMemo(() => {
    const t = { alumnos: resumen.length, presentes: 0, faltas: 0, tardanzas: 0, justificados: 0, dias: 0 };
    for (const r of resumen) {
      t.presentes += r.total_presentes;
      t.faltas += r.total_faltas;
      t.tardanzas += r.total_tardanzas;
      t.justificados += r.total_justificados;
      t.dias += r.total_dias_registrados;
    }
    return t;
  }, [resumen]);

  const pctPromedio = useMemo(() => {
    const conDatos = resumen.filter(r => r.total_dias_registrados > 0);
    if (conDatos.length === 0) return 0;
    const suma = conDatos.reduce((acc, r) => acc + (r.porcentaje_asistencia ?? 0), 0);
    return Math.round(suma / conDatos.length);
  }, [resumen]);

  // Sesiones agrupadas por fecha (con filtro de alumno en cliente).
  const sesiones = useMemo(() => {
    const filtro = alumnoFiltro.trim().toLowerCase();
    const visibles = filtro
      ? registros.filter(r => nombreAlumno(r).toLowerCase().includes(filtro))
      : registros;
    const porFecha = new Map<string, AsistenciaRegistro[]>();
    for (const r of visibles) {
      const dia = r.fecha.slice(0, 10);
      if (!porFecha.has(dia)) porFecha.set(dia, []);
      porFecha.get(dia)!.push(r);
    }
    return Array.from(porFecha.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([fecha, items]) => ({
        fecha,
        items: items.sort((a, b) => nombreAlumno(a).localeCompare(nombreAlumno(b))),
      }));
  }, [registros, alumnoFiltro]);

  function fechaLarga(iso: string): string {
    return new Date(`${iso}T00:00:00`).toLocaleDateString('es-PE', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="size-8 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (sinPeriodo) {
    return (
      <div className="p-6 lg:p-8 max-w-3xl mx-auto">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
          <AlertCircle className="size-6 text-amber-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-amber-800">No hay un período académico activo.</p>
          <p className="text-xs text-amber-600 mt-1">Activa un período para consultar la asistencia de alumnos.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Asistencia de Alumnos</h1>
        <p className="text-slate-600 mt-1">Supervisión institucional de la asistencia por sección</p>
      </div>

      {/* Controles */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Sección</label>
            <div className="relative">
              <select
                value={seccionId}
                onChange={e => setSeccionId(e.target.value)}
                className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {secciones.length === 0 && <option value="">Sin secciones</option>}
                {secciones.map(s => (
                  <option key={s.id} value={s.id}>{s.grado?.nombre} {s.nombre}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 self-start">
            <button
              onClick={() => setTab('resumen')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === 'resumen' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <BarChart3 className="size-4" /> Resumen
            </button>
            <button
              onClick={() => setTab('sesiones')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === 'sesiones' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <ListChecks className="size-4" /> Sesiones
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
          <AlertCircle className="size-5 text-red-600 shrink-0" />
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {/* ── Resumen ──────────────────────────────────────────── */}
      {tab === 'resumen' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
              <Users className="size-5 text-slate-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-slate-800">{totales.alumnos}</p>
              <p className="text-xs text-slate-500 font-medium">Alumnos</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-emerald-700">{pctPromedio}%</p>
              <p className="text-xs text-emerald-600 font-medium">Asistencia promedio</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-amber-700">{totales.tardanzas}</p>
              <p className="text-xs text-amber-600 font-medium">Tardanzas</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-red-700">{totales.faltas}</p>
              <p className="text-xs text-red-600 font-medium">Faltas</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
              <p className="text-sm font-semibold text-slate-700">
                {seccionLabel ? `Sección ${seccionLabel}` : 'Resumen por alumno'}
              </p>
            </div>
            {cargando ? (
              <div className="py-16 text-center"><Loader2 className="size-6 text-slate-300 animate-spin mx-auto" /></div>
            ) : resumen.length === 0 ? (
              <p className="py-16 text-center text-sm text-slate-400">No hay alumnos en esta sección.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Alumno</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-emerald-600">Pres.</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-amber-600">Tard.</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-red-600">Falt.</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-blue-600">Just.</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500">Días</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 min-w-[140px]">% Asistencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {resumen.map(r => {
                      const pct = r.porcentaje_asistencia ?? 0;
                      return (
                        <tr key={r.alumno_id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3 font-medium text-slate-800">{r.alumno_nombre}</td>
                          <td className="text-center px-3 py-3 text-emerald-700 font-semibold">{r.total_presentes}</td>
                          <td className="text-center px-3 py-3 text-amber-700 font-semibold">{r.total_tardanzas}</td>
                          <td className="text-center px-3 py-3 text-red-700 font-semibold">{r.total_faltas}</td>
                          <td className="text-center px-3 py-3 text-blue-700 font-semibold">{r.total_justificados}</td>
                          <td className="text-center px-3 py-3 text-slate-500">{r.total_dias_registrados}</td>
                          <td className="px-4 py-3">
                            {r.total_dias_registrados === 0 ? (
                              <span className="text-xs text-slate-400">Sin registros</span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${pctColor(pct)}`} style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-xs font-medium text-slate-600 w-10 text-right">{pct}%</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Sesiones ─────────────────────────────────────────── */}
      {tab === 'sesiones' && (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2 text-slate-700">
              <Filter className="size-4" /><span className="text-sm font-semibold">Filtros</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Estado</label>
                <select
                  value={estado}
                  onChange={e => setEstado(e.target.value as '' | EstadoAsistencia)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Todos</option>
                  <option value="P">Presente</option>
                  <option value="F">Falta</option>
                  <option value="T">Tardanza</option>
                  <option value="J">Justificado</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Alumno</label>
                <input
                  type="text" value={alumnoFiltro} onChange={e => setAlumnoFiltro(e.target.value)}
                  placeholder="Buscar por nombre…"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Desde</label>
                <input
                  type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Hasta</label>
                <input
                  type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {cargando ? (
            <div className="py-16 text-center"><Loader2 className="size-6 text-slate-300 animate-spin mx-auto" /></div>
          ) : sesiones.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-16 text-center">
              <CalendarSearch className="size-8 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No hay sesiones registradas para los filtros seleccionados.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sesiones.map(({ fecha, items }) => {
                const cont = { P: 0, F: 0, T: 0, J: 0 } as Record<EstadoAsistencia, number>;
                items.forEach(i => { cont[i.estado]++; });
                const docente = items[0] ? nombreDocente(items[0]) : '—';
                return (
                  <div key={fecha} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-700 capitalize">{fechaLarga(fecha)}</p>
                        <p className="text-xs text-slate-400">Registró: {docente}</p>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {(Object.keys(ESTADO_META) as EstadoAsistencia[]).map(e =>
                          cont[e] > 0 ? (
                            <span key={e} className={`px-2 py-0.5 rounded-full border text-xs font-semibold ${ESTADO_META[e].cls}`}>
                              {cont[e]} {ESTADO_META[e].label}
                            </span>
                          ) : null,
                        )}
                      </div>
                    </div>
                    <div className="divide-y divide-slate-50">
                      {items.map(r => {
                        const meta = ESTADO_META[r.estado];
                        return (
                          <div key={r.id} className="flex items-center gap-4 px-5 py-3">
                            <p className="flex-1 text-sm font-medium text-slate-800">{nombreAlumno(r)}</p>
                            {r.justificacion && (
                              <span className="hidden md:block text-xs text-slate-400 italic truncate max-w-[220px]">{r.justificacion}</span>
                            )}
                            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${meta.cls}`}>
                              <meta.Icon className="size-3.5" /> {meta.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
