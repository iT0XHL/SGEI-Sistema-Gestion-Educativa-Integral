import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Layers, GraduationCap, BookOpen, Users2, PlusCircle, Pencil, Trash2,
  X, Loader2, AlertTriangle, ChevronRight, Sparkles, School, CheckCircle2, UserCircle2,
} from 'lucide-react';
import {
  estructuraApi, periodosApi, docentesAdminApi,
  type NivelDTO, type GradoDTO, type CursoDTO, type SeccionDTO, type PeriodoDTO, type DocenteDTO,
} from '../../../lib/api/admin.api';

// ── Tipos de formulario ──────────────────────────────────────────
type Modal =
  | { kind: 'nivel'; mode: 'create' | 'edit'; data?: NivelDTO }
  | { kind: 'grado'; mode: 'create' | 'edit'; data?: GradoDTO }
  | { kind: 'curso'; mode: 'create' | 'edit'; data?: CursoDTO }
  | { kind: 'seccion'; mode: 'create' | 'edit'; data?: SeccionDTO }
  | null;

interface ConfirmState { title: string; message: string; onConfirm: () => Promise<void> }

const input = 'w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400';
const label = 'block text-xs font-medium text-slate-600 mb-1.5';

export default function AdminEstructura() {
  const [niveles, setNiveles]   = useState<NivelDTO[]>([]);
  const [nivelId, setNivelId]   = useState('');
  const [grados, setGrados]     = useState<GradoDTO[]>([]);
  const [gradoId, setGradoId]   = useState('');
  const [cursosNivel, setCursosNivel] = useState<CursoDTO[]>([]);
  const [cursosGrado, setCursosGrado] = useState<CursoDTO[]>([]);
  const [secciones, setSecciones]     = useState<SeccionDTO[]>([]);
  const [periodo, setPeriodo]   = useState<PeriodoDTO | null>(null);
  const [docentes, setDocentes] = useState<DocenteDTO[]>([]);

  const [loading, setLoading]   = useState(true);
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState('');
  const [toast, setToast]       = useState('');

  const [modal, setModal]       = useState<Modal>(null);
  const [confirm, setConfirm]   = useState<ConfirmState | null>(null);

  const nivelActual = useMemo(() => niveles.find(n => n.id === nivelId) ?? null, [niveles, nivelId]);
  const gradoActual = useMemo(() => grados.find(g => g.id === gradoId) ?? null, [grados, gradoId]);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  }, []);

  // ── Cargas ──────────────────────────────────────────────────
  useEffect(() => { void init(); }, []);

  async function init() {
    try {
      setLoading(true);
      setError('');
      const [nivs, pers, docs] = await Promise.all([
        estructuraApi.niveles(),
        periodosApi.listar({ activo: true, limit: 1 }),
        docentesAdminApi.listar({ activo: 'true', limit: 200 }),
      ]);
      setNiveles(nivs);
      setPeriodo(pers.items[0] ?? null);
      setDocentes(docs.items);
      if (nivs.length > 0) setNivelId(nivs[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando la estructura académica');
    } finally {
      setLoading(false);
    }
  }

  const loadNiveles = useCallback(async () => {
    setNiveles(await estructuraApi.niveles());
  }, []);

  const loadNivelData = useCallback(async (nid: string) => {
    if (!nid) { setGrados([]); setCursosNivel([]); return; }
    const [g, c] = await Promise.all([estructuraApi.grados(nid), estructuraApi.cursos(nid)]);
    setGrados(g);
    setCursosNivel(c);
  }, []);

  const loadGradoData = useCallback(async (gid: string) => {
    if (!gid) { setCursosGrado([]); setSecciones([]); return; }
    const [cg, secs] = await Promise.all([
      estructuraApi.cursosDeGrado(gid),
      estructuraApi.secciones({ gradoId: gid, periodoId: periodo?.id }),
    ]);
    setCursosGrado(cg);
    setSecciones(secs);
  }, [periodo?.id]);

  useEffect(() => { setGradoId(''); void loadNivelData(nivelId); }, [nivelId, loadNivelData]);
  useEffect(() => { void loadGradoData(gradoId); }, [gradoId, loadGradoData]);

  // ── Helper de acciones con manejo de error/toast ────────────
  async function run(fn: () => Promise<void>, okMsg?: string) {
    try {
      setBusy(true);
      setError('');
      await fn();
      if (okMsg) flash(okMsg);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ocurrió un error');
    } finally {
      setBusy(false);
    }
  }

  // ── Cursos del nivel disponibles para asignar al grado ──────
  const cursosDisponibles = useMemo(() => {
    const asignados = new Set(cursosGrado.map(c => c.id));
    return cursosNivel.filter(c => !asignados.has(c.id));
  }, [cursosNivel, cursosGrado]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500 mb-1">Panel de administración</p>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Layers className="size-6 text-slate-700" /> Estructura Académica
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gestiona niveles, grados, secciones y cursos. Los grados heredan los cursos de su nivel.
          </p>
        </div>
        <button
          onClick={() => setModal({ kind: 'nivel', mode: 'create' })}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm shrink-0"
        >
          <PlusCircle className="size-4" /> Nuevo nivel
        </button>
      </div>

      {/* Toast / Error */}
      {toast && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-sm text-emerald-800">
          <CheckCircle2 className="size-4 shrink-0" /> {toast}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle className="size-5 text-red-600 shrink-0" />
          <p className="text-sm font-medium text-red-800 flex-1">{error}</p>
          <button onClick={() => setError('')} className="p-1 rounded-lg hover:bg-red-100">
            <X className="size-4 text-red-500" />
          </button>
        </div>
      )}

      {/* Selector de nivel (pills) */}
      <div className="flex flex-wrap items-center gap-2">
        {niveles.map(n => {
          const active = n.id === nivelId;
          return (
            <button
              key={n.id}
              onClick={() => setNivelId(n.id)}
              className={`group flex items-center gap-2 px-4 py-2 rounded-2xl border text-sm font-medium transition-colors ${
                active
                  ? 'bg-slate-800 border-slate-800 text-white shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <School className="size-4" />
              {n.nombre}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                {n._count?.grados ?? 0}g · {n._count?.cursos ?? 0}c
              </span>
            </button>
          );
        })}
        {niveles.length === 0 && (
          <p className="text-sm text-slate-400">No hay niveles. Crea el primero con «Nuevo nivel».</p>
        )}
      </div>

      {nivelActual && (
        <>
          {/* Acciones del nivel + catálogo de cursos */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BookOpen className="size-4 text-slate-500" />
                <h2 className="text-sm font-semibold text-slate-700">
                  Cursos del nivel «{nivelActual.nombre}»
                </h2>
                <span className="text-xs text-slate-400">({cursosNivel.length})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setModal({ kind: 'curso', mode: 'create' })}
                  className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700">
                  <PlusCircle className="size-3.5" /> Curso
                </button>
                <button onClick={() => setModal({ kind: 'nivel', mode: 'edit', data: nivelActual })}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" title="Editar nivel">
                  <Pencil className="size-3.5" />
                </button>
                <button
                  onClick={() => setConfirm({
                    title: 'Eliminar nivel',
                    message: `Se eliminará el nivel «${nivelActual.nombre}». Solo es posible si no tiene grados ni cursos.`,
                    onConfirm: () => run(async () => {
                      await estructuraApi.eliminarNivel(nivelActual.id);
                      await loadNiveles();
                      setNivelId(niveles.find(n => n.id !== nivelActual.id)?.id ?? '');
                    }, 'Nivel eliminado'),
                  })}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Eliminar nivel">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
            {cursosNivel.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-400 text-center">
                Aún no hay cursos en este nivel. Agrégalos con «Curso».
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 p-4">
                {cursosNivel.map(c => (
                  <div key={c.id} className="group flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-sm">
                    <span className="font-medium text-slate-700">{c.nombre}</span>
                    {c.horas_semanales != null && (
                      <span className="text-xs text-slate-400">{c.horas_semanales}h</span>
                    )}
                    <button onClick={() => setModal({ kind: 'curso', mode: 'edit', data: c })}
                      className="p-1 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-600">
                      <Pencil className="size-3" />
                    </button>
                    <button
                      onClick={() => setConfirm({
                        title: 'Eliminar curso',
                        message: `Se eliminará «${c.nombre}» del catálogo. No es posible si tiene asignaciones o competencias.`,
                        onConfirm: () => run(async () => {
                          await estructuraApi.eliminarCurso(c.id);
                          await Promise.all([loadNivelData(nivelId), loadGradoData(gradoId)]);
                          await loadNiveles();
                        }, 'Curso eliminado'),
                      })}
                      className="p-1 rounded-md hover:bg-red-100 text-red-400 hover:text-red-600">
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Grados + detalle */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Columna grados */}
            <div className="lg:col-span-1 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <GraduationCap className="size-4 text-slate-500" /> Grados
                </h2>
                <button onClick={() => setModal({ kind: 'grado', mode: 'create' })}
                  className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700">
                  <PlusCircle className="size-3.5" /> Grado
                </button>
              </div>
              {grados.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-200 py-10 text-center">
                  <GraduationCap className="size-9 text-slate-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">No hay grados en este nivel</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {grados.map(g => {
                    const active = g.id === gradoId;
                    return (
                      <div key={g.id}
                        onClick={() => setGradoId(g.id)}
                        className={`cursor-pointer rounded-2xl border p-3.5 transition-colors ${
                          active ? 'border-slate-800 bg-slate-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="flex size-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 text-xs font-bold shrink-0">
                              {g.orden}
                            </span>
                            <span className="font-semibold text-slate-800 text-sm truncate">{g.nombre}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={(e) => { e.stopPropagation(); setModal({ kind: 'grado', mode: 'edit', data: g }); }}
                              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500">
                              <Pencil className="size-3.5" />
                            </button>
                            <button onClick={(e) => {
                              e.stopPropagation();
                              setConfirm({
                                title: 'Eliminar grado',
                                message: `Se eliminará «${g.nombre}» y sus cursos asignados. No es posible si tiene secciones.`,
                                onConfirm: () => run(async () => {
                                  await estructuraApi.eliminarGrado(g.id);
                                  if (gradoId === g.id) setGradoId('');
                                  await loadNivelData(nivelId);
                                }, 'Grado eliminado'),
                              });
                            }}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                              <Trash2 className="size-3.5" />
                            </button>
                            <ChevronRight className={`size-4 ${active ? 'text-slate-700' : 'text-slate-300'}`} />
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-2 pl-9 text-xs text-slate-400">
                          <span className="flex items-center gap-1"><Users2 className="size-3" /> {g._count?.secciones ?? 0} secciones</span>
                          <span className="flex items-center gap-1"><BookOpen className="size-3" /> {g._count?.cursos ?? 0} cursos</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Columna detalle del grado */}
            <div className="lg:col-span-2">
              {!gradoActual ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-200 h-full min-h-[240px] flex flex-col items-center justify-center text-center p-8">
                  <ChevronRight className="size-9 text-slate-200 mb-2" />
                  <p className="text-sm text-slate-400">Selecciona un grado para ver y editar sus cursos y secciones</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Cursos del grado */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-b border-slate-100">
                      <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <BookOpen className="size-4 text-slate-500" /> Cursos de «{gradoActual.nombre}»
                        <span className="text-xs text-slate-400">({cursosGrado.length})</span>
                      </h3>
                      <button
                        onClick={() => setConfirm({
                          title: 'Aplicar cursos del nivel',
                          message: `Se añadirán al grado todos los cursos del nivel «${nivelActual.nombre}» que aún no tenga.`,
                          onConfirm: () => run(async () => {
                            const cg = await estructuraApi.aplicarCursosPredeterminados(gradoActual.id);
                            setCursosGrado(cg);
                            await loadNivelData(nivelId);
                          }, 'Cursos del nivel aplicados'),
                        })}
                        className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700">
                        <Sparkles className="size-3.5" /> Aplicar cursos del nivel
                      </button>
                    </div>

                    {/* Añadir curso disponible */}
                    {cursosDisponibles.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 px-5 py-3 bg-slate-50/60 border-b border-slate-100">
                        <span className="text-xs text-slate-500">Añadir:</span>
                        {cursosDisponibles.map(c => (
                          <button key={c.id} disabled={busy}
                            onClick={() => run(async () => {
                              const cg = await estructuraApi.asignarCursoAGrado(gradoActual.id, c.id);
                              setCursosGrado(cg);
                              await loadNivelData(nivelId);
                            }, 'Curso añadido al grado')}
                            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-dashed border-slate-300 text-slate-600 hover:bg-white hover:border-slate-400 disabled:opacity-50">
                            <PlusCircle className="size-3" /> {c.nombre}
                          </button>
                        ))}
                      </div>
                    )}

                    {cursosGrado.length === 0 ? (
                      <p className="px-5 py-8 text-sm text-slate-400 text-center">
                        Este grado no tiene cursos. Usa «Aplicar cursos del nivel» o añádelos arriba.
                      </p>
                    ) : (
                      <ul className="divide-y divide-slate-50">
                        {cursosGrado.map(c => (
                          <li key={c.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="flex size-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 shrink-0">
                                <BookOpen className="size-4" />
                              </span>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-800 truncate">{c.nombre}</p>
                                {c.horas_semanales != null && (
                                  <p className="text-xs text-slate-400">{c.horas_semanales} h/semana</p>
                                )}
                              </div>
                            </div>
                            <button disabled={busy}
                              onClick={() => run(async () => {
                                const cg = await estructuraApi.quitarCursoDeGrado(gradoActual.id, c.id);
                                setCursosGrado(cg);
                                await loadNivelData(nivelId);
                              }, 'Curso quitado del grado')}
                              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50">
                              <X className="size-3.5" /> Quitar
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Secciones del grado */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-b border-slate-100">
                      <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Users2 className="size-4 text-slate-500" /> Secciones de «{gradoActual.nombre}»
                        <span className="text-xs text-slate-400">({secciones.length})</span>
                      </h3>
                      <button
                        disabled={!periodo}
                        onClick={() => setModal({ kind: 'seccion', mode: 'create' })}
                        className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50"
                        title={periodo ? '' : 'Requiere un período académico activo'}>
                        <PlusCircle className="size-3.5" /> Sección
                      </button>
                    </div>
                    {!periodo && (
                      <p className="px-5 py-2.5 text-xs text-amber-700 bg-amber-50 border-b border-amber-100">
                        No hay un período académico activo; las secciones se crean dentro de un período.
                      </p>
                    )}
                    <p className="px-5 pt-3 text-xs text-slate-400">
                      Cada sección hereda los <strong>{cursosGrado.length}</strong> cursos del grado.
                    </p>
                    {secciones.length === 0 ? (
                      <p className="px-5 py-6 text-sm text-slate-400 text-center">Sin secciones en el período actual.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
                        {secciones.map(s => (
                          <div key={s.id} className="rounded-xl border border-slate-200 p-3.5">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <span className="flex size-8 items-center justify-center rounded-lg bg-slate-800 text-white text-sm font-bold">
                                  {s.nombre}
                                </span>
                                <div>
                                  <p className="text-sm font-semibold text-slate-800">Sección {s.nombre}</p>
                                  <p className="text-xs text-slate-400">{s.turno} · cupo {s.cupo_maximo}{s.aula ? ` · aula ${s.aula}` : ''}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <button onClick={() => setModal({ kind: 'seccion', mode: 'edit', data: s })}
                                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
                                  <Pencil className="size-3.5" />
                                </button>
                                <button onClick={() => setConfirm({
                                  title: 'Eliminar sección',
                                  message: `Se eliminará la sección «${s.nombre}». No es posible si tiene alumnos o asignaciones.`,
                                  onConfirm: () => run(async () => {
                                    await estructuraApi.eliminarSeccion(s.id);
                                    await Promise.all([loadGradoData(gradoId), loadNivelData(nivelId)]);
                                  }, 'Sección eliminada'),
                                })}
                                  className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                                  <Trash2 className="size-3.5" />
                                </button>
                              </div>
                            </div>
                            <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                              <Users2 className="size-3" /> {s._count?.alumnos ?? 0} alumnos · <BookOpen className="size-3" /> {cursosGrado.length} cursos
                            </div>
                            <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                              <UserCircle2 className="size-3.5 text-slate-400 shrink-0" />
                              {s.docente_tutor ? (
                                <span className="font-medium text-slate-600 truncate">
                                  Tutor: {s.docente_tutor.apellido_paterno} {s.docente_tutor.nombres}
                                </span>
                              ) : (
                                <span className="text-amber-600">Sin tutor asignado</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Modales de formulario ── */}
      {modal && (
        <FormModal
          modal={modal}
          niveles={niveles}
          nivelId={nivelId}
          gradoId={gradoId}
          periodoId={periodo?.id ?? ''}
          grados={grados}
          docentes={docentes}
          busy={busy}
          onClose={() => setModal(null)}
          onSubmit={async (payload) => {
            await run(async () => {
              await submitModal(modal, payload);
              await loadNiveles();
              await loadNivelData(nivelId);
              if (gradoId) await loadGradoData(gradoId);
            }, 'Cambios guardados');
            setModal(null);
          }}
        />
      )}

      {/* ── Confirmación ── */}
      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          busy={busy}
          onCancel={() => setConfirm(null)}
          onConfirm={async () => { await confirm.onConfirm(); setConfirm(null); }}
        />
      )}
    </div>
  );

  // ── Envío de modales ────────────────────────────────────────
  async function submitModal(m: Modal, p: Record<string, unknown>) {
    if (!m) return;
    if (m.kind === 'nivel') {
      if (m.mode === 'create') await estructuraApi.crearNivel({ nombre: p.nombre as string, descripcion: (p.descripcion as string) || null });
      else await estructuraApi.actualizarNivel(m.data!.id, { nombre: p.nombre as string, descripcion: (p.descripcion as string) || null });
    } else if (m.kind === 'grado') {
      if (m.mode === 'create') await estructuraApi.crearGrado({ nivel_id: nivelId, nombre: p.nombre as string, orden: Number(p.orden) });
      else await estructuraApi.actualizarGrado(m.data!.id, { nombre: p.nombre as string, orden: Number(p.orden) });
    } else if (m.kind === 'curso') {
      if (m.mode === 'create') await estructuraApi.crearCurso({ nivel_id: nivelId, nombre: p.nombre as string, horas_semanales: p.horas ? Number(p.horas) : null, codigo_cneb: (p.codigo as string) || null });
      else await estructuraApi.actualizarCurso(m.data!.id, { nombre: p.nombre as string, horas_semanales: p.horas ? Number(p.horas) : null, codigo_cneb: (p.codigo as string) || null });
    } else if (m.kind === 'seccion') {
      const tutor = (p.tutor as string) || null;
      if (m.mode === 'create') await estructuraApi.crearSeccion({ grado_id: gradoId, periodo_id: periodo!.id, nombre: p.nombre as string, turno: p.turno as 'Mañana' | 'Tarde' | 'Noche', cupo_maximo: Number(p.cupo), aula: (p.aula as string) || null, docente_tutor_id: tutor });
      else await estructuraApi.actualizarSeccion(m.data!.id, { nombre: p.nombre as string, turno: p.turno as 'Mañana' | 'Tarde' | 'Noche', cupo_maximo: Number(p.cupo), aula: (p.aula as string) || null, docente_tutor_id: tutor });
    }
  }
}

// ── Modal de formulario reutilizable ──────────────────────────────
function FormModal(props: {
  modal: NonNullable<Modal>;
  niveles: NivelDTO[];
  nivelId: string;
  gradoId: string;
  periodoId: string;
  grados: GradoDTO[];
  docentes: DocenteDTO[];
  busy: boolean;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const { modal, grados, docentes, busy, onClose, onSubmit } = props;
  const d = modal.data as Record<string, unknown> | undefined;

  const [form, setForm] = useState<Record<string, string>>((): Record<string, string> => {
    if (modal.kind === 'nivel')  return { nombre: (d?.nombre as string) ?? '', descripcion: (d?.descripcion as string) ?? '' };
    if (modal.kind === 'grado')  return { nombre: (d?.nombre as string) ?? '', orden: d?.orden != null ? String(d.orden) : String(grados.length + 1) };
    if (modal.kind === 'curso')  return { nombre: (d?.nombre as string) ?? '', horas: d?.horas_semanales != null ? String(d.horas_semanales) : '', codigo: (d?.codigo_cneb as string) ?? '' };
    return { nombre: (d?.nombre as string) ?? '', turno: (d?.turno as string) ?? 'Mañana', cupo: d?.cupo_maximo != null ? String(d.cupo_maximo) : '30', aula: (d?.aula as string) ?? '', tutor: (d?.docente_tutor_id as string) ?? '' };
  });
  const [err, setErr] = useState('');

  const titles: Record<string, string> = {
    nivel: 'nivel', grado: 'grado', curso: 'curso', seccion: 'sección',
  };
  const title = `${modal.mode === 'create' ? 'Nuevo' : 'Editar'} ${titles[modal.kind]}`;

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (!form.nombre.trim()) { setErr('El nombre es obligatorio.'); return; }
    if (modal.kind === 'nivel' && form.nombre.trim().length < 3) { setErr('El nombre del nivel requiere al menos 3 caracteres.'); return; }
    await onSubmit(form);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-800 capitalize">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100">
            <X className="size-4 text-slate-500" />
          </button>
        </div>
        <form onSubmit={handle} className="p-6 space-y-4">
          {err && <p className="text-xs text-red-500">{err}</p>}

          <div>
            <label className={label}>Nombre <span className="text-red-500">*</span></label>
            <input className={input} value={form.nombre} maxLength={modal.kind === 'seccion' ? 5 : 120}
              placeholder={modal.kind === 'nivel' ? 'Ej. Primaria' : modal.kind === 'grado' ? 'Ej. 1° Primaria' : modal.kind === 'curso' ? 'Ej. Matemática' : 'Ej. A'}
              onChange={e => set('nombre', e.target.value)} autoFocus />
          </div>

          {modal.kind === 'nivel' && (
            <div>
              <label className={label}>Descripción <span className="text-slate-400">(opcional)</span></label>
              <textarea className={`${input} resize-none`} rows={2} maxLength={255} value={form.descripcion}
                onChange={e => set('descripcion', e.target.value)} />
            </div>
          )}

          {modal.kind === 'grado' && (
            <div>
              <label className={label}>Orden <span className="text-red-500">*</span></label>
              <input type="number" min={1} className={input} value={form.orden}
                onChange={e => set('orden', e.target.value)} />
              <p className="text-xs text-slate-400 mt-1">Posición del grado dentro del nivel (1, 2, 3…).</p>
            </div>
          )}

          {modal.kind === 'curso' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Horas/semana</label>
                <input type="number" min={1} className={input} value={form.horas}
                  onChange={e => set('horas', e.target.value)} placeholder="Ej. 5" />
              </div>
              <div>
                <label className={label}>Código CNEB</label>
                <input className={input} value={form.codigo} maxLength={20}
                  onChange={e => set('codigo', e.target.value)} placeholder="opcional" />
              </div>
            </div>
          )}

          {modal.kind === 'seccion' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Turno</label>
                <select className={input} value={form.turno} onChange={e => set('turno', e.target.value)}>
                  <option>Mañana</option><option>Tarde</option><option>Noche</option>
                </select>
              </div>
              <div>
                <label className={label}>Cupo máximo</label>
                <input type="number" min={1} max={45} className={input} value={form.cupo}
                  onChange={e => set('cupo', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className={label}>Aula <span className="text-slate-400">(opcional)</span></label>
                <input className={input} value={form.aula} maxLength={20}
                  onChange={e => set('aula', e.target.value)} placeholder="Ej. A-101" />
              </div>
              <div className="col-span-2">
                <label className={label}>Docente tutor</label>
                <select className={input} value={form.tutor} onChange={e => set('tutor', e.target.value)}>
                  <option value="">— Sin tutor asignado —</option>
                  {docentes.map(doc => (
                    <option key={doc.id} value={doc.id}>
                      {doc.apellido_paterno} {doc.apellido_materno}, {doc.nombres} · {doc.especialidad}
                    </option>
                  ))}
                </select>
                {docentes.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">No hay docentes registrados todavía.</p>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={busy}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" disabled={busy}
              className="flex-1 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {busy && <Loader2 className="size-4 animate-spin" />}
              {modal.mode === 'create' ? 'Crear' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Diálogo de confirmación ───────────────────────────────────────
function ConfirmDialog(props: {
  title: string; message: string; busy: boolean;
  onCancel: () => void; onConfirm: () => Promise<void>;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-red-50 shrink-0">
            <AlertTriangle className="size-5 text-red-600" />
          </span>
          <div>
            <h3 className="text-base font-semibold text-slate-800">{props.title}</h3>
            <p className="text-sm text-slate-500 mt-1">{props.message}</p>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={props.onCancel} disabled={props.busy}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={props.onConfirm} disabled={props.busy}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
            {props.busy && <Loader2 className="size-4 animate-spin" />}
            Sí, eliminar
          </button>
        </div>
      </div>
    </div>
  );
}
