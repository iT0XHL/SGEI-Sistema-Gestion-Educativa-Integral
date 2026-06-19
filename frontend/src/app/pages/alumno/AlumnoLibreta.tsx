import { useState, useEffect, useMemo } from 'react';
import { Download, Lock, ChevronDown } from 'lucide-react';
import { useSession } from '../../../lib/hooks/useSession';
import { libretasApi } from '../../../lib/api/libretas.api';
import { bimestresApi as bimestresApiClient } from '../../../lib/api/bimestres.api';
import { apiClient, ApiError } from '../../../lib/api/client';
import { useDescargarLibretaPdf } from '../../../hooks/alumno/useAlumnoLibreta';
import { getCourseColor, gradeToLiteral, literalColor } from '../../../lib/courseColors';
import type { LibretaRow, NotaLiteral } from '../../../types/nota';
import type { Bimestre } from '../../../lib/api/bimestres.api';

// ── Local types ────────────────────────────────────────────────────────────────

interface BimestreOpcion {
  numero: number;
  nombre: string;
}

interface CompetenciaAgrupada {
  nombre:    string;
  notaB1:    number | null;
  notaB2:    number | null;
  litActual: NotaLiteral | null;
}

interface FilaAgrupada {
  curso:        string;
  colorIndex:   number;
  competencias: CompetenciaAgrupada[];
  promedioB1:   number | null;
  promedioB2:   number | null;
  litPromedio:  string;
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AlumnoLibreta() {
  const { session, loading: sessionLoading } = useSession();

  // ── Data state ────────────────────────────────────────────────────────────────
  const [rows,            setRows]            = useState<LibretaRow[]>([]);
  const [bimestresList,   setBimestresList]   = useState<Bimestre[]>([]);
  const [institucionNombre, setInstitucionNombre] = useState('I.E. San José de Calasanz');

  // ── UI state ──────────────────────────────────────────────────────────────────
  const [bimestreSeleccionado, setBimestreSeleccionado] = useState<number | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [bloqueada,     setBloqueada]     = useState(false);
  const [noPublicada,   setNoPublicada]   = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const descargarMutation = useDescargarLibretaPdf();

  // ── Data loading ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (sessionLoading || !session) return;

    const alumnoId = session.entidadId;
    let aborted = false;

    async function cargar() {
      try {
        setLoading(true);
        setError(null);
        setBloqueada(false);
        setNoPublicada(false);

        // Parallel: libreta rows + bimestres
        const [libretaRows, bimestresData] = await Promise.all([
          libretasApi.obtener(alumnoId),
          bimestresApiClient.listar().catch((): Bimestre[] => []),
        ]);
        if (aborted) return;

        // Institution name (endpoint may not exist — keep fallback)
        try {
          const inst = await apiClient.get<{ nombre: string }>('/api/institucion');
          if (!aborted) setInstitucionNombre(inst.nombre);
        } catch { /* keep default */ }

        if (aborted) return;
        setRows(libretaRows);
        setBimestresList(bimestresData);

      } catch (err) {
        if (aborted) return;
        if (err instanceof ApiError && err.code === 'LIBRETA_BLOQUEADA') {
          setBloqueada(true);
        } else if (err instanceof ApiError && err.code === 'LIBRETA_NO_PUBLICADA') {
          setNoPublicada(true);
        } else {
          setError(err instanceof Error ? err.message : 'Error al cargar la libreta.');
        }
      } finally {
        if (!aborted) setLoading(false);
      }
    }

    cargar();
    return () => { aborted = true; };
  }, [session, sessionLoading]);

  // ── Bimestres disponibles (extraídos de las filas) ────────────────────────────

  const bimestresDisponibles = useMemo((): BimestreOpcion[] => {
    const seen   = new Set<number>();
    const result: BimestreOpcion[] = [];
    for (const r of rows) {
      if (!seen.has(r.bimestre)) {
        seen.add(r.bimestre);
        result.push({ numero: r.bimestre, nombre: r.nombre_bimestre });
      }
    }
    return result.sort((a, b) => a.numero - b.numero);
  }, [rows]);

  // Auto-seleccionar el bimestre más reciente
  useEffect(() => {
    if (bimestresDisponibles.length > 0 && bimestreSeleccionado === null) {
      setBimestreSeleccionado(
        bimestresDisponibles[bimestresDisponibles.length - 1]!.numero,
      );
    }
  }, [bimestresDisponibles, bimestreSeleccionado]);

  // ── Agrupación en FilaAgrupada (con rowspan) ──────────────────────────────────

  const filasAgrupadas = useMemo((): FilaAgrupada[] => {
    if (!bimestreSeleccionado) return [];

    const cursosUnicos = [...new Set(rows.map(r => r.curso))];

    return cursosUnicos.map((curso, idx) => {
      const filasCurso  = rows.filter(r => r.curso === curso);
      const compNombres = [...new Set(filasCurso.map(r => r.competencia))];

      const competencias: CompetenciaAgrupada[] = compNombres.map(comp => {
        const filaB1     = filasCurso.find(r => r.competencia === comp && r.bimestre === 1);
        const filaB2     = filasCurso.find(r => r.competencia === comp && r.bimestre === 2);
        const filaActual = filasCurso.find(
          r => r.competencia === comp && r.bimestre === bimestreSeleccionado,
        );
        return {
          nombre:    comp,
          notaB1:    filaB1?.nota_vigesimal    ?? null,
          notaB2:    filaB2?.nota_vigesimal    ?? null,
          litActual: (filaActual?.nota_literal ?? null) as NotaLiteral | null,
        };
      });

      const notasB1    = competencias.map(c => c.notaB1).filter((n): n is number => n !== null);
      const notasB2    = competencias.map(c => c.notaB2).filter((n): n is number => n !== null);
      const promedioB1 = notasB1.length > 0 ? notasB1.reduce((a, b) => a + b, 0) / notasB1.length : null;
      const promedioB2 = notasB2.length > 0 ? notasB2.reduce((a, b) => a + b, 0) / notasB2.length : null;
      const promedioActual = bimestreSeleccionado === 1 ? promedioB1 : promedioB2;

      return {
        curso,
        colorIndex: idx,
        competencias,
        promedioB1,
        promedioB2,
        litPromedio: promedioActual !== null ? gradeToLiteral(promedioActual) : '—',
      };
    });
  }, [rows, bimestreSeleccionado]);

  // ── Métricas del summary card ──────────────────────────────────────────────────

  const promedioGeneralB1 = useMemo(() => {
    const p = filasAgrupadas.map(f => f.promedioB1).filter((n): n is number => n !== null);
    return p.length > 0 ? p.reduce((a, b) => a + b, 0) / p.length : null;
  }, [filasAgrupadas]);

  const promedioGeneralB2 = useMemo(() => {
    const p = filasAgrupadas.map(f => f.promedioB2).filter((n): n is number => n !== null);
    return p.length > 0 ? p.reduce((a, b) => a + b, 0) / p.length : null;
  }, [filasAgrupadas]);

  const promedioGeneralActual = bimestreSeleccionado === 1 ? promedioGeneralB1 : promedioGeneralB2;

  const cursosAprobados = filasAgrupadas.filter(f => {
    const p = bimestreSeleccionado === 1 ? f.promedioB1 : f.promedioB2;
    return p !== null && p >= 11;
  }).length;

  const cursosAD = filasAgrupadas.filter(f => {
    const p = bimestreSeleccionado === 1 ? f.promedioB1 : f.promedioB2;
    return p !== null && p >= 18;
  }).length;

  const overallLit = promedioGeneralActual !== null ? gradeToLiteral(promedioGeneralActual) : '—';
  const nombreBimestreActual = bimestresDisponibles.find(b => b.numero === bimestreSeleccionado)?.nombre ?? '';

  // ── Student info ──────────────────────────────────────────────────────────────

  const alumnoNombre = rows[0]?.alumno_nombre ?? session?.nombre ?? '—';
  const grado        = rows[0]?.grado   ?? '';
  const seccion      = rows[0]?.seccion ?? '';

  // ── PDF download ──────────────────────────────────────────────────────────────

  async function handleDownload() {
    if (bloqueada || descargarMutation.isPending || !session) return;
    const bimestreId = bimestresList.find(b => b.numero === bimestreSeleccionado)?.id;
    descargarMutation.mutate(
      { alumnoId: session.entidadId, bimestreId, nombre: alumnoNombre },
      {
        onError: (err) => {
          const msg = err.message.toLowerCase();
          if (msg.includes('bloqueada') || msg.includes('bloqueado')) {
            setBloqueada(true);
          }
        },
      },
    );
  }

  // ── Table rows (built imperatively to handle rowspan) ─────────────────────────

  const tableRows: React.ReactNode[] = [];

  filasAgrupadas.forEach(area => {
    const c         = getCourseColor(area.colorIndex);
    const totalRows = area.competencias.length + 1; // competencias + fila promedio

    area.competencias.forEach((comp, i) => {
      const litComp = comp.litActual ?? '—';

      tableRows.push(
        <tr key={`${area.curso}-comp-${i}`} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
          {i === 0 && (
            <td
              rowSpan={totalRows}
              className="px-4 py-3 border-r border-slate-100 align-middle bg-white"
              style={{ verticalAlign: 'middle' }}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <div className={`size-2.5 rounded-full shrink-0 ${c.dot}`} />
                <span className="font-semibold text-slate-800 text-sm">{area.curso}</span>
              </div>
            </td>
          )}
          <td className="px-4 py-2.5 text-sm text-slate-600 max-w-[260px]">
            <p className="leading-snug">{comp.nombre}</p>
          </td>
          <td className="text-center px-3 py-2.5 text-slate-500 text-sm w-16">
            {comp.notaB1 !== null ? comp.notaB1 : <span className="text-slate-300">—</span>}
          </td>
          <td className="text-center px-3 py-2.5 font-semibold text-slate-800 text-sm w-16">
            {comp.notaB2 !== null ? comp.notaB2 : <span className="text-slate-300">—</span>}
          </td>
          <td className="text-center px-3 py-2.5 w-16">
            {comp.litActual ? (
              <span className={`inline-flex items-center justify-center w-8 h-6 rounded-lg text-xs font-bold border ${literalColor(comp.litActual)}`}>
                {comp.litActual}
              </span>
            ) : (
              <span className="text-slate-300 text-xs">—</span>
            )}
          </td>
        </tr>,
      );
    });

    // Fila de promedio del área
    tableRows.push(
      <tr key={`${area.curso}-avg`} className={`border-b-2 border-slate-200 ${c.light}`}>
        <td className="px-4 py-2.5">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Promedio del Área</span>
        </td>
        <td className="text-center px-3 py-2.5 text-sm font-bold text-slate-600">
          {area.promedioB1 !== null ? area.promedioB1.toFixed(1) : '—'}
        </td>
        <td className="text-center px-3 py-2.5">
          <span className="text-base font-bold text-slate-900">
            {area.promedioB2 !== null ? area.promedioB2.toFixed(1) : '—'}
          </span>
        </td>
        <td className="text-center px-3 py-2.5">
          <span className={`inline-flex items-center justify-center w-9 h-7 rounded-xl text-xs font-bold border ${literalColor(area.litPromedio)}`}>
            {area.litPromedio}
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
              : `${alumnoNombre}${grado ? ` · ${grado}° Sec. ${seccion}` : ''}`}
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
            disabled={bloqueada || descargarMutation.isPending || loading}
            title={bloqueada ? 'Bloqueado: deuda pendiente' : ''}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              bloqueada
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20 disabled:opacity-60'
            }`}
          >
            {descargarMutation.isPending ? (
              <svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : bloqueada ? (
              <Lock className="size-4" />
            ) : (
              <Download className="size-4" />
            )}
            {descargarMutation.isPending ? 'Generando Word…' : bloqueada ? 'Bloqueado' : 'Descargar Word'}
          </button>
        </div>
      </div>

      {/* Error de descarga */}
      {descargarMutation.isError && !bloqueada && (() => {
        const msg = descargarMutation.error?.message ?? '';
        if (msg.toLowerCase().includes('bloqueada') || msg.toLowerCase().includes('bloqueado')) {
          return null;
        }
        return (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            No se pudo generar el PDF. Intenta de nuevo.
          </p>
        );
      })()}

      {/* Error genérico */}
      {error && !bloqueada && !noPublicada && (
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

      {/* Libreta aún no publicada por secretaría (§14/§25) */}
      {noPublicada && !bloqueada && (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200">
            <Lock className="size-8 text-amber-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Libreta aún no disponible</h2>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">
              Tu libreta todavía no ha sido publicada por la secretaría. Vuelve a
              consultar más adelante; te notificaremos cuando esté lista.
            </p>
          </div>
        </div>
      )}

      {/* Skeleton de carga */}
      {loading && !bloqueada && !noPublicada && (
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
      {!loading && !bloqueada && !noPublicada && !error && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-5 text-white">
              <p className="text-xs text-blue-200 uppercase tracking-wider mb-1">Promedio general</p>
              <p className="text-4xl font-bold leading-none">
                {promedioGeneralActual !== null ? promedioGeneralActual.toFixed(2) : '—'}
              </p>
              <span className="inline-block mt-2 text-xs font-bold px-2 py-0.5 rounded-lg bg-white/20 text-white border border-white/30">
                {overallLit}
              </span>
              <p className="text-xs text-blue-200 mt-2">{nombreBimestreActual}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Cursos aprobados</p>
              <p className="text-2xl font-bold text-slate-900">
                {cursosAprobados}/{filasAgrupadas.length}
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
                      {grado ? `${grado}° Secundaria — Sec. ${seccion}` : '—'}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {filasAgrupadas.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-slate-400 text-sm">No hay notas registradas para este bimestre.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[160px] border-r border-slate-100">
                        Área Curricular
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[220px]">
                        Competencia
                      </th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-16">
                        Bim. I
                      </th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-16">
                        Bim. II
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
                        Promedio General
                      </td>
                      <td className="text-center px-3 py-3 text-sm font-bold text-slate-600">
                        {promedioGeneralB1 !== null ? promedioGeneralB1.toFixed(1) : '—'}
                      </td>
                      <td className="text-center px-3 py-3 text-base font-bold text-blue-700">
                        {promedioGeneralB2 !== null ? promedioGeneralB2.toFixed(1) : '—'}
                      </td>
                      <td className="text-center px-3 py-3">
                        <span className={`inline-flex items-center justify-center w-9 h-7 rounded-xl text-xs font-bold border ${literalColor(overallLit)}`}>
                          {overallLit}
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
