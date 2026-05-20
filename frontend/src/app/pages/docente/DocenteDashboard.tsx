import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import {
  BookOpen, ClipboardList, ChevronRight, TrendingUp,
  Users, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useSession } from '../../../lib/hooks/useSession';
import { apiClient } from '../../../lib/api/client';
import { bimestresApi } from '../../../lib/api/bimestres.api';
import { actividadesApi } from '../../../lib/api/actividades.api';
import { notasApi } from '../../../lib/api/notas.api';
import { asistenciasApi } from '../../../lib/api/asistencias.api';
import { getCourseColor } from '../../../lib/courseColors';
import type { AsignacionDocente } from '../../../lib/api/alumnos.api';
import type { Bimestre } from '../../../lib/api/bimestres.api';
import type { Actividad } from '../../../types/actividad';
import type { Nota } from '../../../types/nota';
import type { ResumenAsistencia } from '../../../types/asistencia';

// ── Skeleton helpers ───────────────────────────────────────────────────────────

function SkeletonKpi() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 animate-pulse">
      <div className="size-10 rounded-xl bg-slate-100 mb-3" />
      <div className="h-7 w-12 rounded bg-slate-100 mb-2" />
      <div className="h-4 w-28 rounded bg-slate-100 mb-1" />
      <div className="h-3 w-20 rounded bg-slate-100" />
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 animate-pulse">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="size-9 rounded-xl bg-slate-100 shrink-0" />
        <div className="space-y-1.5 flex-1">
          <div className="h-4 w-24 rounded bg-slate-100" />
          <div className="h-3 w-16 rounded bg-slate-100" />
        </div>
      </div>
      <div className="flex justify-between">
        <div className="h-3 w-20 rounded bg-slate-100" />
        <div className="h-5 w-20 rounded-full bg-slate-100" />
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function DocenteDashboard() {
  const { session, loading: sessionLoading } = useSession();

  const [asignaciones,          setAsignaciones]          = useState<AsignacionDocente[]>([]);
  const [bimestreActivo,        setBimestreActivo]         = useState<Bimestre | null>(null);
  const [notas,                 setNotas]                  = useState<Nota[]>([]);
  const [estudiantesPorSeccion, setEstudiantesPorSeccion]  = useState<Record<string, number>>({});
  const [pendientesMap,         setPendientesMap]          = useState<Record<string, number>>({});
  const [loading,               setLoading]                = useState(true);
  const [error,                 setError]                  = useState<string | null>(null);

  // ── Data loading ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (sessionLoading || !session) return;

    let aborted = false;

    async function cargar() {
      try {
        setLoading(true);
        setError(null);

        // Phase 1: asignaciones + bimestres + actividades — parallel
        const [asigs, bimestres, acts] = await Promise.all([
          apiClient.get<AsignacionDocente[]>('/api/asignaciones', {
            docenteId: session.entidadId,
          }),
          bimestresApi.listar(),
          actividadesApi.listar({}).catch((): Actividad[] => []),
        ]);
        if (aborted) return;

        setAsignaciones(asigs);

        const bimestre = bimestres
          .filter(b => !b.cerrado)
          .sort((a, b) => b.numero - a.numero)[0] ?? null;
        setBimestreActivo(bimestre);

        // Phase 2: student counts per unique section — parallel
        const seccionesUnicas = [...new Set(asigs.map(a => a.seccion_id))];
        const resumenes = await Promise.all(
          seccionesUnicas.map(sid =>
            asistenciasApi.resumen(sid).catch((): ResumenAsistencia[] => [])
          )
        );
        if (aborted) return;

        const estMap: Record<string, number> = {};
        seccionesUnicas.forEach((sid, i) => {
          estMap[sid] = resumenes[i]!.length;
        });
        setEstudiantesPorSeccion(estMap);

        // Phase 3: notas del bimestre activo
        if (bimestre) {
          const notasData = await notasApi.listar({
            docenteId:  session.entidadId,
            bimestreId: bimestre.id,
          }).catch((): Nota[] => []);
          if (!aborted) setNotas(notasData);
        }

        // Phase 4: pendientes por actividad (batch, max 10 past-deadline)
        const pasadas = acts
          .filter(a => new Date(a.fecha_limite) <= new Date())
          .slice(0, 10);

        const pendMap: Record<string, number> = {};
        await Promise.all(
          pasadas.map(async act => {
            try {
              const entregas  = await actividadesApi.listarEntregas(act.id);
              const pendientes = entregas.filter(e => e.estado === 'entregado').length;
              const asig = asigs.find(
                a => a.curso_id === act.curso_id && a.seccion_id === act.seccion_id
              );
              if (asig) {
                pendMap[asig.id] = (pendMap[asig.id] ?? 0) + pendientes;
              }
            } catch { /* individual failure — skip */ }
          })
        );
        if (aborted) return;

        setPendientesMap(pendMap);

      } catch (err) {
        if (!aborted) {
          setError(err instanceof Error ? err.message : 'Error al cargar el dashboard');
        }
      } finally {
        if (!aborted) setLoading(false);
      }
    }

    cargar();
    return () => { aborted = true; };
  }, [session, sessionLoading]);

  // ── Derived metrics ────────────────────────────────────────────────────────────

  const totalEstudiantes = Object.values(estudiantesPorSeccion).reduce((s, n) => s + n, 0);
  const totalPendientes  = Object.values(pendientesMap).reduce((s, n) => s + n, 0);

  const chartData = asignaciones.map(asig => ({
    name:       asig.seccion.nombre,
    pendientes: pendientesMap[asig.id] ?? 0,
  }));

  const docenteNombre = session?.nombre ?? '—';
  const primerCurso   = asignaciones[0]?.curso.nombre ?? '';
  const bimestreLabel = bimestreActivo?.nombre ?? 'Sin bimestre activo';
  const anio          = new Date().getFullYear();

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500 mb-1">Bienvenido de vuelta 👋</p>
          {loading ? (
            <div className="space-y-1.5 animate-pulse">
              <div className="h-7 w-64 rounded bg-slate-100" />
              <div className="h-4 w-48 rounded bg-slate-100" />
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-slate-900">{docenteNombre}</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {primerCurso ? `Área: ${primerCurso} · ` : ''}{bimestreLabel} {anio}
              </p>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-medium">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            {bimestreActivo ? `${bimestreActivo.nombre} activo` : 'En clase'}
          </span>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
          <AlertCircle className="size-5 text-red-600 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonKpi /><SkeletonKpi /><SkeletonKpi /><SkeletonKpi />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {([
            { label: 'Secciones a cargo', value: String(asignaciones.length), sub: `Año ${anio}`,                          icon: BookOpen,     color: 'bg-blue-50 text-blue-600'     },
            { label: 'Tareas pendientes', value: String(totalPendientes),     sub: 'Por calificar',                         icon: ClipboardList, color: 'bg-amber-50 text-amber-600'   },
            { label: 'Total estudiantes', value: String(totalEstudiantes),    sub: 'En todas las secciones',                icon: Users,         color: 'bg-purple-50 text-purple-600' },
            { label: 'Notas ingresadas',  value: String(notas.length),        sub: bimestreActivo?.nombre ?? 'Bimestre',    icon: CheckCircle2,  color: 'bg-emerald-50 text-emerald-600' },
          ] as const).map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className={`flex size-10 items-center justify-center rounded-xl mb-3 ${s.color}`}>
                <s.icon className="size-5" />
              </div>
              <p className="text-2xl font-bold text-slate-900 leading-none">{s.value}</p>
              <p className="text-sm font-medium text-slate-600 mt-1">{s.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Section cards */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-800">Mis secciones</h2>
            <Link
              to="/docente/tareas"
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
            >
              Gestionar <ChevronRight className="size-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {loading ? (
              <>
                <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
              </>
            ) : asignaciones.length === 0 ? (
              <p className="col-span-2 text-sm text-slate-500 text-center py-8">
                No hay secciones asignadas.
              </p>
            ) : (
              asignaciones.map((asig, idx) => {
                const c              = getCourseColor(idx);
                const pendingReviews = pendientesMap[asig.id] ?? 0;
                const totalStudents  = estudiantesPorSeccion[asig.seccion_id] ?? 0;

                return (
                  <Link
                    key={asig.id}
                    to={`/docente/tareas?seccionId=${asig.seccion_id}&cursoId=${asig.curso_id}`}
                    className="bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md hover:border-slate-300 transition-all group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`flex size-9 items-center justify-center rounded-xl ${c.bg} text-white`}>
                          <BookOpen className="size-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{asig.curso.nombre}</p>
                          <p className="text-xs text-slate-400">Sec. {asig.seccion.nombre}</p>
                        </div>
                      </div>
                      <ChevronRight className="size-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-500">{totalStudents} estudiantes</p>
                      {pendingReviews > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-medium">
                          <span className="size-1.5 rounded-full bg-amber-500" />
                          {pendingReviews} pendientes
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
                          <CheckCircle2 className="size-3" /> Al día
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Chart + Quick actions */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Tareas pendientes por sección</h3>
            {loading ? (
              <div className="h-40 rounded-xl bg-slate-100 animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis key="xaxis" dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis key="yaxis" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip
                    key="tooltip"
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Bar key="bar" dataKey="pendientes" fill="#3b82f6" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Acciones rápidas</h3>
            <div className="space-y-2">
              {[
                { label: 'Tomar asistencia', desc: 'Registro del día de hoy',                                                            to: '/docente/asistencia', color: 'text-emerald-600 bg-emerald-50' },
                { label: 'Subir actividad',  desc: 'Nueva tarea o material',                                                             to: '/docente/tareas',     color: 'text-blue-600 bg-blue-50'     },
                { label: 'Ingresar notas',   desc: bimestreActivo ? `${bimestreActivo.nombre} en curso` : 'Sin bimestre activo',          to: '/docente/notas',      color: 'text-purple-600 bg-purple-50' },
              ].map(a => (
                <Link
                  key={a.to}
                  to={a.to}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
                >
                  <div className={`flex size-8 items-center justify-center rounded-lg ${a.color}`}>
                    <TrendingUp className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{a.label}</p>
                    <p className="text-xs text-slate-400">{a.desc}</p>
                  </div>
                  <ChevronRight className="size-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
