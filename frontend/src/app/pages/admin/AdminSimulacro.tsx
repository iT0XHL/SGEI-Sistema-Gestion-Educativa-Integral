import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileQuestion, PlusCircle, Play, Square, Loader2, AlertTriangle, CheckCircle2,
  X, ChevronDown, Save, Filter, ListChecks, GripVertical, FileText, KeyRound,
} from 'lucide-react';
import { estructuraApi, type NivelDTO, type GradoDTO } from '../../../lib/api/admin.api';
import { bimestresApi, type Bimestre } from '../../../lib/api/bimestres.api';
import {
  simulacrosAdminApi, examenPdfUrl,
  type SimulacroDTO, type PreguntaDTO, type ExamenCursoDTO,
} from '../../../lib/api/simulacros.api';

interface Seleccion { orden: number; ids: string[] }

const selectCls = 'w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-50';
const input = 'w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400';

const ESTADO_BADGE: Record<string, string> = {
  Borrador:  'bg-slate-100 text-slate-600 border-slate-200',
  Activo:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  Concluido: 'bg-amber-50 text-amber-700 border-amber-200',
};

export default function AdminSimulacro() {
  const [simulacros, setSimulacros] = useState<SimulacroDTO[]>([]);
  const [simId, setSimId]   = useState('');
  const [niveles, setNiveles] = useState<NivelDTO[]>([]);
  const [grados, setGrados]   = useState<GradoDTO[]>([]);
  const [bimestres, setBimestres] = useState<Bimestre[]>([]);
  const [nivelId, setNivelId] = useState('');
  const [gradoId, setGradoId] = useState('');

  const [bank, setBank]       = useState<PreguntaDTO[]>([]);
  const [sel, setSel]         = useState<Record<string, Seleccion>>({});
  const [tieneExamen, setTieneExamen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState('');
  const [toast, setToast]     = useState('');
  const [modal, setModal]     = useState(false);

  const flash = useCallback((m: string) => { setToast(m); setTimeout(() => setToast(''), 3000); }, []);
  const sim = useMemo(() => simulacros.find(s => s.id === simId) ?? null, [simulacros, simId]);

  useEffect(() => { void init(); }, []);
  async function init() {
    try {
      setLoading(true); setError('');
      const [sims, nivs, bims] = await Promise.all([
        simulacrosAdminApi.listar(),
        estructuraApi.niveles(),
        bimestresApi.listar(),
      ]);
      setSimulacros(sims);
      setNiveles(nivs);
      setBimestres(bims);
      const activo = sims.find(s => s.estado === 'Activo') ?? sims[0];
      if (activo) setSimId(activo.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando simulacros');
    } finally { setLoading(false); }
  }

  const reloadSims = useCallback(async () => setSimulacros(await simulacrosAdminApi.listar()), []);

  // Grados del nivel
  useEffect(() => {
    setGradoId('');
    if (!nivelId) { setGrados([]); return; }
    estructuraApi.grados(nivelId).then(setGrados).catch(() => setGrados([]));
  }, [nivelId]);

  // Banco + examen existente al elegir simulacro + grado
  useEffect(() => {
    if (!simId || !gradoId) { setBank([]); setSel({}); return; }
    let cancel = false;
    (async () => {
      try {
        setBusy(true); setError('');
        const [preguntas, examen] = await Promise.all([
          simulacrosAdminApi.curaduria(simId, { gradoId }),
          simulacrosAdminApi.getExamen(simId, gradoId),
        ]);
        if (cancel) return;
        setBank(preguntas);
        setTieneExamen(examen.length > 0);
        // Prefijar selección con el examen ya armado
        const inicial: Record<string, Seleccion> = {};
        examen.forEach((ex: ExamenCursoDTO) => {
          inicial[ex.curso_id] = {
            orden: ex.orden,
            ids: ex.preguntas.map(p => p.pregunta_id).filter((id): id is string => Boolean(id)),
          };
        });
        setSel(inicial);
      } catch (e) {
        if (!cancel) setError(e instanceof Error ? e.message : 'Error cargando el banco de preguntas');
      } finally {
        if (!cancel) setBusy(false);
      }
    })();
    return () => { cancel = true; };
  }, [simId, gradoId]);

  // Banco agrupado por curso
  const porCurso = useMemo(() => {
    const map = new Map<string, { cursoId: string; nombre: string; preguntas: PreguntaDTO[] }>();
    for (const p of bank) {
      const nombre = (p as PreguntaDTO & { curso?: { nombre: string } }).curso?.nombre ?? 'Curso';
      if (!map.has(p.curso_id)) map.set(p.curso_id, { cursoId: p.curso_id, nombre, preguntas: [] });
      map.get(p.curso_id)!.preguntas.push(p);
    }
    return Array.from(map.values());
  }, [bank]);

  function toggle(cursoId: string, preguntaId: string, ordenDefault: number) {
    setSel(prev => {
      const cur = prev[cursoId] ?? { orden: ordenDefault, ids: [] };
      const has = cur.ids.includes(preguntaId);
      let ids = cur.ids;
      if (has) ids = ids.filter(x => x !== preguntaId);
      else {
        if (cur.ids.length >= 5) return prev; // máximo 5
        ids = [...ids, preguntaId];
      }
      return { ...prev, [cursoId]: { ...cur, ids } };
    });
  }
  function setOrden(cursoId: string, orden: number, ordenDefault: number) {
    setSel(prev => ({ ...prev, [cursoId]: { orden, ids: prev[cursoId]?.ids ?? [], } as Seleccion } ));
    void ordenDefault;
  }

  const cursosListos = useMemo(() => porCurso.filter(c => (sel[c.cursoId]?.ids.length ?? 0) === 5), [porCurso, sel]);

  async function guardarExamen() {
    const cursos = cursosListos.map((c, i) => ({
      curso_id: c.cursoId,
      orden: sel[c.cursoId]?.orden ?? i + 1,
      pregunta_ids: sel[c.cursoId]!.ids,
    }));
    if (cursos.length === 0) { setError('Selecciona exactamente 5 preguntas en al menos un curso.'); return; }
    const ordenes = cursos.map(c => c.orden);
    if (new Set(ordenes).size !== ordenes.length) { setError('El orden de los cursos no puede repetirse.'); return; }
    try {
      setBusy(true); setError('');
      await simulacrosAdminApi.guardarExamen(simId, { grado_id: gradoId, cursos });
      setTieneExamen(true);
      flash('Examen del grado guardado correctamente');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el examen');
    } finally { setBusy(false); }
  }

  async function cambiarEstado(s: SimulacroDTO, estado: 'Activo' | 'Concluido') {
    try {
      setBusy(true); setError('');
      await simulacrosAdminApi.cambiarEstado(s.id, estado);
      await reloadSims();
      flash(`Simulacro ${estado === 'Activo' ? 'activado' : 'concluido'}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cambiar el estado');
    } finally { setBusy(false); }
  }

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 text-slate-400 animate-spin" /></div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500 mb-1">Panel de administración</p>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileQuestion className="size-6 text-slate-700" /> Simulacro de Admisión
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Activa simulacros y arma los exámenes oficiales por grado (5 preguntas por curso).</p>
        </div>
        <button onClick={() => setModal(true)}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium shrink-0">
          <PlusCircle className="size-4" /> Nuevo simulacro
        </button>
      </div>

      {toast && <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-sm text-emerald-800"><CheckCircle2 className="size-4 shrink-0" /> {toast}</div>}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle className="size-5 text-red-600 shrink-0" />
          <p className="text-sm font-medium text-red-800 flex-1">{error}</p>
          <button onClick={() => setError('')} className="p-1 rounded-lg hover:bg-red-100"><X className="size-4 text-red-500" /></button>
        </div>
      )}

      {/* Panel de control de simulacros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {simulacros.length === 0 && <p className="text-sm text-slate-400 col-span-full">No hay simulacros. Crea el primero.</p>}
        {simulacros.map(s => {
          const active = s.id === simId;
          return (
            <div key={s.id} onClick={() => setSimId(s.id)}
              className={`cursor-pointer rounded-2xl border p-4 transition-colors ${active ? 'border-slate-800 bg-slate-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 text-sm">{s.nombre}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${ESTADO_BADGE[s.estado]}`}>{s.estado}</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">{s.bimestre?.nombre ?? 'Sin bimestre'} · {s._count?.preguntas ?? 0} preguntas</p>
              <div className="flex gap-2 mt-3">
                {s.estado === 'Activo' && (
                  <button onClick={(e) => { e.stopPropagation(); cambiarEstado(s, 'Concluido'); }} disabled={busy}
                    className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 disabled:opacity-50">
                    <Square className="size-3" /> Concluir
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {sim && (
        <>
          {/* Filtros de curaduría */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-4 items-end">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-600"><Filter className="size-4" /> Curaduría · {sim.nombre}</div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nivel</label>
              <div className="relative">
                <select value={nivelId} onChange={e => setNivelId(e.target.value)} className={selectCls}>
                  <option value="">Selecciona…</option>
                  {niveles.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Grado</label>
              <div className="relative">
                <select value={gradoId} onChange={e => setGradoId(e.target.value)} disabled={!nivelId} className={selectCls}>
                  <option value="">Selecciona…</option>
                  {grados.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Matriz de curaduría */}
          {!gradoId ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 py-14 text-center">
              <ListChecks className="size-9 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Selecciona un nivel y grado para armar su examen.</p>
            </div>
          ) : busy && bank.length === 0 ? (
            <div className="flex items-center justify-center py-14"><Loader2 className="size-6 text-slate-400 animate-spin" /></div>
          ) : porCurso.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 py-14 text-center">
              <FileQuestion className="size-9 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Aún no hay preguntas de docentes para este grado.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {porCurso.map((c, idx) => {
                const s = sel[c.cursoId] ?? { orden: idx + 1, ids: [] };
                const count = s.ids.length;
                return (
                  <div key={c.cursoId} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50">
                      <h3 className="text-sm font-semibold text-slate-700">{c.nombre}</h3>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${count === 5 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{count}/5 seleccionadas</span>
                        <label className="flex items-center gap-1.5 text-xs text-slate-500">
                          <GripVertical className="size-3.5 text-slate-400" /> Orden
                          <input type="number" min={1} value={s.orden}
                            onChange={e => setOrden(c.cursoId, Number(e.target.value), idx + 1)}
                            className="w-14 px-2 py-1 rounded-lg border border-slate-200 bg-white text-sm" />
                        </label>
                      </div>
                    </div>
                    <ul className="divide-y divide-slate-50">
                      {c.preguntas.map(p => {
                        const checked = s.ids.includes(p.id);
                        const full = count >= 5 && !checked;
                        return (
                          <li key={p.id}
                            onClick={() => !full && toggle(c.cursoId, p.id, idx + 1)}
                            className={`flex items-start gap-3 px-5 py-3 transition-colors ${full ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50'} ${checked ? 'bg-emerald-50/40' : ''}`}>
                            <span className={`mt-0.5 flex size-5 items-center justify-center rounded-md border shrink-0 ${checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}>
                              {checked && <CheckCircle2 className="size-3.5" />}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-slate-800">{p.enunciado}</p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                Resp: <strong>{p.respuesta_correcta}</strong>
                                {(p as PreguntaDTO & { docente?: { apellido_paterno: string } }).docente && <> · {(p as PreguntaDTO & { docente?: { apellido_paterno: string } }).docente!.apellido_paterno}</>}
                                {p.imagen_url && <> · con imagen</>}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}

              {/* Barra guardar + descargas */}
              <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 bg-white/95 backdrop-blur rounded-2xl border border-slate-200 shadow-lg px-4 py-3">
                <p className="text-sm text-slate-500">
                  {cursosListos.length} de {porCurso.length} cursos con 5 preguntas listas
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {tieneExamen && (
                    <>
                      <a href={examenPdfUrl(simId, gradoId, 'cuestionario')} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50">
                        <FileText className="size-4" /> Cuestionario PDF
                      </a>
                      <a href={examenPdfUrl(simId, gradoId, 'balotario')} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50">
                        <KeyRound className="size-4" /> Balotario PDF
                      </a>
                    </>
                  )}
                  <button onClick={guardarExamen} disabled={busy || cursosListos.length === 0}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shrink-0">
                    {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Guardar examen del grado
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {modal && <NuevoSimulacroModal busy={busy} bimestres={bimestres} onClose={() => setModal(false)}
        onCreate={async (payload) => {
          try {
            setBusy(true); setError('');
            await simulacrosAdminApi.crear(payload);
            await reloadSims();
            flash('Simulacro creado');
            setModal(false);
          } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo crear el simulacro');
          } finally { setBusy(false); }
        }} />}
    </div>
  );
}

// ── Modal nuevo simulacro ─────────────────────────────────────────
function NuevoSimulacroModal(props: {
  busy: boolean;
  bimestres: Bimestre[];
  onClose: () => void;
  onCreate: (p: { numero: number; nombre: string; bimestre_id: string }) => Promise<void>;
}) {
  // El simulacro se rinde al culminar un bimestre → se elige el bimestre.
  const opciones = useMemo(() => [...props.bimestres].sort((a, b) => a.numero - b.numero), [props.bimestres]);
  const [numero, setNumero] = useState('1');
  const [nombre, setNombre] = useState('Simulacro 1');
  const [nombreEditado, setNombreEditado] = useState(false);
  const [bimestreId, setBimestreId] = useState(opciones[0]?.id ?? '');
  const [err, setErr] = useState('');

  // El nombre por defecto sigue al número (evita «Simulacro 1» duplicados);
  // si el usuario lo edita a mano, se respeta su texto.
  function cambiarNumero(v: string) {
    setNumero(v);
    if (!nombreEditado) setNombre(`Simulacro ${v || '1'}`);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-800">Nuevo simulacro</h3>
          <button onClick={props.onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="size-4 text-slate-500" /></button>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault(); setErr('');
            if (!nombre.trim()) { setErr('El nombre es obligatorio.'); return; }
            if (!bimestreId) { setErr('Selecciona el bimestre en el que se rinde el simulacro.'); return; }
            await props.onCreate({ numero: Number(numero), nombre: nombre.trim(), bimestre_id: bimestreId });
          }}
          className="p-6 space-y-4"
        >
          {err && <p className="text-xs text-red-500">{err}</p>}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="sim-numero" className="block text-xs font-medium text-slate-600 mb-1.5">N.º (1–4)</label>
              <input id="sim-numero" type="number" min={1} max={4} value={numero} onChange={e => cambiarNumero(e.target.value)} className={input} />
            </div>
            <div className="col-span-2">
              <label htmlFor="sim-nombre" className="block text-xs font-medium text-slate-600 mb-1.5">Nombre</label>
              <input id="sim-nombre" value={nombre} onChange={e => { setNombre(e.target.value); setNombreEditado(true); }} maxLength={60} className={input} />
            </div>
          </div>
          <div>
            <label htmlFor="sim-bimestre" className="block text-xs font-medium text-slate-600 mb-1.5">Bimestre</label>
            {opciones.length === 0 ? (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                No hay bimestres en el período activo. Crea uno en «Bimestres» antes de programar el simulacro.
              </p>
            ) : (
              <div className="relative">
                <select id="sim-bimestre" value={bimestreId} onChange={e => setBimestreId(e.target.value)} className={selectCls}>
                  {opciones.map(b => (
                    <option key={b.id} value={b.id}>{b.nombre}{b.cerrado ? ' (cerrado)' : ''}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
              </div>
            )}
          </div>
          <p className="text-xs text-slate-400">El simulacro se rinde al culminar el bimestre. Se crea en estado «Borrador»; los docentes lo activarán cuando estén listos para subir sus preguntas.</p>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={props.onClose} disabled={props.busy} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancelar</button>
            <button type="submit" disabled={props.busy || opciones.length === 0} className="flex-1 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
              {props.busy && <Loader2 className="size-4 animate-spin" />} Crear
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
