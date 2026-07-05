import { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { useSession } from '../../../lib/hooks/useSession';
import { asistenciasApi } from '../../../lib/api/asistencias.api';
import { alumnosApi } from '../../../lib/api/alumnos.api';
import { getCourseColor } from '../../../lib/courseColors';
import type { AsistenciaRegistro } from '../../../types/asistencia';
import type { AsignacionDocente } from '../../../lib/api/alumnos.api';

// ── Helpers ────────────────────────────────────────────────────────────────────

function PercentBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-medium text-slate-600 w-10 text-right">{value}%</span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AlumnoAsistencias() {
  const { session, loading: sessionLoading } = useSession();

  const [registros,    setRegistros]    = useState<AsistenciaRegistro[]>([]);
  const [asignaciones, setAsignaciones] = useState<AsignacionDocente[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);

  // ── Data loading ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (sessionLoading || !session) return;
    const entidadId = session.entidadId;

    let aborted = false;

    async function cargar() {
      try {
        setLoading(true);
        setError(null);

        const [regs, asigs] = await Promise.all([
          asistenciasApi.listar({}),
          alumnosApi.cursos(entidadId),
        ]);
        if (aborted) return;

        setRegistros(regs);
        setAsignaciones(asigs);
      } catch (err) {
        if (!aborted) {
          setError(err instanceof Error ? err.message : 'Error al cargar asistencias');
        }
      } finally {
        if (!aborted) setLoading(false);
      }
    }

    cargar();
    return () => { aborted = true; };
  }, [session, sessionLoading]);

  // ── Derived totals ──────────────────────────────────────────────────────────

  const totalPresente  = registros.filter(r => r.estado === 'P').length;
  const totalFalta     = registros.filter(r => r.estado === 'F').length;
  const totalTardanza  = registros.filter(r => r.estado === 'T').length;
  const totalDias      = registros.length;

  const presentePct = totalDias > 0 ? Math.round((totalPresente / totalDias) * 100) : 0;
  const tardanzaPct = totalDias > 0 ? Math.round((totalTardanza / totalDias) * 100) : 0;
  const faltaPct    = totalDias > 0 ? Math.round((totalFalta    / totalDias) * 100) : 0;

  // ── Dynamic subtitle ────────────────────────────────────────────────────────

  const fechaReciente = registros.length > 0
    ? new Date(registros[registros.length - 1]!.fecha)
    : new Date();
  const mesAnio      = fechaReciente.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
  const gradoSeccion = asignaciones.length > 0
    ? `${asignaciones[0]!.seccion.grado.nombre} "${asignaciones[0]!.seccion.nombre}"`
    : '';
  const subtitulo    = `Registro de asistencia — ${mesAnio}${gradoSeccion ? ` · ${gradoSeccion}` : ''}`;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Asistencias</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {loading ? 'Cargando…' : subtitulo}
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
          <AlertCircle className="size-5 text-red-600 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Summary cards */}
      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          <div className="h-24 rounded-2xl bg-slate-200 animate-pulse" />
          <div className="h-24 rounded-2xl bg-slate-200 animate-pulse" />
          <div className="h-24 rounded-2xl bg-slate-200 animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
            <p className="text-3xl font-bold text-emerald-700">{presentePct}%</p>
            <p className="text-sm font-medium text-emerald-600 mt-0.5">Asistencias</p>
            <p className="text-xs text-emerald-500 mt-1">{totalPresente} de {totalDias} días</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
            <p className="text-3xl font-bold text-amber-700">{tardanzaPct}%</p>
            <p className="text-sm font-medium text-amber-600 mt-0.5">Tardanzas</p>
            <p className="text-xs text-amber-500 mt-1">{totalTardanza} de {totalDias} días</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
            <p className="text-3xl font-bold text-red-700">{faltaPct}%</p>
            <p className="text-sm font-medium text-red-600 mt-0.5">Inasistencias</p>
            <p className="text-xs text-red-500 mt-1">{totalFalta} de {totalDias} días</p>
          </div>
        </div>
      )}

      {/* Per-course table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="text-sm font-semibold text-slate-700">Asistencia por curso</h2>
        </div>

        {loading ? (
          <div className="divide-y divide-slate-50">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="px-5 py-3 flex items-center gap-4 animate-pulse">
                <div className="size-2.5 rounded-full bg-slate-200 shrink-0" />
                <div className="flex-1 h-4 rounded bg-slate-200" />
                <div className="w-8 h-4 rounded bg-slate-200" />
                <div className="w-8 h-4 rounded bg-slate-200" />
                <div className="w-8 h-4 rounded bg-slate-200" />
                <div className="w-28 h-2 rounded-full bg-slate-200" />
              </div>
            ))}
          </div>
        ) : asignaciones.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-slate-400 text-sm">No hay registros de asistencia aún</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Curso</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500">Pres.</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500">Tard.</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500">Falt.</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 min-w-[120px]">% Asistencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {asignaciones.map((asig, idx) => {
                  const c   = getCourseColor(idx);
                  const pct = presentePct;
                  return (
                    <tr key={asig.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`size-2.5 rounded-full shrink-0 ${c.dot}`} />
                          <span className="font-medium text-slate-800">{asig.curso.nombre}</span>
                        </div>
                      </td>
                      <td className="text-center px-3 py-3">
                        <span className="text-emerald-700 font-semibold">{totalPresente}</span>
                      </td>
                      <td className="text-center px-3 py-3">
                        <span className="text-amber-700 font-semibold">{totalTardanza}</span>
                      </td>
                      <td className="text-center px-3 py-3">
                        <span className="text-red-700 font-semibold">{totalFalta}</span>
                      </td>
                      <td className="px-4 py-3">
                        <PercentBar
                          value={pct}
                          color={pct >= 90 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-400' : 'bg-red-400'}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            ⚠ El mínimo de asistencia requerido es <strong>70%</strong>. Por debajo de este límite el estudiante podría perder el derecho a evaluación.
          </p>
        </div>
      </div>
    </div>
  );
}
