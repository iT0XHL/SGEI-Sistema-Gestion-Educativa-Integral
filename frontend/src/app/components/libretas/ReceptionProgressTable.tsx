import { RecepcionStatusBadge } from './LibretaStatusBadge';
import type { RecepcionRow } from '@/types/libreta';

export function ReceptionProgressTable({ rows }: { rows: RecepcionRow[] }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Docente</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Curso</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Grado</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Sección</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Bimestre</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Alumnos</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Esperadas</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Registradas</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase">%</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-sm text-slate-400">
                  No se encontraron registros con los filtros actuales.
                </td>
              </tr>
            ) : rows.map((row, i) => {
              const pct = row.notas_esperadas > 0
                ? Math.round((row.notas_registradas / row.notas_esperadas) * 100)
                : 0;
              const pctColor = pct === 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';
              return (
                <tr key={`${row.docente_id}-${row.curso_id}-${row.bimestre_numero}-${i}`} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{row.docente_nombre}</td>
                  <td className="px-4 py-3 text-slate-600">{row.curso_nombre}</td>
                  <td className="text-center px-3 py-3 text-slate-600">{row.grado}</td>
                  <td className="text-center px-3 py-3 text-slate-600">{row.seccion_nombre}</td>
                  <td className="text-center px-3 py-3 text-slate-600">{row.bimestre_nombre}</td>
                  <td className="text-center px-3 py-3 text-slate-600">{row.total_alumnos}</td>
                  <td className="text-center px-3 py-3 text-slate-600">{row.notas_esperadas}</td>
                  <td className="text-center px-3 py-3 text-slate-600">{row.notas_registradas}</td>
                  <td className="text-center px-3 py-3">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${pctColor}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-medium text-slate-500">{pct}%</span>
                    </div>
                  </td>
                  <td className="text-center px-3 py-3">
                    <RecepcionStatusBadge estado={row.estado} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
