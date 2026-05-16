import { COURSES, COLOR_MAP, STUDENTS_3A } from '../../data/mockData';

const student = STUDENTS_3A.find(s => s.id === 's3')!; // Carlos Mendoza

const ATTENDANCE_PER_COURSE = COURSES.map(c => ({
  ...c,
  present: student.present,
  late: student.late,
  absent: student.absent,
  total: student.total,
}));

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

export default function AlumnoAsistencias() {
  const totalPresent = student.present;
  const totalLate = student.late;
  const totalAbsent = student.absent;
  const total = student.total;

  const presentPct = Math.round((totalPresent / total) * 100);
  const latePct    = Math.round((totalLate    / total) * 100);
  const absentPct  = Math.round((totalAbsent  / total) * 100);

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Asistencias</h1>
        <p className="text-sm text-slate-500 mt-0.5">Registro de asistencia — Mayo 2025 · 3° Secundaria A</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
          <p className="text-3xl font-bold text-emerald-700">{presentPct}%</p>
          <p className="text-sm font-medium text-emerald-600 mt-0.5">Asistencias</p>
          <p className="text-xs text-emerald-500 mt-1">{totalPresent} de {total} días</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
          <p className="text-3xl font-bold text-amber-700">{latePct}%</p>
          <p className="text-sm font-medium text-amber-600 mt-0.5">Tardanzas</p>
          <p className="text-xs text-amber-500 mt-1">{totalLate} de {total} días</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
          <p className="text-3xl font-bold text-red-700">{absentPct}%</p>
          <p className="text-sm font-medium text-red-600 mt-0.5">Inasistencias</p>
          <p className="text-xs text-red-500 mt-1">{totalAbsent} de {total} días</p>
        </div>
      </div>

      {/* Per-course table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="text-sm font-semibold text-slate-700">Asistencia por curso</h2>
        </div>
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
              {ATTENDANCE_PER_COURSE.map(row => {
                const c = COLOR_MAP[row.color];
                const pct = Math.round((row.present / row.total) * 100);
                return (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`size-2.5 rounded-full shrink-0 ${c.dot}`} />
                        <span className="font-medium text-slate-800">{row.name}</span>
                      </div>
                    </td>
                    <td className="text-center px-3 py-3">
                      <span className="text-emerald-700 font-semibold">{row.present}</span>
                    </td>
                    <td className="text-center px-3 py-3">
                      <span className="text-amber-700 font-semibold">{row.late}</span>
                    </td>
                    <td className="text-center px-3 py-3">
                      <span className="text-red-700 font-semibold">{row.absent}</span>
                    </td>
                    <td className="px-4 py-3">
                      <PercentBar value={pct} color={pct >= 90 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-400' : 'bg-red-400'} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            ⚠ El mínimo de asistencia requerido es <strong>70%</strong>. Por debajo de este límite el estudiante podría perder el derecho a evaluación.
          </p>
        </div>
      </div>
    </div>
  );
}