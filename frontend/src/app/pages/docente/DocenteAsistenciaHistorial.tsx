import { useState, useEffect, useMemo } from 'react';
import { CalendarSearch, Filter, AlertCircle, CheckCircle2, XCircle, Clock, ShieldCheck } from 'lucide-react';
import { useSession } from '../../../lib/hooks/useSession';
import { apiClient } from '../../../lib/api/client';
import { asistenciasApi } from '../../../lib/api/asistencias.api';
import type { AsignacionDocente } from '../../../lib/api/alumnos.api';
import type { AsistenciaRegistro, EstadoAsistencia } from '../../../types/asistencia';

const ESTADO_META: Record<EstadoAsistencia, { label: string; cls: string; Icon: React.ElementType }> = {
  P: { label: 'Presente',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icon: CheckCircle2 },
  F: { label: 'Falta',       cls: 'bg-red-50 text-red-700 border-red-200',             Icon: XCircle },
  T: { label: 'Tardanza',    cls: 'bg-amber-50 text-amber-700 border-amber-200',       Icon: Clock },
  J: { label: 'Justificado', cls: 'bg-blue-50 text-blue-700 border-blue-200',          Icon: ShieldCheck },
};

interface AsignacionOpcion {
  id: string;
  seccionId: string;
  label: string;
}

function nombreAlumno(r: AsistenciaRegistro): string {
  if (!r.alumno) return r.alumno_id;
  return `${r.alumno.apellido_paterno} ${r.alumno.apellido_materno}, ${r.alumno.nombres}`.trim();
}

export default function DocenteAsistenciaHistorial() {
  const { session, loading: sessionLoading } = useSession();

  const [asignaciones,  setAsignaciones]  = useState<AsignacionDocente[]>([]);
  const [seccionId,     setSeccionId]     = useState('');
  const [fechaDesde,    setFechaDesde]    = useState('');
  const [fechaHasta,    setFechaHasta]    = useState('');
  const [estado,        setEstado]        = useState<'' | EstadoAsistencia>('');
  const [alumnoFiltro,  setAlumnoFiltro]  = useState('');

  const [registros, setRegistros] = useState<AsistenciaRegistro[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [cargando,  setCargando]  = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const opciones: AsignacionOpcion[] = useMemo(
    () =>
      asignaciones.map(a => ({
        id:        a.id,
        seccionId: a.seccion_id,
        label:     `${a.curso.nombre} — ${a.seccion.nombre}`,
      })),
    [asignaciones],
  );

  // Carga inicial de asignaciones del docente.
  useEffect(() => {
    if (sessionLoading || !session) return;
    let aborted = false;

    (async () => {
      try {
        const asigs = await apiClient.get<AsignacionDocente[]>('/api/asignaciones', {
          docenteId: session!.entidadId,
        });
        if (aborted) return;
        setAsignaciones(asigs);
        if (asigs.length > 0) setSeccionId(asigs[0]!.seccion_id);
      } catch (err) {
        if (!aborted) setError(err instanceof Error ? err.message : 'Error al cargar asignaciones.');
      } finally {
        if (!aborted) setLoading(false);
      }
    })();

    return () => { aborted = true; };
  }, [session, sessionLoading]);

  // Recarga el historial cuando cambian los filtros de servidor.
  useEffect(() => {
    if (!seccionId) { setRegistros([]); return; }
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
        });
        if (!aborted) setRegistros(data);
      } catch (err) {
        if (!aborted) setError(err instanceof Error ? err.message : 'Error al cargar el historial.');
      } finally {
        if (!aborted) setCargando(false);
      }
    })();

    return () => { aborted = true; };
  }, [seccionId, estado, fechaDesde, fechaHasta]);

  // Filtro por alumno (cliente) + agrupación por fecha.
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

  const cursoLabel = opciones.find(o => o.seccionId === seccionId)?.label ?? '';

  function fechaLarga(iso: string): string {
    return new Date(`${iso}T00:00:00`).toLocaleDateString('es-PE', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  }

  if (loading || sessionLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-4">
        <div className="h-8 w-64 rounded bg-slate-100 animate-pulse" />
        <div className="h-32 rounded-2xl bg-slate-100 animate-pulse" />
        <div className="h-64 rounded-2xl bg-slate-100 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Historial de Asistencia</h1>
        <p className="text-sm text-slate-500 mt-0.5">Consulta las sesiones registradas de tus clases</p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2 text-slate-700">
          <Filter className="size-4" />
          <span className="text-sm font-semibold">Filtros</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Curso — Sección</label>
            <select
              value={seccionId}
              onChange={e => setSeccionId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {opciones.length === 0 && <option value="">Sin asignaciones</option>}
              {opciones.map(o => <option key={o.id} value={o.seccionId}>{o.label}</option>)}
            </select>
          </div>
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
              type="text"
              value={alumnoFiltro}
              onChange={e => setAlumnoFiltro(e.target.value)}
              placeholder="Buscar por nombre…"
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={e => setFechaDesde(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={e => setFechaHasta(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
          <AlertCircle className="size-5 text-red-600 shrink-0" />
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {/* Sesiones */}
      {cargando ? (
        <div className="space-y-3">
          <div className="h-40 rounded-2xl bg-slate-100 animate-pulse" />
          <div className="h-40 rounded-2xl bg-slate-100 animate-pulse" />
        </div>
      ) : sesiones.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-16 text-center">
          <CalendarSearch className="size-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No hay registros de asistencia para los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sesiones.map(({ fecha, items }) => {
            const cont = { P: 0, F: 0, T: 0, J: 0 } as Record<EstadoAsistencia, number>;
            items.forEach(i => { cont[i.estado]++; });
            return (
              <div key={fecha} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-700 capitalize">{fechaLarga(fecha)}</p>
                    {cursoLabel && <p className="text-xs text-slate-400">{cursoLabel}</p>}
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
                          <span className="hidden md:block text-xs text-slate-400 italic truncate max-w-[200px]">{r.justificacion}</span>
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
    </div>
  );
}
