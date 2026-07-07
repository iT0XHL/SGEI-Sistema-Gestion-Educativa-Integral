import { useState, useEffect, useRef } from 'react';
import { Save, Lock, Eye, AlertCircle, CheckCircle2, ChevronDown, Info, FileDown, FileUp, X, AlertTriangle } from 'lucide-react';
import { useSession } from '../../../lib/hooks/useSession';
import { apiClient } from '../../../lib/api/client';
import { notasApi } from '../../../lib/api/notas.api';
import { asistenciasApi } from '../../../lib/api/asistencias.api';
import { bimestresApi } from '../../../lib/api/bimestres.api';
import { literalColor, gradeToLiteral } from '../../../lib/courseColors';
import type { AsignacionDocente } from '../../../lib/api/alumnos.api';
import type { Bimestre } from '../../../lib/api/bimestres.api';
import type { ResumenAsistencia } from '../../../types/asistencia';
import type { PreviewImportacion } from '../../../lib/api/notas.api';

interface Competencia {
  id:          string;
  curso_id:    string;
  nombre:      string;
  descripcion: string | null;
  tipo:        'regular' | 'transversal';
  orden:       number;
  peso:        number | string; // Decimal(5,2) → llega como string en JSON
}

interface AsignacionOpcion {
  id:        string;
  cursoId:   string;
  seccionId: string;
  gradoId:   string;
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
  const [refreshTick,  setRefreshTick]  = useState(0);

  // Importación desde Excel
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [descargando,      setDescargando]      = useState(false);
  const [subiendoPreview,  setSubiendoPreview]  = useState(false);
  const [importPreview,    setImportPreview]    = useState<PreviewImportacion | null>(null);
  const [importError,      setImportError]      = useState<string | null>(null);
  const [confirmando,      setConfirmando]      = useState(false);

  const opciones: AsignacionOpcion[] = asignaciones.map(a => ({
    id:        a.id,
    cursoId:   a.curso_id,
    seccionId: a.seccion_id,
    gradoId:   a.seccion.grado_id,
    label:     `${a.curso.nombre} — ${a.seccion.grado.nombre} "${a.seccion.nombre}"`,
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
          .sort((a, b) => a.numero - b.numero)[0] ?? bims[0] ?? null;

        if (asigs.length > 0) {
          const primera = asigs[0]!;
          setAsignacionSel({
            id:        primera.id,
            cursoId:   primera.curso_id,
            seccionId: primera.seccion_id,
            gradoId:   primera.seccion.grado_id,
            label:     `${primera.curso.nombre} — ${primera.seccion.grado.nombre} "${primera.seccion.nombre}"`,
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
          apiClient.get<Competencia[]>('/api/competencias', { cursoId: asignacionSel!.cursoId, gradoId: asignacionSel!.gradoId }),
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
  }, [asignacionSel, bimestreSel, session, refreshTick]);

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

  /** Promedio ponderado por peso de criterio: sum(nota*peso)/sum(peso).
   *  `peso` llega como string (Decimal serializado en JSON), por eso se
   *  coacciona con Number antes de operar — de lo contrario `sumPeso += peso`
   *  concatena cadenas y el promedio sale 0.0. */
  function computeAvg(alumnoId: string): number | null {
    let sumPonderada = 0;
    let sumPeso = 0;
    for (const comp of competencias) {
      const raw = cellGrades[alumnoId]?.[comp.id] ?? '';
      const v = parseFloat(raw);
      if (!isNaN(v) && v >= 0 && v <= 20) {
        const peso = Number(comp.peso);
        const w = Number.isFinite(peso) && peso > 0 ? peso : 100;
        sumPonderada += v * w;
        sumPeso += w;
      }
    }
    if (sumPeso === 0) return null;
    return Math.round((sumPonderada / sumPeso) * 10) / 10;
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

  function handleLock() {
    if (!saved) return;
    setLocked(true);
  }

  async function handleDescargarPlantilla() {
    if (!asignacionSel || !bimestreSel) return;
    setDescargando(true);
    setImportError(null);
    try {
      const blob = await notasApi.descargarPlantilla(asignacionSel.id, bimestreSel.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `plantilla_notas_${asignacionSel.label.replace(/[^\p{L}\p{N}]+/gu, '_')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Error al descargar la plantilla.');
    } finally {
      setDescargando(false);
    }
  }

  async function handleArchivoSeleccionado(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setSubiendoPreview(true);
    setImportError(null);
    setImportPreview(null);
    try {
      const data = await notasApi.previsualizarImportacion(file);
      setImportPreview(data);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Error al leer el archivo.');
    } finally {
      setSubiendoPreview(false);
    }
  }

  async function handleConfirmarImportacion() {
    if (!importPreview || !bimestreSel) return;
    setConfirmando(true);
    setImportError(null);
    try {
      const notasPayload = importPreview.filas
        .filter(f => f.errores.length === 0)
        .flatMap(f =>
          f.celdas
            .filter(c => c.valor !== null && !c.error)
            .map(c => ({
              alumno_id:       f.alumno_id,
              competencia_id:  c.competencia_id,
              bimestre_id:     bimestreSel.id,
              nota_vigesimal:  c.valor as number,
              tipo_evaluacion: 'Final' as const,
            }))
        );

      if (notasPayload.length === 0) {
        setImportError('No hay notas válidas para importar en este archivo.');
        return;
      }

      await notasApi.upsertBatch({ notas: notasPayload });
      setImportPreview(null);
      setSaved(true);
      setRefreshTick(t => t + 1);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Error al importar las notas.');
    } finally {
      setConfirmando(false);
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

      {importError && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
          <AlertCircle className="size-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 flex-1">{importError}</p>
          <button onClick={() => setImportError(null)} className="text-red-400 hover:text-red-600">
            <X className="size-4" />
          </button>
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
                      <div className="max-w-[90px] leading-tight">C{i + 1} ({Number(comp.peso)}%)</div>
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
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setPreview(p => !p)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Eye className="size-4" />
                {preview ? 'Ocultar' : 'Vista previa'} de libreta
              </button>

              <button
                onClick={handleDescargarPlantilla}
                disabled={descargando || !asignacionSel || !bimestreSel}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FileDown className="size-4" />
                {descargando ? 'Generando…' : 'Descargar plantilla'}
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={subiendoPreview || locked || !asignacionSel || !bimestreSel}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FileUp className="size-4" />
                {subiendoPreview ? 'Leyendo…' : 'Importar notas'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={handleArchivoSeleccionado}
              />
            </div>

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
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                >
                  <Lock className="size-4" /> Cerrar calificaciones
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

      {/* Modal de vista previa de importación */}
      {importPreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Confirmar importación de notas</h2>
                <p className="text-xs text-slate-500 mt-0.5">{importPreview.asignacion_label} · {importPreview.bimestre_nombre}</p>
              </div>
              <button onClick={() => setImportPreview(null)} className="text-slate-400 hover:text-slate-600">
                <X className="size-5" />
              </button>
            </div>

            <div className="px-5 py-3 flex flex-wrap gap-4 text-xs border-b border-slate-100 bg-slate-50">
              <span className="text-slate-600">Filas: <strong>{importPreview.resumen.total_filas}</strong></span>
              <span className="text-emerald-700">Celdas válidas: <strong>{importPreview.resumen.celdas_validas}</strong></span>
              <span className="text-red-700">Celdas con error: <strong>{importPreview.resumen.celdas_con_error}</strong></span>
            </div>

            {(importPreview.columnas_obsoletas.length > 0 || importPreview.columnas_faltantes.length > 0) && (
              <div className="px-5 py-3 border-b border-slate-100 space-y-1.5">
                {importPreview.columnas_obsoletas.length > 0 && (
                  <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                    <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                    <span>Estas columnas ya no existen (criterio eliminado) y serán ignoradas: <strong>{importPreview.columnas_obsoletas.join(', ')}</strong></span>
                  </div>
                )}
                {importPreview.columnas_faltantes.length > 0 && (
                  <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                    <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                    <span>Faltan estos criterios nuevos en el archivo (descarga la plantilla de nuevo para incluirlos): <strong>{importPreview.columnas_faltantes.join(', ')}</strong></span>
                  </div>
                )}
              </div>
            )}

            <div className="flex-1 overflow-auto px-5 py-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 sticky top-0 bg-white">
                    <th className="text-left py-2 pr-3 text-xs font-semibold text-slate-500 uppercase">Alumno</th>
                    {importPreview.filas[0]?.celdas.map(c => (
                      <th key={c.competencia_id} className="text-center py-2 px-2 text-xs font-semibold text-slate-500 min-w-[90px]">{c.competencia_nombre}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {importPreview.filas.map(f => (
                    <tr key={f.alumno_id} className={f.errores.length > 0 ? 'bg-red-50/50' : ''}>
                      <td className="py-2 pr-3">
                        <p className="font-medium text-slate-800">{f.alumno_nombre}</p>
                        {f.errores.map((e, i) => (
                          <p key={i} className="text-[11px] text-red-600 flex items-center gap-1 mt-0.5">
                            <AlertTriangle className="size-3" /> {e}
                          </p>
                        ))}
                      </td>
                      {f.celdas.map(c => (
                        <td key={c.competencia_id} className="text-center py-2 px-2">
                          <span className={`inline-block px-2 py-1 rounded-lg text-xs font-medium ${
                            c.error
                              ? 'bg-red-100 text-red-700'
                              : c.valor !== null
                                ? 'bg-emerald-50 text-emerald-800'
                                : 'text-slate-300'
                          }`} title={c.error || undefined}>
                            {c.valor !== null ? c.valor : c.error ? '⚠' : '—'}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setImportPreview(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarImportacion}
                disabled={confirmando || importPreview.resumen.celdas_validas === 0}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                {confirmando ? 'Importando…' : 'Confirmar e importar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
