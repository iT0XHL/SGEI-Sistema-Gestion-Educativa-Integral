import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Search, BookOpen, Clock, ChevronRight, AlertCircle } from 'lucide-react';
import { useSession } from '../../../lib/hooks/useSession';
import { alumnosApi } from '../../../lib/api/alumnos.api';
import { bimestresApi } from '../../../lib/api/bimestres.api';
import { notasApi } from '../../../lib/api/notas.api';
import { horariosApi, formatHorarioCurso } from '../../../lib/api/horarios.api';
import { getCourseColor, gradeToLiteral, literalColor } from '../../../lib/courseColors';
import type { AsignacionDocente, AlumnoDetalle } from '../../../lib/api/alumnos.api';
import type { Bimestre } from '../../../lib/api/bimestres.api';
import type { Nota } from '../../../types/nota';
import type { HorarioRow } from '../../../lib/api/horarios.api';

type PageState = 'loading' | 'error' | 'ready';

interface CourseItem {
  asig: AsignacionDocente;
  idx: number;
  promedio: number | null;
  horario: string;
}

function buildCourseItems(
  asignaciones: AsignacionDocente[],
  notas: Nota[],
  horarios: HorarioRow[],
): CourseItem[] {
  return asignaciones.map((asig, idx) => {
    const notasCurso = notas.filter(n => n.competencia?.curso?.id === asig.curso.id);
    const valores = notasCurso.map(n => Number(n.nota_vigesimal));
    const promedio = valores.length > 0
      ? valores.reduce((a, b) => a + b, 0) / valores.length
      : null;
    return {
      asig,
      idx,
      promedio,
      horario: formatHorarioCurso(horarios, asig.curso.nombre),
    };
  });
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-pulse">
      <div className="h-2 bg-slate-200" />
      <div className="p-5 space-y-3">
        <div className="flex justify-between">
          <div className="size-10 rounded-xl bg-slate-200" />
          <div className="h-5 w-16 rounded-lg bg-slate-200" />
        </div>
        <div className="h-4 w-3/4 rounded bg-slate-200" />
        <div className="h-3 w-1/2 rounded bg-slate-200" />
        <div className="h-3 w-2/3 rounded bg-slate-200 mt-2" />
      </div>
    </div>
  );
}

export default function AlumnoCursos() {
  const { session, loading: sessionLoading, error: sessionError } = useSession();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [errorMsg, setErrorMsg]   = useState('');
  const [alumno, setAlumno]       = useState<AlumnoDetalle | null>(null);
  const [bimestre, setBimestre]   = useState<Bimestre | null>(null);
  const [items, setItems]         = useState<CourseItem[]>([]);
  const [search, setSearch]       = useState('');

  useEffect(() => {
    if (sessionLoading || !session) return;

    const alumnoId = session.entidadId;
    let aborted = false;

    async function cargar() {
      try {
        setPageState('loading');
        setErrorMsg('');

        // Phase 1: alumno detail + cursos + bimestres — parallel
        const [alumnoData, asignaciones, bimestres] = await Promise.all([
          alumnosApi.obtener(alumnoId).catch((): AlumnoDetalle | null => null),
          alumnosApi.cursos(alumnoId).catch((): AsignacionDocente[] => []),
          bimestresApi.listar().catch((): Bimestre[] => []),
        ]);
        if (aborted) return;

        if (alumnoData) setAlumno(alumnoData);

        const abiertos = bimestres.filter(b => !b.cerrado);
        const bimestreActivo = abiertos.length > 0
          ? abiertos.reduce((p, c) => c.numero < p.numero ? c : p)
          : bimestres.length > 0
            ? bimestres.reduce((p, c) => c.numero < p.numero ? c : p)
            : null;
        if (bimestreActivo) setBimestre(bimestreActivo);

        // Phase 2: notas + horarios — parallel
        const [notas, horarios] = await Promise.all([
          (bimestreActivo
            ? notasApi.listar({ alumnoId, bimestreId: bimestreActivo.id })
            : Promise.resolve<Nota[]>([])
          ).catch((): Nota[] => []),
          (alumnoData?.seccion_id
            ? horariosApi.listar({ seccionId: alumnoData.seccion_id })
            : Promise.resolve<HorarioRow[]>([])
          ).catch((): HorarioRow[] => []),
        ]);
        if (aborted) return;

        setItems(buildCourseItems(asignaciones, notas, horarios));
        setPageState('ready');
      } catch (err) {
        if (!aborted) {
          setErrorMsg(err instanceof Error ? err.message : 'Error al cargar los cursos.');
          setPageState('error');
        }
      }
    }

    cargar();
    return () => { aborted = true; };
  }, [session, sessionLoading]);

  if (sessionError) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          Error de sesión: {sessionError}
        </p>
      </div>
    );
  }

  if (pageState === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center p-6">
        <AlertCircle className="size-10 text-red-300 mb-3" />
        <p className="text-slate-600 font-medium">No se pudieron cargar los cursos</p>
        <p className="text-sm text-slate-400 mt-1">{errorMsg}</p>
      </div>
    );
  }

  const filtered = items.filter(({ asig }) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const docente = `${asig.docente.nombres} ${asig.docente.apellido_paterno}`.toLowerCase();
    return asig.curso.nombre.toLowerCase().includes(q) || docente.includes(q);
  });

  const gradoNombre   = alumno?.seccion?.grado?.nombre ?? '';
  const seccionNombre = alumno?.seccion?.nombre ?? '';
  const subtitulo = [
    gradoNombre && seccionNombre ? `${gradoNombre} — ${seccionNombre}` : '',
    bimestre?.nombre ?? '',
  ].filter(Boolean).join(' · ');

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mis Cursos</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {pageState === 'loading'
              ? 'Cargando…'
              : `${subtitulo}${subtitulo ? ' · ' : ''}${items.length} cursos`}
          </p>
        </div>
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="search"
            placeholder="Buscar curso o docente…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Grid */}
      {pageState === 'loading' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <AlertCircle className="size-10 text-slate-300 mb-3" />
          <p className="text-slate-600 font-medium">
            {search ? 'No se encontraron cursos' : 'No tienes cursos asignados'}
          </p>
          {search && (
            <p className="text-sm text-slate-400 mt-1">Intenta con otro término de búsqueda</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(({ asig, idx, promedio, horario }) => {
            const c   = getCourseColor(idx);
            const lit = promedio !== null ? gradeToLiteral(promedio) : null;

            return (
              <Link
                key={asig.id}
                to={`/alumno/cursos/${asig.curso_id}`}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-slate-300 transition-all duration-200 group flex flex-col"
              >
                {/* Color stripe */}
                <div className={`${c.bg} h-2`} />

                <div className="p-5 flex-1 flex flex-col">
                  {/* Icon + grade badge */}
                  <div className="flex items-start justify-between mb-4">
                    <div className={`flex size-10 items-center justify-center rounded-xl ${c.light}`}>
                      <BookOpen className={`size-5 ${c.text}`} />
                    </div>
                    {promedio !== null && lit && (
                      <span className={`text-xs font-bold px-2 py-1 rounded-lg border ${literalColor(lit)}`}>
                        {promedio.toFixed(1)} · {lit}
                      </span>
                    )}
                  </div>

                  {/* Title + teacher */}
                  <h3 className="text-base font-semibold text-slate-900 leading-snug">
                    {asig.curso.nombre}
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Prof. {asig.docente.apellido_paterno}
                  </p>

                  {/* Schedule */}
                  <div className="mt-4 pt-4 border-t border-slate-100 flex-1">
                    {horario ? (
                      <div className="flex items-center gap-2">
                        <Clock className="size-3.5 text-slate-400 shrink-0" />
                        <p className="text-xs text-slate-500 truncate">{horario}</p>
                      </div>
                    ) : null}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-slate-400">Ver materiales y notas</span>
                    <ChevronRight className="size-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
