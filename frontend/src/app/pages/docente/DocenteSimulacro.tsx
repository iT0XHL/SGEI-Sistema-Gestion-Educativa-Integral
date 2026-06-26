import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ClipboardList, ChevronDown, Loader2, AlertTriangle, CheckCircle2, Save,
  ImagePlus, X, Info, Trash2, Play,
} from 'lucide-react';
import {
  simulacrosApi,
  type CargaDocente, type PreguntaInput, type Letra,
} from '../../../lib/api/simulacros.api';

const LETRAS: Letra[] = ['A', 'B', 'C', 'D', 'E'];
const EMPTY: PreguntaInput = {
  enunciado: '', imagen_url: '',
  alt_a: '', alt_b: '', alt_c: '', alt_d: '', alt_e: '',
  respuesta_correcta: 'A',
};
const nuevoBloque = (): PreguntaInput[] => Array.from({ length: 5 }, () => ({ ...EMPTY }));

const input = 'w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400';
const selectCls = 'w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-50';

export default function DocenteSimulacro() {
  const [carga, setCarga]     = useState<CargaDocente | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState('');

  const [cursoId, setCursoId] = useState('');
  const [gradoId, setGradoId] = useState('');

  const [preguntas, setPreguntas] = useState<PreguntaInput[]>(nuevoBloque);
  const [cargandoBloque, setCargandoBloque] = useState(false);

  const flash = useCallback((m: string) => { setToast(m); setTimeout(() => setToast(''), 3000); }, []);

  useEffect(() => { void init(); }, []);
  async function init() {
    try {
      setLoading(true); setError('');
      setCarga(await simulacrosApi.carga());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando datos del simulacro');
    } finally {
      setLoading(false);
    }
  }

  // El docente activa el próximo simulacro (Borrador) para abrir la carga.
  async function activarSimulacro() {
    const sim = carga?.proximoSimulacro;
    if (!sim) return;
    try {
      setSaving(true); setError('');
      await simulacrosApi.cambiarEstado(sim.id, 'Activo');
      setCarga(await simulacrosApi.carga());
      flash('Simulacro activado. Ahora puedes cargar tus preguntas.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo activar el simulacro');
    } finally {
      setSaving(false);
    }
  }

  const simulacro        = carga?.simulacro ?? null;
  const proximoSimulacro = carga?.proximoSimulacro ?? null;
  const cursos           = carga?.cursos ?? [];
  const grados           = carga?.grados ?? [];

  // Cargar el bloque ya guardado al elegir curso+grado (solo con simulacro activo).
  useEffect(() => {
    if (!simulacro || !cursoId || !gradoId) { setPreguntas(nuevoBloque()); return; }
    let cancel = false;
    (async () => {
      try {
        setCargandoBloque(true);
        const prev = await simulacrosApi.misPreguntas({ cursoId, gradoId });
        if (cancel) return;
        if (prev.length === 5) {
          setPreguntas(prev.map(p => ({
            enunciado: p.enunciado, imagen_url: p.imagen_url ?? '',
            alt_a: p.alt_a, alt_b: p.alt_b, alt_c: p.alt_c, alt_d: p.alt_d, alt_e: p.alt_e,
            respuesta_correcta: p.respuesta_correcta,
          })));
        } else {
          setPreguntas(nuevoBloque());
        }
      } catch {
        if (!cancel) setPreguntas(nuevoBloque());
      } finally {
        if (!cancel) setCargandoBloque(false);
      }
    })();
    return () => { cancel = true; };
  }, [simulacro, cursoId, gradoId]);

  function setPreg(i: number, patch: Partial<PreguntaInput>) {
    setPreguntas(prev => prev.map((p, idx) => idx === i ? { ...p, ...patch } : p));
  }

  const bloqueCompleto = useMemo(() =>
    preguntas.every(p =>
      p.enunciado.trim() && p.alt_a.trim() && p.alt_b.trim() &&
      p.alt_c.trim() && p.alt_d.trim() && p.alt_e.trim()),
  [preguntas]);

  async function guardar() {
    if (!cursoId || !gradoId) { setError('Selecciona curso y grado.'); return; }
    if (!bloqueCompleto) { setError('Completa el enunciado y las 5 alternativas de cada pregunta.'); return; }
    try {
      setSaving(true); setError('');
      await simulacrosApi.guardarPreguntas({
        curso_id: cursoId,
        grado_id: gradoId,
        seccion_id: null,
        preguntas: preguntas.map(p => ({
          enunciado: p.enunciado.trim(),
          imagen_url: p.imagen_url?.trim() || null,
          alt_a: p.alt_a.trim(), alt_b: p.alt_b.trim(), alt_c: p.alt_c.trim(),
          alt_d: p.alt_d.trim(), alt_e: p.alt_e.trim(),
          respuesta_correcta: p.respuesta_correcta,
        })),
      });
      flash('Preguntas guardadas correctamente');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron guardar las preguntas');
    } finally {
      setSaving(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────
  if (loading) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 text-slate-400 animate-spin" /></div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500 mb-1">Simulacro de Admisión</p>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="size-6 text-slate-700" /> Mis preguntas
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Con un simulacro activo, registra <strong>5 preguntas por curso y grado</strong> que enseñas.
            El administrador seleccionará de entre todas para armar el examen.
          </p>
        </div>
        {simulacro ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200 self-start shrink-0">
            <span className="size-1.5 rounded-full bg-emerald-500" /> {simulacro.nombre} activo
            {simulacro.bimestre && <> · {simulacro.bimestre.nombre}</>}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 text-slate-500 text-xs font-medium border border-slate-200 self-start shrink-0">
            Sin simulacro activo
          </span>
        )}
      </div>

      {toast && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-sm text-emerald-800">
          <CheckCircle2 className="size-4 shrink-0" /> {toast}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle className="size-5 text-red-600 shrink-0" />
          <p className="text-sm font-medium text-red-800 flex-1">{error}</p>
          <button onClick={() => setError('')} className="p-1 rounded-lg hover:bg-red-100"><X className="size-4 text-red-500" /></button>
        </div>
      )}

      {/* Sin simulacro activo → ofrecer activar el próximo, o avisar */}
      {!simulacro && (
        proximoSimulacro ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <Info className="size-5 text-amber-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-amber-800 font-medium">
                {proximoSimulacro.nombre} está en borrador{proximoSimulacro.bimestre ? ` · ${proximoSimulacro.bimestre.nombre}` : ''}
              </p>
              <p className="text-sm text-amber-700 mt-0.5">Actívalo para empezar a registrar tus 5 preguntas por curso y grado.</p>
            </div>
            <button onClick={activarSimulacro} disabled={saving}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium shrink-0 disabled:opacity-50 transition-colors">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />} Activar simulacro
            </button>
          </div>
        ) : (
          <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <Info className="size-5 text-slate-500 shrink-0 mt-0.5" />
            <p className="text-sm text-slate-600">No hay un simulacro activo ni pendiente. Pide al administrador que cree uno para este bimestre.</p>
          </div>
        )
      )}

      {/* Con simulacro activo → formulario de carga (5 preguntas por curso+grado) */}
      {simulacro && (
        cursos.length === 0 ? (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <Info className="size-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">No tienes cursos asignados en el período activo, por lo que no puedes registrar preguntas.</p>
          </div>
        ) : (
          <>
            {/* Selectores: Curso → Grado (de lo que enseña el docente) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Curso (tu asignatura)</label>
                <div className="relative">
                  <select value={cursoId} onChange={e => setCursoId(e.target.value)} className={selectCls}>
                    <option value="">Selecciona un curso…</option>
                    {cursos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Grado</label>
                <div className="relative">
                  <select value={gradoId} onChange={e => setGradoId(e.target.value)} disabled={!cursoId} className={selectCls}>
                    <option value="">Selecciona un grado…</option>
                    {grados.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {!cursoId || !gradoId ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 py-14 text-center">
                <ClipboardList className="size-9 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Selecciona Curso ▸ Grado para registrar las 5 preguntas.</p>
              </div>
            ) : cargandoBloque ? (
              <div className="flex items-center justify-center py-14"><Loader2 className="size-6 text-slate-400 animate-spin" /></div>
            ) : (
              <div className="space-y-4">
                {preguntas.map((p, i) => (
                  <PreguntaCard key={i} index={i} value={p} onChange={(patch) => setPreg(i, patch)} />
                ))}

                {/* Barra guardar */}
                <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 bg-white/95 backdrop-blur rounded-2xl border border-slate-200 shadow-lg px-4 py-3">
                  <p className={`text-sm ${bloqueCompleto ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {bloqueCompleto ? '✓ Las 5 preguntas están completas' : 'Completa el enunciado y las 5 alternativas de cada pregunta'}
                  </p>
                  <button onClick={guardar} disabled={saving || !bloqueCompleto}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0">
                    {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                    Guardar 5 preguntas
                  </button>
                </div>
              </div>
            )}
          </>
        )
      )}
    </div>
  );
}

// ── Tarjeta de pregunta (con imagen opcional) ────────────────────────
function PreguntaCard(props: { index: number; value: PreguntaInput; onChange: (patch: Partial<PreguntaInput>) => void }) {
  const { index, value, onChange } = props;
  const altKeys: Array<keyof PreguntaInput> = ['alt_a', 'alt_b', 'alt_c', 'alt_d', 'alt_e'];
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [imgErr, setImgErr] = useState('');

  async function subir(file: File | null | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setImgErr('Solo se permiten imágenes.'); return; }
    try {
      setUploading(true); setImgErr('');
      const { url } = await simulacrosApi.subirImagen(file);
      onChange({ imagen_url: url });
    } catch (e) {
      setImgErr(e instanceof Error ? e.message : 'No se pudo subir la imagen');
    } finally {
      setUploading(false);
    }
  }

  function onPaste(e: React.ClipboardEvent) {
    const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'));
    if (item) { e.preventDefault(); void subir(item.getAsFile()); }
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    void subir(e.dataTransfer.files?.[0]);
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <span className="flex size-7 items-center justify-center rounded-lg bg-slate-800 text-white text-xs font-bold">{index + 1}</span>
          Pregunta {index + 1}
        </h3>
      </div>

      <textarea value={value.enunciado} onChange={e => onChange({ enunciado: e.target.value })}
        rows={2} maxLength={2000} placeholder="Escribe el enunciado de la pregunta…"
        className={`${input} resize-none`} />

      {/* Imagen opcional: pegar (Ctrl+V), arrastrar o clic */}
      <div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={e => { void subir(e.target.files?.[0]); e.target.value = ''; }} />
        {value.imagen_url ? (
          <div className="relative inline-block">
            <img src={value.imagen_url} alt="" className="max-h-44 rounded-lg border border-slate-200 object-contain"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <button type="button" onClick={() => onChange({ imagen_url: '' })}
              className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600" title="Quitar imagen">
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ) : (
          <div
            tabIndex={0}
            onPaste={onPaste}
            onDrop={onDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center justify-center gap-1 py-5 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-slate-300 hover:bg-slate-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-300 transition-colors">
            {uploading ? (
              <><Loader2 className="size-5 animate-spin" /><span className="text-xs">Subiendo…</span></>
            ) : (
              <>
                <ImagePlus className="size-5" />
                <span className="text-xs font-medium">Pega una imagen (Ctrl+V), arrástrala o haz clic</span>
                <span className="text-[11px] text-slate-400">PNG, JPG, WEBP o GIF · máx. 5 MB · opcional</span>
              </>
            )}
          </div>
        )}
        {imgErr && <p className="text-xs text-red-500 mt-1">{imgErr}</p>}
      </div>

      {/* Alternativas A-E con selección de correcta */}
      <div className="space-y-2">
        {LETRAS.map((letra, idx) => {
          const key = altKeys[idx];
          const correcta = value.respuesta_correcta === letra;
          return (
            <div key={letra} className={`flex items-center gap-2 rounded-xl border px-2 py-1.5 transition-colors ${correcta ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200'}`}>
              <button type="button" onClick={() => onChange({ respuesta_correcta: letra })}
                title="Marcar como correcta"
                className={`flex size-7 items-center justify-center rounded-lg text-xs font-bold shrink-0 transition-colors ${correcta ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                {letra}
              </button>
              <input value={value[key] as string} onChange={e => onChange({ [key]: e.target.value } as Partial<PreguntaInput>)}
                placeholder={`Alternativa ${letra}`} maxLength={500}
                className="flex-1 bg-transparent text-sm px-1 py-1 focus:outline-none" />
              {correcta && <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mr-1" />}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-slate-400">Pulsa la letra para marcar la respuesta correcta.</p>
    </div>
  );
}
