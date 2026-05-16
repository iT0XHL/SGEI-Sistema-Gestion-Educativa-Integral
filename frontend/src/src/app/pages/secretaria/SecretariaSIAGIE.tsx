import { useState } from 'react';
import { CheckCircle2, AlertTriangle, Download, RefreshCw, FileOutput, Info, X } from 'lucide-react';

interface ValidationItem {
  id: string; label: string; status: 'ok' | 'warning' | 'error'; detail: string;
}

const INITIAL_CHECKS: ValidationItem[] = [
  { id: 'v1', label: 'Alumnos matriculados con DNI registrado',       status: 'ok',      detail: '124/124 alumnos con DNI' },
  { id: 'v2', label: 'Notas del Bimestre II ingresadas',              status: 'warning',  detail: '116/124 alumnos con notas completas (8 pendientes)' },
  { id: 'v3', label: 'Asistencias del mes registradas',               status: 'ok',      detail: '120/124 alumnos con asistencia registrada' },
  { id: 'v4', label: 'Escala vigesimal convertida a literal',         status: 'ok',      detail: 'Conversión AD/A/B/C aplicada correctamente' },
  { id: 'v5', label: 'Datos del tutor/apoderado completos',           status: 'warning',  detail: '4 apoderados sin correo electrónico registrado' },
  { id: 'v6', label: 'Estructura de archivo SIAGIE válida',           status: 'ok',      detail: 'Formato compatible con MINEDU versión 3.4' },
  { id: 'v7', label: 'Sin duplicados de matrícula',                   status: 'ok',      detail: 'No se encontraron duplicados' },
  { id: 'v8', label: 'Notas fuera de rango (0–20)',                   status: 'error',   detail: '2 notas registradas fuera del rango válido en Matemática 2°A' },
];

export default function SecretariaSIAGIE() {
  const [checks, setChecks] = useState<ValidationItem[]>(INITIAL_CHECKS);
  const [validating, setValidating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const errors   = checks.filter(c => c.status === 'error' && !dismissed.has(c.id)).length;
  const warnings = checks.filter(c => c.status === 'warning' && !dismissed.has(c.id)).length;
  const ok       = checks.filter(c => c.status === 'ok').length;
  const canExport = errors === 0;

  function handleValidate() {
    setValidating(true);
    setExported(false);
    setTimeout(() => {
      setChecks(prev => prev.map(c =>
        c.id === 'v8' ? { ...c, status: 'ok', detail: 'Validado y corregido correctamente' } : c
      ));
      setValidating(false);
    }, 1800);
  }

  function handleExport() {
    if (!canExport) return;
    setExporting(true);
    setTimeout(() => { setExporting(false); setExported(true); }, 1500);
  }

  function dismiss(id: string) {
    setDismissed(prev => new Set([...prev, id]));
  }

  const readyCount = 116;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Exportar al SIAGIE</h1>
        <p className="text-sm text-slate-500 mt-0.5">Genera el archivo de carga masiva para el portal del MINEDU</p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-teal-50 border border-teal-200 rounded-2xl p-4">
        <Info className="size-5 text-teal-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-teal-800">Interoperabilidad con SIAGIE</p>
          <p className="text-sm text-teal-700 mt-0.5">
            Este módulo genera el archivo oficial con estructura MINEDU para carga masiva de notas y asistencias.
            Realiza la auditoría previa antes de exportar para garantizar envíos exitosos.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total alumnos', value: '124', color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' },
          { label: 'Con notas', value: '116', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
          { label: 'Con asistencia', value: '120', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
          { label: 'Listos para exportar', value: `${readyCount}`, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border p-4 text-center ${s.bg}`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className={`text-xs font-medium ${s.color} mt-0.5 opacity-80`}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Conversion preview */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Motor de conversión escalar</h2>
        <p className="text-xs text-slate-500 mb-3">El sistema aplica la siguiente conversión automática antes de exportar:</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { range: '18–20', literal: 'AD', label: 'Logro destacado', c: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
            { range: '14–17', literal: 'A',  label: 'Logro esperado',  c: 'border-blue-200 bg-blue-50 text-blue-700' },
            { range: '11–13', literal: 'B',  label: 'En proceso',      c: 'border-amber-200 bg-amber-50 text-amber-700' },
            { range: '00–10', literal: 'C',  label: 'En inicio',       c: 'border-red-200 bg-red-50 text-red-700' },
          ].map(s => (
            <div key={s.literal} className={`rounded-xl border p-3 text-center ${s.c}`}>
              <p className="text-2xl font-black">{s.literal}</p>
              <p className="text-xs font-semibold mt-0.5">{s.range}</p>
              <p className="text-xs opacity-75 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Validation checks */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
          <div>
            <h2 className="text-sm font-semibold text-slate-700">Auditoría previa a la exportación</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {ok} correctos · {warnings} advertencias · {errors} errores
            </p>
          </div>
          <button
            onClick={handleValidate}
            disabled={validating}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 text-xs font-medium transition-colors"
          >
            {validating ? (
              <><svg className="animate-spin size-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Validando…</>
            ) : (
              <><RefreshCw className="size-3.5" />Volver a validar</>
            )}
          </button>
        </div>
        <div className="divide-y divide-slate-50">
          {checks.map(check => {
            const isDismissed = dismissed.has(check.id);
            if (isDismissed) return null;
            return (
              <div key={check.id} className={`flex items-start gap-3 px-5 py-3.5 ${
                check.status === 'error' ? 'bg-red-50/30' :
                check.status === 'warning' ? 'bg-amber-50/30' : ''
              }`}>
                <div className={`mt-0.5 shrink-0 size-5 rounded-full flex items-center justify-center ${
                  check.status === 'ok'      ? 'bg-emerald-100 text-emerald-600' :
                  check.status === 'warning' ? 'bg-amber-100 text-amber-600' :
                  'bg-red-100 text-red-600'
                }`}>
                  {check.status === 'ok'      ? <CheckCircle2 className="size-3.5" /> :
                   check.status === 'warning' ? <AlertTriangle className="size-3.5" /> :
                   <X className="size-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{check.label}</p>
                  <p className={`text-xs mt-0.5 ${
                    check.status === 'ok' ? 'text-emerald-600' :
                    check.status === 'warning' ? 'text-amber-600' :
                    'text-red-600'
                  }`}>{check.detail}</p>
                </div>
                {check.status !== 'ok' && (
                  <button
                    onClick={() => dismiss(check.id)}
                    className="shrink-0 p-1 rounded-md hover:bg-slate-200 text-slate-400 transition-colors"
                    title="Ignorar advertencia"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Export section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Generar archivo SIAGIE</h2>

        {!canExport && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
            <AlertTriangle className="size-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">
              Existen <strong>{errors} error{errors > 1 ? 'es' : ''}</strong> que deben corregirse antes de exportar.
              Usa "Volver a validar" después de corregirlos o ignóralos si no son críticos.
            </p>
          </div>
        )}

        {exported && (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4">
            <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">Archivo generado exitosamente</p>
              <p className="text-xs text-emerald-600 mt-0.5">SIAGIE_IE1234567_BIM2_2025.xlsx — {readyCount} alumnos exportados</p>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <FileOutput className="size-5 text-slate-500" />
              <div>
                <p className="text-sm font-semibold text-slate-700">SIAGIE_IE1234567_BIM2_2025.xlsx</p>
                <p className="text-xs text-slate-400">Estructura oficial MINEDU · {readyCount} registros</p>
              </div>
            </div>
            <p className="text-xs text-slate-500">Contiene: Nóminas, calificaciones, asistencias y datos del alumno en formato de carga masiva.</p>
          </div>
          <button
            onClick={handleExport}
            disabled={!canExport || exporting}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all self-center shrink-0 ${
              !canExport
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm shadow-teal-600/20'
            }`}
          >
            {exporting ? (
              <><svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Generando…</>
            ) : (
              <><Download className="size-4" />Exportar SIAGIE</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
