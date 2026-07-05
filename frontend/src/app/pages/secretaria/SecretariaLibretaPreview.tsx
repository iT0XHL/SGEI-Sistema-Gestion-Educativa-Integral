import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import { Loader2, AlertCircle, CheckCircle2, XCircle, ArrowLeft, Eye } from 'lucide-react';
import { libretasApi } from '@/lib/api/libretas.api';
import type { LibretaAgrupada } from '@/types/nota';

export default function SecretariaLibretaPreview() {
  const { alumnoId } = useParams<{ alumnoId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bimestreId = searchParams.get('bimestreId');

  const [agrupada, setAgrupada] = useState<LibretaAgrupada | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [observing, setObserving] = useState(false);
  const [observacion, setObservacion] = useState('');
  const [showObservar, setShowObservar] = useState(false);

  useEffect(() => {
    async function load() {
      if (!alumnoId) return;
      try {
        setLoading(true);
        setError(null);
        const data = await libretasApi.obtenerAgrupado(alumnoId, bimestreId ?? undefined);
        setAgrupada(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [alumnoId, bimestreId]);

  async function handleAprobar() {
    if (!alumnoId) return;
    setApproving(true);
    try {
      await libretasApi.aprobar(alumnoId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al aprobar');
    } finally {
      setApproving(false);
    }
  }

  async function handlePublicar() {
    if (!alumnoId) return;
    setPublishing(true);
    try {
      await libretasApi.publicar(alumnoId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al publicar');
    } finally {
      setPublishing(false);
    }
  }

  async function handleObservar() {
    if (!alumnoId || !observacion.trim()) return;
    setObserving(true);
    try {
      await libretasApi.observar(alumnoId, observacion);
      setShowObservar(false);
      setObservacion('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al observar');
    } finally {
      setObserving(false);
    }
  }

  const primeraFila = agrupada?.areas[0]?.cursos[0]?.competencias[0];
  const alumnoNombre = primeraFila?.alumno_nombre ?? '—';
  const grado = primeraFila?.grado ?? '';
  const seccion = primeraFila?.seccion ?? '';
  const bimestreNombre = primeraFila?.nombre_bimestre ?? '';
  const areas = agrupada?.areas ?? [];

  if (loading) {
    return <div className="p-6 lg:p-8 max-w-5xl mx-auto"><Loader2 className="size-6 animate-spin text-teal-600" /></div>;
  }

  if (error && areas.length === 0) {
    return (
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        <div className="flex flex-col items-center gap-3 py-12">
          <AlertCircle className="size-8 text-red-400" />
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={() => navigate('/secretaria/libretas')} className="text-xs text-teal-600 underline">Volver</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-slate-200 transition-colors">
            <ArrowLeft className="size-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Vista previa de libreta</h1>
            <p className="text-sm text-slate-500">{alumnoNombre} · {grado} {seccion} · {bimestreNombre}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowObservar(true)}
            className="flex items-center gap-2 px-4 py-2.5 border border-red-200 text-red-700 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
          >
            <XCircle className="size-4" /> Observar
          </button>
          <button
            onClick={handleAprobar}
            disabled={approving}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
          >
            {approving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            Aprobar
          </button>
          <button
            onClick={handlePublicar}
            disabled={publishing}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
          >
            {publishing ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}
            Publicar
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
          <AlertCircle className="size-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {showObservar && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-amber-800">Observar libreta</h3>
          <textarea
            value={observacion}
            onChange={e => setObservacion(e.target.value)}
            placeholder="Indica el motivo de la observación…"
            rows={3}
            className="w-full border border-amber-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowObservar(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl">Cancelar</button>
            <button
              onClick={handleObservar}
              disabled={observing || !observacion.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-medium disabled:opacity-50"
            >
              {observing ? <Loader2 className="size-4 animate-spin" /> : null}
              Confirmar observación
            </button>
          </div>
        </div>
      )}

      {/* Vista previa de la libreta */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">I.E. SAN JOSÉ DE CALASANZ</p>
              <h2 className="text-sm font-bold text-slate-800 mt-0.5">LIBRETA DE NOTAS — {bimestreNombre.toUpperCase()}</h2>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Alumno: <span className="font-semibold text-slate-700">{alumnoNombre}</span></p>
              <p className="text-xs text-slate-500">Grado: <span className="font-semibold text-slate-700">{grado} — Sec. {seccion}</span></p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase min-w-[160px]">Área Académica</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase min-w-[220px]">Curso</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase w-16">Nota</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase w-16">Escala</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {areas.map(area => {
                const totalRows = area.cursos.length + 1;
                return (
                  <React.Fragment key={area.area_id ?? area.area_nombre}>
                    {area.cursos.map((curso, i) => (
                      <tr key={curso.curso_id} className="hover:bg-slate-50/60">
                        {i === 0 && (
                          <td rowSpan={totalRows} className="px-4 py-3 border-r border-slate-100 align-top font-semibold text-slate-800">
                            {area.area_nombre}
                          </td>
                        )}
                        <td className="px-4 py-2.5 text-slate-600">{curso.curso}</td>
                        <td className="text-center px-3 py-2.5 text-slate-800 font-medium">
                          {curso.promedio !== null ? curso.promedio.toFixed(1) : '—'}
                        </td>
                        <td className="text-center px-3 py-2.5">
                          {curso.literal ? (
                            <span className="inline-flex items-center justify-center w-8 h-6 rounded-lg text-xs font-bold border bg-blue-50 border-blue-200 text-blue-700">
                              {curso.literal}
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-b-2 border-slate-200 bg-slate-50/50">
                      <td className="px-4 py-2.5 text-xs font-bold text-slate-600 uppercase">Promedio General</td>
                      <td className="text-center px-3 py-2.5 text-base font-bold text-slate-900">{area.promedioGeneral !== null ? area.promedioGeneral.toFixed(1) : '—'}</td>
                      <td className="text-center px-3 py-2.5">—</td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
