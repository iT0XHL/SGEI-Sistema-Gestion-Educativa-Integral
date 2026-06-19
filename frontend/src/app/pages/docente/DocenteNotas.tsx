import { useState, useEffect } from 'react';
import { Save, Lock, Eye, AlertCircle, CheckCircle2, ChevronDown, Info } from 'lucide-react';
import { useSession } from '../../../lib/hooks/useSession';
import { apiClient } from '../../../lib/api/client';
import { notasApi } from '../../../lib/api/notas.api';
import { asistenciasApi } from '../../../lib/api/asistencias.api';
import { bimestresApi } from '../../../lib/api/bimestres.api';
import { literalColor, gradeToLiteral } from '../../../lib/courseColors';
import type { AsignacionDocente } from '../../../lib/api/alumnos.api';
import type { Bimestre } from '../../../lib/api/bimestres.api';
import type { ResumenAsistencia } from '../../../types/asistencia';

interface Competencia {
  id:          string;
  curso_id:    string;
  nombre:      string;
  descripcion: string | null;
  tipo:        'regular' | 'transversal';
  orden:       number;
}

interface AsignacionOpcion {
  id:        string;
  cursoId:   string;
  seccionId: string;
  label:     string;
}

interface AlumnoRow {
  id:       string;
  nombre:   string;
  initials: string;
}

type CellGrades = Record<string, Record<string, string>>;
type CellErrors = Record<string, Record<string, string>>;

export default function DocenteNotas() {
  const { session, loading: sessionLoading } = useSession();

  const [asignaciones,  setAsignaciones]  = useState<AsignacionDocente[]>([]);
  const [bimestres,     setBimestres]     = useState<Bimestre[]>([]);
  const [asignacionSel, setAsignacionSel] = useState<AsignacionOpcion | null>(null);
  const [bimestreSel,   setBimestreSel]   = useState<Bimestre | null>(null);

  const [competencias,  setCompetencias]  = useState<Competencia[]>([]);
  const [alumnos,       setAlumnos]       = useState<AlumnoRow[]>([]);
  const [cellGrades,    setCellGrades]    = useState<CellGrades>({});
  const [errors,        setErrors]        = useState<CellErrors>({});

  const [loading,      setLoading]      = useState(true);
  const [loadingDatos, setLoadingDatos] = useState(false);
  const [locked,       setLocked]       = useState(false);
  const [preview,      setPreview]      = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  const opciones: AsignacionOpcion[] = asignaciones.map(a => ({
    id:        a.id,
    cursoId:   a.curso_id,
    seccionId: a.seccion_id,
    label:     `${a.curso.nombre} — ${a.seccion.nombre}`,
  }));

  // Carga inicial: asignaciones + bimestres en paralelo
  useEffect(() => {
    if (sessionLoading || !session) return;
    let aborted = false;

    async function cargarInicial() {
      try {
        const [asigs, bims] = await Promise.all([
          apiClient.get<AsignacionDocente[]>('/api/asignaciones', {
            docenteId: session!.entidadId,
          }),
          bimestresApi.listar(),
        ]);
        if (aborted) return;

        setAsignaciones(asigs);
        setBimestres(bims);

        const bimestreActivo = bims
          .filter(b => !b.cerrado)
          .sort((a, b) => b.numero - a.numero)[0] ?? bims[0] ?? null;

        if (asigs.length > 0) {
          const primera = asigs[0]!;
          setAsignacionSel({
            id:        primera.id,
            cursoId:   primera.curso_id,
            seccionId: primera.seccion_id,
            label:     `${primera.curso.nombre} — ${primera.seccion.nombre}`,
          });
        }
        setBimestreSel(bimestreActivo);
      } catch (err) {
        if (!aborted) setError(err instanceof Error ? err.message : 'Error al cargar datos iniciales.');
      } finally {
        if (!aborted) setLoading(false);
      }
    }

    cargarInicial();
    return () => { aborted = true; };
  }, [session, sessionLoading]);

  // Recarga al cambiar asignación o bimestre: competencias + alumnos + notas existentes
  useEffect(() => {
    if (!asignacionSel || !bimestreSel || !session) return;
    let aborted = false;

    setLoadingDatos(true);
    setSaved(false);
    setLocked(false);
    setError(null);

    async function cargarDatos() {
      try {
        const [competenciasData, resumen, notasExistentes] = await Promise.all([
          apiClient.get<Competencia[]>('/api/competencias', { cursoId: asignacionSel!.cursoId }),
          asistenciasApi.resumen(asignacionSel!.seccionId),
          notasApi.listar({
            docenteId:  session!.entidadId,
            bimestreId: bimestreSel!.id,
            seccionId:  asignacionSel!.seccionId,
          }),
        ]);
        if (aborted) return;

        const compsOrdenadas = [...competenciasData].sort((a, b) => a.orden - b.orden);
        setCompetencias(compsOrdenadas);

        const alumnosList: AlumnoRow[] = resumen.map((r: ResumenAsistencia) => ({
          id:       r.alumno_id,
          nombre:   r.alumno_nombre,
          initials: r.alumno_nombre
            .split(' ')
            .map((n: string) => n[0])
            .slice(0, 2)
            .join(''),
        }));
        setAlumnos(alumnosList);

        // Inicializar celdas vacías con UUID de competencia como clave
        const inicial: CellGrades = {};
        alumnosList.forEach(a => {
          inicial[a.id] = {};
          compsOrdenadas.forEach(c => { inicial[a.id]![c.id] = ''; });
        });

        // Precargar notas ya registradas (nota_vigesimal llega como string en JSON)
        notasExistentes.forEach(nota => {
          if (inicial[nota.alumno_id]?.[nota.competencia_id] !== undefined) {
            inicial[nota.alumno_id]![nota.competencia_id] = Number(nota.nota_vigesimal).toString();
          }
        });

        setCellGrades(inicial);
        setErrors({});
        setLocked(notasExistentes.some(n => n.cerrada));
      } catch (err) {
        if (!aborted) setError(err instanceof Error ? err.message : 'Error al cargar datos.');
      } finally {
        if (!aborted) setLoadingDatos(false);
      }
    }

    cargarDatos();
    return () => { aborted = true; };
  }, [asignacionSel, bimestreSel, session]);

  function handleGradeChange(alumnoId: string, compId: string, value: string) {
    if (locked) return;
    setSaved(false);
    const num = parseFloat(value);
    const err = value !== '' && (isNaN(num) || num < 0 || num > 20) ? 'Fuera de rango' : '';
    setCellGrades(prev => ({
      ...prev,
      [alumnoId]: { ...prev[alumnoId], [compId]: value },
    }));
    setErrors(prev => ({
      ...prev,
      [alumnoId]: { ...prev[alumnoId], [compId]: err },
    }));
  }

  function computeAvg(alumnoId: string): number | null {
    const values = competencias
      .map(comp => {
        const raw = cellGrades[alumnoId]?.[comp.id] ?? '';
        const v = parseFloat(raw);
        return (!isNaN(v) && v >= 0 && v <= 20) ? v : null;
      })
      .filter((v): v is number => v !== null);

    if (values.length === 0) return null;
    return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
  }

  const totalFilled = alumnos.filter(alumno =>
    competencias.every(comp => {
      const v = cellGrades[alumno.id]?.[comp.id];
      return v !== '' && v !== undefined;
    })
  ).length;

  const hasErrors = Object.values(errors).some(r => Object.values(r).some(e => e !== ''));

  async function handleSave() {
    if (hasErrors || locked || !asignacionSel || !bimestreSel) return;
    setSaving(true);
    setSaved(false);
    setError(null);

    const notasPayload = alumnos.flatMap(alumno =>
      competencias
        .map(comp => {
          const raw = cellGrades[alumno.id]?.[comp.id] ?? '';
          const val = parseFloat(raw);
          if (raw === '' || isNaN(val)) return null;
          return {
            alumno_id:       alumno.id,
            competencia_id:  comp.id,
            bimestre_id:     bimestreSel.id,
            nota_vigesimal:  val,
            tipo_evaluacion: 'Final' as const,
          };
        })
        .filter((n): n is NonNullable<typeof n> => n !== null)
    );

    if (notasPayload.length === 0) {
      setError('Ingresa al menos una nota antes de guardar.');
      setSaving(false);
      return;
    }

    try {
      await notasApi.upsertBatch({ notas: notasPayload });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar las notas.');
    } finally {
      setSaving(false);
    }
  }

  // Cierra las notas del bimestre en la BD (cerrada=true) y notifica a
  // secretaría (§8). Antes solo bloqueaba la UI sin persistir ni avisar.
  async function handleLock() {
    if (!saved || !session || !bimestreSel) return;
    try {
      setSaving(true);
      setError(null);
      await notasApi.enviarASecretaria(session.entidadId, bimestreSel.id);
      setLocked(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron enviar las notas a secretaría.');
    } finally {
      setSaving(false);
    }
  }

  if (loading || sessionLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
        <div className="animate-pulse space-y-2">
          <div className="h-8 w-64 rounded bg-slate-100" />
          <div className="h-4 w-48 rounded bg-slate-100" />
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="h-10 rounded-xl bg-slate-100 animate-pulse" />
            <div className="h-10 rounded-xl bg-slate-100 animate-pulse" />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ingreso de Notas</h1>
          <p className="text-sm text-slate-500 mt-0.5">Calificaciones finales por competencia — CNEB</p>
        </div>
        {locked && (
          <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-medium">
            <Lock className="size-4" /> Calificaciones cerradas
          </span>
        )}
      </div>

      {/* Selectores */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Asignación</label>
            <div className="relative">
              <select
                value={asignacionSel?.id ?? ''}
                onChange={e => {
                  const opcion = opciones.find(o => o.id === e.target.value) ?? null;
                  setAsignacionSel(opcion);
                  setSaved(false);
                }}
                disabled={locked}
                className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {opciones.length === 0 && <option value="">Sin asignaciones</option>}
                {opciones.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Bimestre</label>
            <div className="relative">
              <select
                value={bimestreSel?.id ?? ''}
                onChange={e => {
                  const b = bimestres.find(b => b.id === e.target.value) ?? null;
                  setBimestreSel(b);
                  setSaved(false);
                }}
                disabled={locked}
                className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {bimestres.length === 0 && <option value="">Sin bimestres</option>}
                {bimestres.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Progreso */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">Notas ingresadas</span>
          <span className="text-sm font-bold text-slate-800">{totalFilled}/{alumnos.length} estudiantes completos</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${alumnos.length > 0 && totalFilled === alumnos.length ? 'bg-emerald-500' : 'bg-indigo-500'}`}
            style={{ width: alumnos.length > 0 ? `${(totalFilled / alumnos.length) * 100}%` : '0%' }}
          />
        </div>
        <div className="flex items-center gap-1.5 mt-2">
          <Info className="size-3.5 text-slate-400" />
          <p className="text-xs text-slate-500">
            Celda <span className="inline-block w-3 h-3 rounded-sm bg-emerald-200 align-middle" /> = nota ingresada ·{' '}
            <span className="inline-block w-3 h-3 rounded-sm bg-slate-100 ml-1 align-middle" /> = pendiente
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
          <AlertCircle className="size-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 flex-1">{error}</p>
        </div>
      )}

      {hasErrors && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
          <AlertCircle className="size-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">Hay notas fuera del rango válido (0–20). Corrígelas antes de guardar.</p>
        </div>
      )}

      {/* Tabla de notas */}
      {loadingDatos ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Cargando datos…</p>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-slate-100 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : alumnos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center">
          <p className="text-sm text-slate-500">
            {asignacionSel
              ? 'No hay alumnos registrados en esta sección todavía.'
              : 'Selecciona una asignación para ver la tabla de notas.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {asignacionSel?.label ?? '—'} · {bimestreSel?.nombre ?? '—'} {locked ? '(CERRADO)' : ''}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider sticky left-0 bg-white min-w-[180px]">
                    Estudiante
                  </th>
                  {competencias.map((comp, i) => (
                    <th key={comp.id} className="text-center px-2 py-3 text-xs font-semibold text-slate-500 min-w-[100px]">
                      <div className="max-w-[90px] leading-tight">C{i + 1}</div>
                      <div className="text-[10px] font-normal text-slate-400 truncate max-w-[90px] mt-0.5" title={comp.nombre}>
                        {comp.nombre.slice(0, 20)}{comp.nombre.length > 20 ? '…' : ''}
                      </div>
                    </th>
                  ))}
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-700 uppercase">Prom.</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-700 uppercase">Escala</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {alumnos.map((alumno, idx) => {
                  const studentAvg = computeAvg(alumno.id);
                  const lit = studentAvg !== null ? gradeToLiteral(studentAvg) : '—';
                  return (
                    <tr key={alumno.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 sticky left-0 bg-white">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 w-5">{idx + 1}</span>
                          <div className="flex size-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold shrink-0">
                            {alumno.initials}
                          </div>
                          <span className="font-medium text-slate-800 whitespace-nowrap">{alumno.nombre}</span>
                        </div>
                      </td>
                      {competencias.map(comp => {
                        const val = cellGrades[alumno.id]?.[comp.id] ?? '';
                        const err = errors[alumno.id]?.[comp.id] ?? '';
                        const filled = val !== '' && !err;
                        return (
                          <td key={comp.id} className="text-center px-2 py-2">
                            <input
                              type="number"
                              min="0"
                              max="20"
                              value={val}
                              onChange={e => handleGradeChange(alumno.id, comp.id, e.target.value)}
                              disabled={locked}
                              title={err || undefined}
                              className={`w-14 text-center text-sm border rounded-xl py-1.5 transition-all focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed
                                ${err
                                  ? 'border-red-400 bg-red-50 text-red-700 focus:ring-red-400'
                                  : filled
                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800 focus:ring-emerald-400'
                                    : 'border-slate-200 bg-slate-50 text-slate-700 focus:ring-indigo-400'
                                }`}
                              placeholder="—"
                            />
                            {err && <p className="text-[10px] text-red-500 mt-0.5">{err}</p>}
                          </td>
                        );
                      })}
                      <td className="text-center px-4 py-3">
                        <span className="text-base font-bold text-slate-800">
                          {studentAvg !== null ? studentAvg.toFixed(1) : '—'}
                        </span>
                      </td>
                      <td className="text-center px-4 py-3">
                        {studentAvg !== null ? (
                          <span className={`inline-flex items-center justify-center w-8 h-6 rounded-lg text-xs font-bold border ${literalColor(lit)}`}>
                            {lit}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Acciones */}
          <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center gap-3 justify-between">
            <button
              onClick={() => setPreview(p => !p)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Eye className="size-4" />
              {preview ? 'Ocultar' : 'Vista previa'} de libreta
            </button>

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={hasErrors || locked || saving || loadingDatos}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                {saving ? (
                  <><svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Guardando…</>
                ) : saved ? (
                  <><CheckCircle2 className="size-4" />Guardado</>
                ) : (
                  <><Save className="size-4" />Guardar notas</>
                )}
              </button>

              {saved && !locked && (
                <button
                  onClick={handleLock}
                  disabled={saving}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                >
                  <Lock className="size-4" /> {saving ? 'Enviando…' : 'Cerrar y enviar a secretaría'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {locked && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <Lock className="size-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Calificaciones cerradas</p>
            <p className="text-sm text-amber-700 mt-0.5">
              Las notas del {bimestreSel?.nombre ?? 'bimestre'} han sido cerradas. Para realizar correcciones, solicita autorización al Administrador.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
