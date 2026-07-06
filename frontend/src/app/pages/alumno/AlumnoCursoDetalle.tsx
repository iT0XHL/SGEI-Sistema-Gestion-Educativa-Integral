import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router';
import {
  BookOpen, FileText, ClipboardList, Download, ExternalLink, Upload,
  CheckCircle2, Clock, AlertCircle, ChevronLeft, RefreshCw, Paperclip,
  X, GraduationCap, Image,
} from 'lucide-react';
import { useSession } from '../../../lib/hooks/useSession';
import { alumnosApi } from '../../../lib/api/alumnos.api';
import { bimestresApi } from '../../../lib/api/bimestres.api';
import { notasApi } from '../../../lib/api/notas.api';
import { materialesApi } from '../../../lib/api/materiales.api';
import { actividadesApi } from '../../../lib/api/actividades.api';
import { getCourseColor, gradeToLiteral, literalColor } from '../../../lib/courseColors';
import { TIPOS_CON_ARCHIVO } from '../../../types/material';
import type { AsignacionDocente } from '../../../lib/api/alumnos.api';
import type { Bimestre } from '../../../lib/api/bimestres.api';
import type { Nota } from '../../../types/nota';
import type { Material } from '../../../types/material';
import type { Actividad, Entrega } from '../../../types/actividad';

// ── Types ──────────────────────────────────────────────────────────────────────

type Tab = 'materiales' | 'actividades';

interface UploadState {
  file:      File | null;
  status:    'idle' | 'selected' | 'uploading' | 'submitted' | 'error';
  errorMsg?: string;
  comentario?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function estaVencida(fechaLimite: string): boolean {
  return new Date() > new Date(fechaLimite);
}

function actividadActivaBimestre(bimestres: Bimestre[]): Bimestre | null {
  const abiertos = bimestres.filter(b => !b.cerrado);
  if (abiertos.length > 0) return abiertos.reduce((p, c) => c.numero < p.numero ? c : p);
  if (bimestres.length > 0) return bimestres.reduce((p, c) => c.numero < p.numero ? c : p);
  return null;
}

function materialIcon(tipo: Material['tipo']) {
  switch (tipo) {
    case 'PDF':    return <FileText className="size-5 text-red-600" />;
    case 'imagen': return <Image className="size-5 text-green-600" />;
    case 'enlace': return <ExternalLink className="size-5 text-blue-600" />;
    case 'video':  return <ExternalLink className="size-5 text-violet-600" />;
    default:       return <Paperclip className="size-5 text-slate-500" />;
  }
}

function materialIconBg(tipo: Material['tipo']): string {
  switch (tipo) {
    case 'PDF':    return 'bg-red-50';
    case 'imagen': return 'bg-green-50';
    case 'enlace': return 'bg-blue-50';
    case 'video':  return 'bg-violet-50';
    default:       return 'bg-slate-50';
  }
}

// ── Skeleton rows ──────────────────────────────────────────────────────────────

function MaterialSkeleton() {
  return (
    <div className="flex items-center gap-4 bg-white rounded-2xl border border-slate-200 p-4 animate-pulse">
      <div className="size-10 rounded-xl bg-slate-200 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-1/2 rounded bg-slate-200" />
        <div className="h-3 w-1/3 rounded bg-slate-200" />
      </div>
      <div className="h-7 w-24 rounded-lg bg-slate-200 shrink-0" />
    </div>
  );
}

function ActividadSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse space-y-3">
      <div className="flex gap-3">
        <div className="size-9 rounded-xl bg-slate-200 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/2 rounded bg-slate-200" />
          <div className="h-3 w-1/3 rounded bg-slate-200" />
        </div>
      </div>
      <div className="h-14 rounded-xl bg-slate-100" />
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AlumnoCursoDetalle() {
  const { id: cursoId } = useParams<{ id: string }>();
  const { session, loading: sessionLoading, error: sessionError } = useSession();

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>('materiales');

  // ── Loading / error ───────────────────────────────────────────────────────────
  const [loadingCurso,    setLoadingCurso]    = useState(true);
  const [loadingMats,     setLoadingMats]     = useState(true);
  const [loadingActs,     setLoadingActs]     = useState(true);
  const [loadingEntregas, setLoadingEntregas] = useState(false);
  const [error,           setError]           = useState<string | null>(null);

  // ── Data ──────────────────────────────────────────────────────────────────────
  const [asig,          setAsig]          = useState<AsignacionDocente | null>(null);
  const [cursoIndex,    setCursoIndex]    = useState(0);
  const [bimestreActivo, setBimestreActivo] = useState<Bimestre | null>(null);
  const [promedio,      setPromedio]      = useState<number | null>(null);
  const [materiales,    setMateriales]    = useState<Material[]>([]);
  const [actividades,   setActividades]   = useState<Actividad[]>([]);
  const [entregaMap,    setEntregaMap]    = useState<Record<string, Entrega | null>>({});
  const [uploadStates,  setUploadStates]  = useState<Record<string, UploadState>>({});

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // ── Data loading ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (sessionLoading || !session || !cursoId) return;

    const alumnoId = session.entidadId;
    let aborted = false;

    async function cargar() {
      try {
        setError(null);
        setLoadingCurso(true);

        // Phase 1: cursos del alumno + bimestres — parallel
        const [cursos, bimestres] = await Promise.all([
          alumnosApi.cursos(alumnoId).catch((): AsignacionDocente[] => []),
          bimestresApi.listar().catch((): Bimestre[] => []),
        ]);
        if (aborted) return;

        const foundAsig = cursos.find(a => a.curso_id === cursoId) ?? null;
        if (!foundAsig) {
          setLoadingCurso(false);
          setLoadingMats(false);
          setLoadingActs(false);
          setError('Curso no encontrado');
          return;
        }

        const idx = cursos.indexOf(foundAsig);
        const bim = actividadActivaBimestre(bimestres);

        setAsig(foundAsig);
        setCursoIndex(idx);
        if (bim) setBimestreActivo(bim);
        setLoadingCurso(false);

        // Phase 2: materiales + actividades + notas — parallel
        setLoadingMats(true);
        setLoadingActs(true);

        const [mats, acts, notasData] = await Promise.all([
          materialesApi.listar({ cursoId, seccionId: foundAsig.seccion_id, visible: true })
            .catch((): Material[] => []),
          actividadesApi.listar({ cursoId })
            .catch((): Actividad[] => []),
          (bim
            ? notasApi.listar({ alumnoId, bimestreId: bim.id })
            : Promise.resolve<Nota[]>([])
          ).catch((): Nota[] => []),
        ]);
        if (aborted) return;

        setMateriales(mats);
        setLoadingMats(false);

        const notasCurso = notasData.filter(
          n => n.competencia?.curso?.id === foundAsig.curso.id,
        );
        const vals = notasCurso.map(n => Number(n.nota_vigesimal));
        setPromedio(vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null);

        setActividades(acts);

        // Phase 3: entrega de cada actividad — parallel
        setLoadingEntregas(true);
        const newEntregaMap: Record<string, Entrega | null> = {};
        const initUpload: Record<string, UploadState> = {};

        await Promise.all(
          acts.map(async act => {
            try {
              const entregas = await actividadesApi.listarEntregas(act.id);
              const entrega = entregas.length > 0 ? entregas[0]! : null;
              newEntregaMap[act.id] = entrega;
              initUpload[act.id] = {
                file: null,
                status: entrega ? 'submitted' : 'idle',
              };
            } catch {
              newEntregaMap[act.id] = null;
              initUpload[act.id] = { file: null, status: 'idle' };
            }
          }),
        );
        if (aborted) return;

        setEntregaMap(newEntregaMap);
        setUploadStates(initUpload);
        setLoadingActs(false);
        setLoadingEntregas(false);

      } catch (err) {
        if (!aborted) {
          setError(err instanceof Error ? err.message : 'Error al cargar el curso.');
          setLoadingCurso(false);
          setLoadingMats(false);
          setLoadingActs(false);
        }
      }
    }

    cargar();
    return () => { aborted = true; };
  }, [session, sessionLoading, cursoId]);

  // ── Upload handlers ───────────────────────────────────────────────────────────

  function setUploadState(actId: string, next: UploadState) {
    setUploadStates(prev => ({ ...prev, [actId]: next }));
  }

  function getState(actId: string): UploadState {
    return uploadStates[actId] ?? { file: null, status: 'idle' };
  }

  function handleFileSelect(actId: string, files: FileList | null) {
    if (!files || files.length === 0) return;
    const st = getState(actId);
    setUploadState(actId, { file: files[0]!, status: 'selected', comentario: st.comentario });
  }

  function handleComentarioChange(actId: string, comentario: string) {
    const st = getState(actId);
    setUploadState(actId, { ...st, comentario });
  }

  async function handleSubmit(actividadId: string) {
    const st = getState(actividadId);
    if (!st.file) return;

    setUploadState(actividadId, { file: st.file, status: 'uploading', comentario: st.comentario });
    try {
      const entregaNueva = await actividadesApi.entregarConArchivo(actividadId, st.file, st.comentario);
      setEntregaMap(prev => ({ ...prev, [actividadId]: entregaNueva }));
      setUploadState(actividadId, { file: st.file, status: 'submitted', comentario: st.comentario });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al entregar. Intenta de nuevo.';
      setUploadState(actividadId, { file: st.file, status: 'error', errorMsg: msg, comentario: st.comentario });
    }
  }

  function handleReupload(actId: string) {
    setUploadState(actId, { file: null, status: 'idle' });
    const ref = fileInputRefs.current[actId];
    if (ref) ref.value = '';
  }

  function clearFile(actId: string) {
    setUploadState(actId, { file: null, status: 'idle' });
    const ref = fileInputRefs.current[actId];
    if (ref) ref.value = '';
  }

  async function handleAbrirMaterial(material: Material) {
    if (TIPOS_CON_ARCHIVO.includes(material.tipo)) {
      try {
        const { url } = await materialesApi.getArchivoUrl(material.id);
        window.open(url, '_blank', 'noopener');
      } catch { /* silently fail */ }
    } else {
      window.open(material.url, '_blank', 'noopener');
    }
  }

  async function handleAbrirAdjunto(actividadId: string) {
    try {
      const { url } = await actividadesApi.getAdjuntoUrl(actividadId);
      window.open(url, '_blank', 'noopener');
    } catch { /* silently fail */ }
  }

  // ── Error / session ───────────────────────────────────────────────────────────

  if (sessionError) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          Error de sesión: {sessionError}
        </p>
      </div>
    );
  }

  if (!loadingCurso && error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="size-10 text-slate-300" />
        <p className="text-slate-600">{error}</p>
        <Link to="/alumno/cursos" className="text-blue-600 text-sm hover:underline">
          ← Volver a mis cursos
        </Link>
      </div>
    );
  }

  // ── Derived ───────────────────────────────────────────────────────────────────

  const c    = getCourseColor(cursoIndex);
  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'materiales',  label: 'Materiales',  icon: FileText      },
    { id: 'actividades', label: 'Actividades', icon: ClipboardList },
  ];

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-8 space-y-6">

      {/* Breadcrumb */}
      <Link
        to="/alumno/cursos"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ChevronLeft className="size-4" /> Mis Cursos
      </Link>

      {/* Header */}
      {loadingCurso ? (
        <div className="h-32 rounded-2xl bg-slate-100 animate-pulse" />
      ) : asig && (
        <div className={`rounded-2xl ${c.bg} p-6 text-white`}>
          <div className="flex items-start gap-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-white/20">
              <BookOpen className="size-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-white">{asig.curso.nombre}</h1>
              <p className="text-sm text-white/80 mt-0.5">
                Prof. {asig.docente.nombres} {asig.docente.apellido_paterno}
              </p>
              <p className="text-xs text-white/60 mt-1.5">{asig.seccion.grado.nombre} "{asig.seccion.nombre}"</p>
            </div>
            <div className="hidden sm:flex flex-col items-end gap-1">
              <p className="text-xs text-white/60">
                Promedio {bimestreActivo?.nombre ?? 'Bimestre'}
              </p>
              <p className="text-3xl font-bold text-white leading-none">
                {promedio !== null ? promedio.toFixed(1) : '—'}
              </p>
              {promedio !== null && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-white/20 text-white border border-white/30">
                  {gradeToLiteral(promedio)}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Promedio — mobile */}
      {!loadingCurso && promedio !== null && (
        <div className="sm:hidden flex items-center gap-3 bg-white border border-slate-200 rounded-2xl p-4">
          <div className="flex-1">
            <p className="text-xs text-slate-500">
              Promedio {bimestreActivo?.nombre ?? 'Bimestre'}
            </p>
            <p className="text-2xl font-bold text-slate-900">{promedio.toFixed(1)}</p>
          </div>
          <span className={`text-sm font-bold px-3 py-1.5 rounded-xl border ${literalColor(gradeToLiteral(promedio))}`}>
            {gradeToLiteral(promedio)}
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto sm:inline-flex">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 sm:flex-none justify-center ${
              activeTab === tab.id
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon className="size-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Materiales ───────────────────────────────────────────────────────── */}
      {activeTab === 'materiales' && (
        <div className="space-y-3">
          {loadingMats ? (
            <>
              <MaterialSkeleton />
              <MaterialSkeleton />
              <MaterialSkeleton />
            </>
          ) : materiales.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <FileText className="size-10 text-slate-200 mb-3" />
              <p className="text-slate-500">No hay materiales publicados aún</p>
            </div>
          ) : materiales.map(mat => (
            <div
              key={mat.id}
              className="flex items-center gap-4 bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-sm transition-shadow"
            >
              <div className={`flex size-10 items-center justify-center rounded-xl shrink-0 ${materialIconBg(mat.tipo)}`}>
                {materialIcon(mat.tipo)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{mat.titulo}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Publicado el {formatFecha(mat.fecha_publicacion)}
                </p>
              </div>
              <button
                onClick={() => handleAbrirMaterial(mat)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                  TIPOS_CON_ARCHIVO.includes(mat.tipo)
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    : 'bg-blue-50 hover:bg-blue-100 text-blue-700'
                }`}
              >
                {TIPOS_CON_ARCHIVO.includes(mat.tipo)
                  ? <><Download className="size-3.5" /> Descargar</>
                  : <><ExternalLink className="size-3.5" /> Abrir enlace</>
                }
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Actividades ──────────────────────────────────────────────────────── */}
      {activeTab === 'actividades' && (
        <div className="space-y-3">
          {loadingActs ? (
            <>
              <ActividadSkeleton />
              <ActividadSkeleton />
            </>
          ) : actividades.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <ClipboardList className="size-10 text-slate-200 mb-3" />
              <p className="text-slate-500">No hay actividades publicadas aún</p>
            </div>
          ) : actividades.map(act => {
            const st          = getState(act.id);
            const entrega     = entregaMap[act.id] ?? null;
            const isCalificado = entrega?.estado === 'calificado';
            const esEvaluacion = act.tipo === 'evaluacion';
            const vencida      = estaVencida(act.fecha_limite);

            const displayStatus =
              isCalificado                                    ? 'calificado'
              : (entrega !== null || st.status === 'submitted') ? 'entregado'
              : 'pendiente';

            const showUploadArea = !isCalificado;

            return (
              <div
                key={act.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-sm transition-shadow"
              >
                {/* Activity header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`flex size-9 items-center justify-center rounded-xl shrink-0 mt-0.5 ${
                      esEvaluacion
                        ? 'bg-red-50 border border-red-200'
                        : 'bg-indigo-50 border border-indigo-100'
                    }`}>
                      {esEvaluacion
                        ? <GraduationCap className="size-4 text-red-600" />
                        : <ClipboardList className="size-4 text-indigo-500" />
                      }
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-slate-800">{act.titulo}</h3>

                        {/* Adjunto del docente */}
                        {act.url_adjunto && (
                          <button
                            onClick={() => handleAbrirAdjunto(act.id)}
                            className="flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                          >
                            <Paperclip className="size-3" /> Ver adjunto
                          </button>
                        )}

                        {/* Estado badge */}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                          displayStatus === 'pendiente'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : displayStatus === 'entregado'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {displayStatus === 'pendiente'
                            ? <><Clock className="size-3" /> Pendiente</>
                            : displayStatus === 'entregado'
                              ? <><CheckCircle2 className="size-3" /> Entregado</>
                              : <><CheckCircle2 className="size-3" /> Calificado</>
                          }
                        </span>

                        {esEvaluacion && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                            <GraduationCap className="size-3" /> Evaluación
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 mt-1">
                        Fecha límite:{' '}
                        <span className={`font-medium ${vencida && displayStatus === 'pendiente' ? 'text-red-600' : ''}`}>
                          {formatFecha(act.fecha_limite)}
                        </span>
                        {' · '}Puntaje máx: {act.puntaje_maximo} pts
                      </p>
                    </div>
                  </div>

                  {/* Grade (calificado) */}
                  {isCalificado && entrega?.nota !== null && entrega?.nota !== undefined && (
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-bold text-slate-800">{entrega.nota}</p>
                      <p className="text-xs text-slate-400">/{act.puntaje_maximo}</p>
                    </div>
                  )}
                </div>

                {/* Description */}
                {act.descripcion && (
                  <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-3 mb-4">
                    {act.descripcion}
                  </p>
                )}

                {/* Upload / status area */}
                {showUploadArea && (
                  <div className="space-y-3">
                    <input
                      ref={el => { fileInputRefs.current[act.id] = el; }}
                      type="file"
                      accept=".pdf,.docx,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      className="hidden"
                      onChange={e => handleFileSelect(act.id, e.target.files)}
                    />

                    {/* Fecha vencida — no upload */}
                    {vencida && displayStatus === 'pendiente' ? (
                      <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <Clock className="size-4 text-slate-400 shrink-0" />
                        <p className="text-sm text-slate-500">
                          Fecha límite vencida — no se aceptan más entregas
                        </p>
                      </div>

                    ) : st.status === 'submitted' ? (
                      /* Submitted banner */
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <CheckCircle2 className="size-4 text-blue-500 shrink-0" />
                          <p className="text-sm text-blue-700 font-medium truncate">
                            {st.file ? st.file.name : 'Tu entrega fue recibida.'}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          {entrega?.url_archivo && (
                            <button
                              onClick={async () => {
                                try {
                                  const { url } = await actividadesApi.getEntregaArchivoUrl(act.id, entrega.id);
                                  window.open(url, '_blank');
                                } catch {}
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-blue-100 border border-blue-300 text-blue-700 rounded-lg text-xs font-medium transition-colors"
                            >
                              <Download className="size-3.5" /> Ver archivo
                            </button>
                          )}
                          {!vencida && (
                            <button
                              onClick={() => handleReupload(act.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-blue-100 border border-blue-300 text-blue-700 rounded-lg text-xs font-medium transition-colors"
                            >
                              <RefreshCw className="size-3.5" /> Volver a entregar
                            </button>
                          )}
                        </div>
                      </div>

                    ) : st.status === 'uploading' ? (
                      <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
                        <svg className="animate-spin size-4 text-blue-600 shrink-0" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <p className="text-sm text-blue-700">Enviando archivo…</p>
                      </div>

                    ) : st.status === 'error' ? (
                      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="size-4 text-red-500 shrink-0" />
                          <p className="text-sm text-red-700">
                            {st.errorMsg ?? 'Error al entregar. Intenta de nuevo.'}
                          </p>
                        </div>
                        <button
                          onClick={() => clearFile(act.id)}
                          className="text-xs text-red-600 hover:underline shrink-0"
                        >
                          Reintentar
                        </button>
                      </div>

                    ) : st.status === 'selected' && st.file ? (
                      <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <Paperclip className="size-4 text-slate-500 shrink-0" />
                        <p className="text-sm text-slate-700 flex-1 truncate font-medium">
                          {st.file.name}
                        </p>
                        <span className="text-xs text-slate-400 shrink-0">
                          {(st.file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                        <button
                          onClick={() => clearFile(act.id)}
                          className="p-1 rounded-lg hover:bg-slate-200 transition-colors shrink-0"
                        >
                          <X className="size-3.5 text-slate-500" />
                        </button>
                      </div>

                    ) : (
                      /* Drop zone (idle) */
                      <button
                        onClick={() => fileInputRefs.current[act.id]?.click()}
                        className="w-full border-2 border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 rounded-xl p-5 text-center transition-colors group"
                      >
                        <Upload className="size-6 text-slate-300 group-hover:text-blue-400 mx-auto mb-2 transition-colors" />
                        <p className="text-sm text-slate-500 group-hover:text-blue-600 transition-colors">
                          Haz clic para seleccionar tu archivo
                        </p>
                        <p className="text-xs text-slate-400 mt-1">PDF · DOCX · XLSX · Máx. 10 MB</p>
                      </button>
                    )}

                    {/* Comentario opcional */}
                    {st.status === 'selected' && st.file && (
                      <textarea
                        value={st.comentario ?? ''}
                        onChange={e => handleComentarioChange(act.id, e.target.value)}
                        placeholder="Agrega un comentario para tu docente (opcional)"
                        maxLength={500}
                        rows={2}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                    )}

                    {/* Submit button */}
                    {st.status === 'selected' && st.file && (
                      <button
                        onClick={() => handleSubmit(act.id)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                      >
                        <Upload className="size-4" /> Entregar actividad
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
