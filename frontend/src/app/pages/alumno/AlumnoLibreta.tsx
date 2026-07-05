import { useState, useEffect, useMemo } from 'react';
import { Download, Lock, ChevronDown } from 'lucide-react';
import { useSession } from '../../../lib/hooks/useSession';
import { libretasApi } from '../../../lib/api/libretas.api';
import { bimestresApi as bimestresApiClient } from '../../../lib/api/bimestres.api';
import { apiClient, ApiError } from '../../../lib/api/client';
import { getCourseColor, literalColor } from '../../../lib/courseColors';
import type { LibretaAgrupada } from '../../../types/nota';
import type { Bimestre } from '../../../lib/api/bimestres.api';

// ── Local types ────────────────────────────────────────────────────────────────

interface BimestreOpcion {
  numero: number;
  nombre: string;
  id:     string;
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AlumnoLibreta() {
  const { session, loading: sessionLoading } = useSession();

  // ── Data state ────────────────────────────────────────────────────────────────
  const [bimestresList,   setBimestresList]   = useState<Bimestre[]>([]);
  const [bimestresDisponibles, setBimestresDisponibles] = useState<BimestreOpcion[]>([]);
  const [agrupada,        setAgrupada]        = useState<LibretaAgrupada | null>(null);
  const [institucionNombre, setInstitucionNombre] = useState('');
  const [alumnoInfo,      setAlumnoInfo]      = useState({ nombre: '', grado: '', seccion: '' });

  // ── UI state ──────────────────────────────────────────────────────────────────
  const [bimestreSeleccionado, setBimestreSeleccionado] = useState<number | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [loadingTabla,  setLoadingTabla]  = useState(false);
  const [bloqueada,     setBloqueada]     = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [downloading,   setDownloading]   = useState(false);
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null);

  // ── Carga inicial: bimestres disponibles (a partir de la libreta plana) ───────

  useEffect(() => {
    if (sessionLoading || !session) return;
    const alumnoId = session.entidadId;
    let aborted = false;

    async function cargarInicial() {
      try {
        setLoading(true);
        setError(null);
        setBloqueada(false);

        const [rows, bimestresData] = await Promise.all([
          libretasApi.obtener(alumnoId),
          bimestresApiClient.listar().catch((): Bimestre[] => []),
        ]);
        if (aborted) return;

        try {
          const inst = await apiClient.get<{ nombre: string }>('/api/institucion');
          if (!aborted) setInstitucionNombre(inst.nombre);
        } catch { /* keep default */ }

        if (aborted) return;
        setBimestresList(bimestresData);
        if (rows.length > 0) {
          setAlumnoInfo({ nombre: rows[0]!.alumno_nombre, grado: rows[0]!.grado, seccion: rows[0]!.seccion });
        }

        const numerosConDatos = new Set(rows.map(r => r.bimestre));
        const disponibles = bimestresData
          .filter(b => numerosConDatos.has(b.numero))
          .sort((a, b) => a.numero - b.numero)
          .map(b => ({ numero: b.numero, nombre: b.nombre, id: b.id }));
        setBimestresDisponibles(disponibles);
        if (disponibles.length > 0) setBimestreSeleccionado(disponibles[disponibles.length - 1]!.numero);
      } catch (err) {
        if (aborted) return;
        if (err instanceof ApiError && err.code === 'LIBRETA_BLOQUEADA') {
          setBloqueada(true);
        } else {
          setError(err instanceof Error ? err.message : 'Error al cargar la libreta.');
        }
      } finally {
        if (!aborted) setLoading(false);
      }
    }

    cargarInicial();
    return () => { aborted = true; };
  }, [session, sessionLoading]);

  // ── Carga de la libreta agrupada (área → curso) para el bimestre elegido ──────

  useEffect(() => {
    if (sessionLoading || !session || bimestreSeleccionado === null) return;
    const bimestreId = bimestresList.find(b => b.numero === bimestreSeleccionado)?.id;
    if (!bimestreId) return;
    let aborted = false;

    async function cargarAgrupada() {
      try {
        setLoadingTabla(true);
        const data = await libretasApi.obtenerAgrupado(session!.entidadId, bimestreId);
        if (!aborted) setAgrupada(data);
      } catch (err) {
        if (!aborted) setError(err instanceof Error ? err.message : 'Error al cargar la libreta agrupada.');
      } finally {
        if (!aborted) setLoadingTabla(false);
      }
    }

    cargarAgrupada();
    return () => { aborted = true; };
  }, [session, sessionLoading, bimestreSeleccionado, bimestresList]);

  // ── Métricas del summary card ──────────────────────────────────────────────────

  const areas = agrupada?.areas ?? [];
  const todosCursos = useMemo(() => areas.flatMap(a => a.cursos), [areas]);
  const cursosAprobados = todosCursos.filter(c => c.promedio !== null && c.promedio >= 11).length;
  const cursosAD = todosCursos.filter(c => c.promedio !== null && c.promedio >= 18).length;

  // "Promedio Anual" solo cuando hay más de un bimestre con datos; por ahora
  // (solo Bimestre I) es igual al promedio general del bimestre seleccionado.
  const esAnual = bimestresDisponibles.length > 1;
  const promedioFinal = agrupada?.promedioAnual ?? null;
  const literalFinal = agrupada?.literalAnual ?? '—';
  const nombreBimestreActual = bimestresList.find(b => b.numero === bimestreSeleccionado)?.nombre ?? '';

  const alumnoNombre = alumnoInfo.nombre || session?.nombre || '—';
  const { grado, seccion } = alumnoInfo;

  // ── PDF download ──────────────────────────────────────────────────────────────

  async function handleDownload() {
    if (bloqueada || downloading || !session) return;
    setDownloading(true);
    setErrorDescarga(null);
    try {
      const bimestreId = bimestresList.find(b => b.numero === bimestreSeleccionado)?.id;
      const blob = await libretasApi.descargarPdf(session.entidadId, bimestreId);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `libreta_${alumnoNombre.replace(/\s+/g, '_')}_${nombreBimestreActual}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : '';
      if (msg.includes('bloqueada') || msg.includes('bloqueado')) {
        setBloqueada(true);
      } else {
        setErrorDescarga('No se pudo generar el PDF. Intenta de nuevo.');
      }
    } finally {
      setDownloading(false);
    }
  }

  // ── Table rows (área → curso, con rowspan por área) ───────────────────────────

  const tableRows: React.ReactNode[] = [];

  areas.forEach((area, areaIdx) => {
    const c = getCourseColor(areaIdx);
    const totalRows = area.cursos.length + 1; // cursos + fila de promedio general del área

    area.cursos.forEach((curso, i) => {
      tableRows.push(
        <tr key={`${area.area_id ?? area.area_nombre}-curso-${curso.curso_id}`} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
          {i === 0 && (
            <td rowSpan={totalRows} className="px-4 py-3 border-r border-slate-100 align-middle bg-white" style={{ verticalAlign: 'middle' }}>
              <div className="flex items-center gap-2 mb-0.5">
                <div className={`size-2.5 rounded-full shrink-0 ${c.dot}`} />
                <span className="font-semibold text-slate-800 text-sm">{area.area_nombre}</span>
              </div>
            </td>
          )}
          <td className="px-4 py-2.5 text-sm text-slate-600 max-w-[260px]">
            <p className="leading-snug">{curso.curso}</p>
          </td>
          <td className="text-center px-3 py-2.5 font-semibold text-slate-800 text-sm w-16">
            {curso.promedio !== null ? curso.promedio.toFixed(1) : <span className="text-slate-300">—</span>}
          </td>
          <td className="text-center px-3 py-2.5 w-16">
            {curso.literal ? (
              <span className={`inline-flex items-center justify-center w-8 h-6 rounded-lg text-xs font-bold border ${literalColor(curso.literal)}`}>
                {curso.literal}
              </span>
            ) : (
              <span className="text-slate-300 text-xs">—</span>
            )}
          </td>
        </tr>,
      );
    });

    tableRows.push(
      <tr key={`${area.area_id ?? area.area_nombre}-general`} className={`border-b-2 border-slate-200 ${c.light}`}>
        <td className="px-4 py-2.5">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Promedio General</span>
        </td>
        <td className="text-center px-3 py-2.5">
          <span className="text-base font-bold text-slate-900">
            {area.promedioGeneral !== null ? area.promedioGeneral.toFixed(1) : '—'}
          </span>
        </td>
        <td className="text-center px-3 py-2.5">
          <span className={`inline-flex items-center justify-center w-9 h-7 rounded-xl text-xs font-bold border ${literalColor(area.literalGeneral ?? '—')}`}>
            {area.literalGeneral ?? '—'}
          </span>
        </td>
      </tr>,
    );
  });

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Libreta Digital</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {loading
              ? 'Cargando…'
              : `${alumnoNombre}${grado ? ` · ${grado} Sec. ${seccion}` : ''}`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Selector de bimestre */}
          <div className="relative">
            <select
              value={bimestreSeleccionado ?? ''}
              onChange={e => setBimestreSeleccionado(Number(e.target.value))}
              disabled={loading || bloqueada || bimestresDisponibles.length === 0}
              className="appearance-none bg-white border border-slate-200 text-slate-700 text-sm rounded-xl px-4 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bimestresDisponibles.length === 0 && (
                <option value="">Bimestre</option>
              )}
              {bimestresDisponibles.map(b => (
                <option key={b.numero} value={b.numero}>{b.nombre}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Botón descarga */}
          <button
            onClick={handleDownload}
            disabled={bloqueada || downloading || loading}
            title={bloqueada ? 'Bloqueado: deuda pendiente' : ''}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              bloqueada
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20 disabled:opacity-60'
            }`}
          >
            {downloading ? (
              <svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : bloqueada ? (
              <Lock className="size-4" />
            ) : (
              <Download className="size-4" />
            )}
            {downloading ? 'Generando PDF…' : bloqueada ? 'Bloqueado' : 'Descargar PDF'}
          </button>
        </div>
      </div>

      {/* Error de descarga */}
      {errorDescarga && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {errorDescarga}
        </p>
      )}

      {/* Error genérico */}
      {error && !bloqueada && (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <p className="text-slate-600">{error}</p>
        </div>
      )}

      {/* UI de bloqueo */}
      {bloqueada && (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-red-50 border border-red-200">
            <Lock className="size-8 text-red-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Libreta bloqueada</h2>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">
              Tu libreta está bloqueada por una deuda pendiente o bloqueo administrativo.
              Regulariza tu situación de pagos para acceder.
            </p>
          </div>
          <a
            href="/alumno/pagos"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            Ver estado de pagos
          </a>
        </div>
      )}

      {/* Skeleton de carga */}
      {loading && !bloqueada && (
        <div className="space-y-4 animate-pulse">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2 h-32 rounded-2xl bg-slate-200" />
            <div className="h-32 rounded-2xl bg-slate-200" />
            <div className="h-32 rounded-2xl bg-slate-200" />
          </div>
          <div className="h-64 rounded-2xl bg-slate-200" />
        </div>
      )}

      {/* Contenido principal */}
      {!loading && !bloqueada && !error && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-5 text-white">
              <p className="text-xs text-blue-200 uppercase tracking-wider mb-1">{esAnual ? 'Promedio anual' : 'Promedio general'}</p>
              <p className="text-4xl font-bold leading-none">
                {promedioFinal !== null ? promedioFinal.toFixed(2) : '—'}
              </p>
              <span className="inline-block mt-2 text-xs font-bold px-2 py-0.5 rounded-lg bg-white/20 text-white border border-white/30">
                {literalFinal}
              </span>
              <p className="text-xs text-blue-200 mt-2">{esAnual ? 'Todos los bimestres' : nombreBimestreActual}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Cursos aprobados</p>
              <p className="text-2xl font-bold text-slate-900">
                {cursosAprobados}/{todosCursos.length}
              </p>
              <p className="text-xs text-slate-400 mt-1">Nota mínima: 11</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Logro destacado</p>
              <p className="text-2xl font-bold text-emerald-700">{cursosAD}</p>
              <p className="text-xs text-slate-400 mt-1">Cursos con AD</p>
            </div>
          </div>

          {/* Tabla libreta */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Encabezado institucional */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {institucionNombre}
                  </p>
                  <h2 className="text-sm font-bold text-slate-800 mt-0.5">
                    LIBRETA DE NOTAS — {nombreBimestreActual.toUpperCase()}
                  </h2>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">
                    Alumno: <span className="font-semibold text-slate-700">{alumnoNombre}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    Grado:{' '}
                    <span className="font-semibold text-slate-700">
                      {grado ? `${grado} — Sec. ${seccion}` : '—'}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {loadingTabla ? (
              <div className="p-5 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-10 bg-slate-100 animate-pulse rounded-xl" />
                ))}
              </div>
            ) : areas.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-slate-400 text-sm">No hay notas registradas para este bimestre.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[160px] border-r border-slate-100">
                        Área Académica
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[220px]">
                        Curso
                      </th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-16">
                        {nombreBimestreActual || 'Nota'}
                      </th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-16">
                        Escala
                      </th>
                    </tr>
                  </thead>
                  <tbody>{tableRows}</tbody>
                  <tfoot>
                    <tr className="bg-blue-50 border-t-2 border-blue-200">
                      <td className="px-4 py-3 border-r border-blue-100" />
                      <td className="px-4 py-3 text-sm font-bold text-blue-800 uppercase tracking-wider">
                        {esAnual ? 'Promedio Anual' : 'Promedio General'}
                      </td>
                      <td className="text-center px-3 py-3 text-base font-bold text-blue-700">
                        {promedioFinal !== null ? promedioFinal.toFixed(1) : '—'}
                      </td>
                      <td className="text-center px-3 py-3">
                        <span className={`inline-flex items-center justify-center w-9 h-7 rounded-xl text-xs font-bold border ${literalColor(literalFinal)}`}>
                          {literalFinal}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Escala de referencia */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
              <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                <span>Escala literal:</span>
                {([
                  ['AD', '18–20', 'Logro destacado'],
                  ['A',  '14–17', 'Logro esperado'],
                  ['B',  '11–13', 'En proceso'],
                  ['C',  '00–10', 'En inicio'],
                ] as const).map(([l, r, d]) => (
                  <span key={l} className={`font-medium px-2 py-0.5 rounded-md border ${literalColor(l)}`}>
                    {l} ({r}) {d}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
