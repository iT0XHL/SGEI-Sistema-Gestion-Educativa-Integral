import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { BookOpen, ChevronRight, Clock, CheckCircle2 } from 'lucide-react';
import { useSession } from '../../../lib/hooks/useSession';
import { alumnosApi } from '../../../lib/api/alumnos.api';
import { bimestresApi } from '../../../lib/api/bimestres.api';
import { notasApi } from '../../../lib/api/notas.api';
import { actividadesApi } from '../../../lib/api/actividades.api';
import type { AlumnoDetalle, AsignacionDocente } from '../../../lib/api/alumnos.api';
import type { Bimestre } from '../../../lib/api/bimestres.api';
import type { Nota } from '../../../types/nota';
import type { Actividad, Entrega, EstadoEntrega } from '../../../types/actividad';

// ── Color palette ──────────────────────────────────────────────────────────────
type CourseColor = 'blue' | 'emerald' | 'amber' | 'purple' | 'red' | 'pink' | 'indigo' | 'teal' | 'orange';

const COLOR_PALETTE: Record<CourseColor, { bg: string }> = {
  blue:    { bg: 'bg-blue-600'    },
  emerald: { bg: 'bg-emerald-600' },
  amber:   { bg: 'bg-amber-500'   },
  purple:  { bg: 'bg-purple-600'  },
  red:     { bg: 'bg-red-500'     },
  pink:    { bg: 'bg-pink-500'    },
  indigo:  { bg: 'bg-indigo-600'  },
  teal:    { bg: 'bg-teal-600'    },
  orange:  { bg: 'bg-orange-500'  },
};

const COLORS: CourseColor[] = [
  'blue', 'emerald', 'amber', 'purple', 'red', 'pink', 'indigo', 'teal', 'orange',
];

// ── Grade helpers ──────────────────────────────────────────────────────────────
function gradeToLiteral(grade: number): string {
  if (grade >= 18) return 'AD';
  if (grade >= 14) return 'A';
  if (grade >= 11) return 'B';
  return 'C';
}

function literalColor(literal: string): string {
  switch (literal) {
    case 'AD': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    case 'A':  return 'text-blue-700 bg-blue-50 border-blue-200';
    case 'B':  return 'text-amber-700 bg-amber-50 border-amber-200';
    case 'C':  return 'text-red-700 bg-red-50 border-red-200';
    default:   return 'text-slate-500 bg-slate-50 border-slate-200';
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const day   = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()}`;
}

// ── Local interfaces ───────────────────────────────────────────────────────────

interface CursoDashboard {
  id: string;
  nombre: string;
  docente: string;
  color: CourseColor;
  promedio: string;
  literal: string;
  proximaActividad: string;
}

interface ActividadDashboard {
  id: string;
  titulo: string;
  fechaLimite: string;
  estado: EstadoEntrega;
  nota: number | null;
  puntajeMaximo: number;
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="size-9 rounded-xl bg-slate-200" />
        <div className="h-5 w-20 rounded-full bg-slate-200" />
      </div>
      <div className="h-4 w-32 rounded bg-slate-200 mb-1" />
      <div className="h-3 w-24 rounded bg-slate-200" />
      <div className="h-3 w-28 rounded bg-slate-200 mt-3" />
    </div>
  );
}

// ── Data-fetching helpers ──────────────────────────────────────────────────────

function buildCursos(
  asignaciones: AsignacionDocente[],
  notas: Nota[],
  acts: Actividad[],
  hoy: Date,
): CursoDashboard[] {
  return asignaciones.slice(0, 4).map((asig, idx) => {
    const notasCurso = notas.filter(
      n => n.competencia?.curso?.id === asig.curso.id,
    );
    // Prisma's Decimal serializes to a JSON string; Number() normalises it.
    const valores = notasCurso.map(n => Number(n.nota_vigesimal));
    const suma    = valores.reduce((a, b) => a + b, 0);
    const promedio = valores.length > 0 ? (suma / valores.length).toFixed(1) : '—';
    const literal  = valores.length > 0 ? gradeToLiteral(suma / valores.length) : '—';

    const proxima = acts
      .filter(a => a.curso_id === asig.curso_id && new Date(a.fecha_limite) >= hoy)
      .sort((a, b) => new Date(a.fecha_limite).getTime() - new Date(b.fecha_limite).getTime())[0];

    return {
      id:               asig.curso_id,
      nombre:           asig.curso.nombre,
      docente:          `Prof. ${asig.docente.apellido_paterno}`,
      color:            COLORS[idx % COLORS.length],
      promedio,
      literal,
      proximaActividad: proxima?.titulo ?? 'Sin actividades próximas',
    };
  });
}

function buildActividades(
  proximas: Actividad[],
  entregasMap: Map<string, Entrega[]>,
): ActividadDashboard[] {
  return proximas.map(act => {
    const entregas = entregasMap.get(act.id) ?? [];
    // For Alumno role the backend already returns only their own entrega (or []).
    const entrega  = entregas[0] as Entrega | undefined;
    return {
      id:            act.id,
      titulo:        act.titulo,
      fechaLimite:   formatDate(act.fecha_limite),
      estado:        entrega?.estado ?? 'pendiente',
      nota:          entrega?.nota   ?? null,
      puntajeMaximo: act.puntaje_maximo,
    };
  });
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AlumnoDashboard() {
  const { session, loading: sessionLoading, error: sessionError } = useSession();

  const [alumno, setAlumno]                 = useState<AlumnoDetalle | null>(null);
  const [bimestreActivo, setBimestreActivo] = useState<Bimestre | null>(null);
  const [cursos, setCursos]                 = useState<CursoDashboard[]>([]);
  const [actividades, setActividades]       = useState<ActividadDashboard[]>([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState<string | null>(null);

  useEffect(() => {
    if (sessionLoading || !session) return;

    const alumnoId = session.entidadId;
    let aborted = false;

    async function cargarDatos() {
      try {
        setLoading(true);
        setError(null);

        // ── Phase 1: alumno detail + courses + bimestres — parallel, each with fallback ──
        const [alumnoData, asignaciones, bimestres] = await Promise.all([
          alumnosApi.obtener(alumnoId)
            .catch((): AlumnoDetalle | null => null),
          alumnosApi.cursos(alumnoId)
            .catch((): AsignacionDocente[] => []),
          bimestresApi.listar()
            .catch((): Bimestre[] => []),
        ]);
        if (aborted) return;

        if (alumnoData) setAlumno(alumnoData);

        // Active bimestre = open (cerrado=false), lowest numero (el más próximo en curso).
        const abiertos = bimestres.filter(b => !b.cerrado);
        const bimestre = abiertos.length > 0
          ? abiertos.reduce((prev, curr) => curr.numero < prev.numero ? curr : prev)
          : null;
        setBimestreActivo(bimestre);

        // ── Phase 2: notas + actividades — parallel, each with fallback ──
        // actividadesApi.listar: for Alumno role the backend ignores any filter
        // and derives the section from the JWT automatically.
        const [notas, acts] = await Promise.all([
          (bimestre
            ? notasApi.listar({ alumnoId, bimestreId: bimestre.id })
            : Promise.resolve<Nota[]>([])
          ).catch((): Nota[] => []),
          actividadesApi.listar({})
            .catch((): Actividad[] => []),
        ]);
        if (aborted) return;

        const hoy = new Date();
        if (!aborted) setCursos(buildCursos(asignaciones, notas, acts, hoy));

        // ── Phase 3: entrega status for each upcoming activity ──
        const proximas = acts
          .filter(a => new Date(a.fecha_limite) >= hoy)
          .sort((a, b) => new Date(a.fecha_limite).getTime() - new Date(b.fecha_limite).getTime())
          .slice(0, 5);

        // Run all entrega fetches in parallel; individual failures fall back to [].
        const entregasMap = new Map<string, Entrega[]>();
        await Promise.all(
          proximas.map(async act => {
            try {
              const entregas = await actividadesApi.listarEntregas(act.id);
              entregasMap.set(act.id, entregas);
            } catch {
              entregasMap.set(act.id, []);
            }
          }),
        );
        if (aborted) return;

        setActividades(buildActividades(proximas, entregasMap));

      } catch (err) {
        if (!aborted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Error al cargar los datos del dashboard.',
          );
        }
      } finally {
        if (!aborted) setLoading(false);
      }
    }

    cargarDatos();

    // Cleanup: prevent stale state updates if component unmounts or session changes.
    return () => { aborted = true; };
  }, [session, sessionLoading]);

  // ── Early exit: session error ──────────────────────────────────────────────

  if (sessionError) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          Error de sesión: {sessionError}
        </p>
      </div>
    );
  }

  // ── Derived display values ─────────────────────────────────────────────────

  const nombreCompleto = alumno
    ? `${alumno.nombres} ${alumno.apellido_paterno} ${alumno.apellido_materno}`
    : (session?.nombre ?? '—');
  const gradoNombre   = alumno?.seccion?.grado?.nombre ?? '';
  const seccionNombre = alumno?.seccion?.nombre ?? '';
  const anio          = new Date().getFullYear();

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500 mb-1">Buenos días 👋</p>
          {sessionLoading || loading ? (
            <div className="space-y-1.5 animate-pulse">
              <div className="h-7 w-56 rounded bg-slate-200" />
              <div className="h-4 w-44 rounded bg-slate-200" />
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-slate-900">{nombreCompleto}</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {gradoNombre} Sec. {seccionNombre} · Año escolar {anio}
              </p>
            </>
          )}
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-medium self-start sm:self-auto">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          {bimestreActivo ? `${bimestreActivo.nombre} activo` : 'Sin bimestre activo'}
        </span>
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Courses grid ─────────────────────────────────────── */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-800">Mis cursos</h2>
            <Link
              to="/alumno/cursos"
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
            >
              Ver todos <ChevronRight className="size-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {loading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : cursos.length === 0 ? (
              <p className="col-span-2 text-sm text-slate-500 text-center py-8">
                No hay cursos disponibles.
              </p>
            ) : (
              cursos.map(curso => {
                const c = COLOR_PALETTE[curso.color];
                return (
                  <Link
                    key={curso.id}
                    to={`/alumno/cursos/${curso.id}`}
                    className="bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md hover:border-slate-300 transition-all group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className={`flex size-9 items-center justify-center rounded-xl ${c.bg} text-white`}>
                        <BookOpen className="size-4" />
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${literalColor(curso.literal)}`}>
                        {curso.promedio !== '—'
                          ? `${curso.promedio} (${curso.literal})`
                          : 'Sin notas'}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800">{curso.nombre}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{curso.docente}</p>
                    <div className="flex items-center gap-1.5 mt-3">
                      <Clock className="size-3 text-slate-400" />
                      <p className="text-xs text-slate-500 truncate">{curso.proximaActividad}</p>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* ── Upcoming activities ───────────────────────────────── */}
        <div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Actividades próximas</h3>
              <Link to="/alumno/cursos" className="text-xs text-blue-600 hover:underline">
                Ver más
              </Link>
            </div>

            <div className="divide-y divide-slate-50">
              {loading ? (
                <div className="px-4 py-6 animate-pulse space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-3">
                      <div className="size-6 rounded-full bg-slate-200 shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-4 w-36 rounded bg-slate-200" />
                        <div className="h-3 w-24 rounded bg-slate-200" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : actividades.length === 0 ? (
                <p className="px-4 py-6 text-sm text-slate-500 text-center">
                  No hay actividades próximas.
                </p>
              ) : (
                actividades.map(act => (
                  <div key={act.id} className="px-4 py-3 flex items-start gap-3">
                    <div className={`mt-0.5 flex size-6 items-center justify-center rounded-full shrink-0 ${
                      act.estado === 'pendiente'
                        ? 'bg-amber-100 text-amber-600'
                        : act.estado === 'entregado'
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-emerald-100 text-emerald-600'
                    }`}>
                      {act.estado === 'calificado'
                        ? <CheckCircle2 className="size-3.5" />
                        : <Clock className="size-3.5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-700 font-medium leading-snug truncate">
                        {act.titulo}
                      </p>
                      <p className="text-xs text-slate-400">Vence: {act.fechaLimite}</p>
                    </div>
                    {act.nota !== null && (
                      <span className="text-xs font-bold text-emerald-700 shrink-0">
                        {act.nota}/{act.puntajeMaximo}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
