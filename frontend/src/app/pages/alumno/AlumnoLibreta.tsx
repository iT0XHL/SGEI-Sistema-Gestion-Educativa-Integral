import { useState } from 'react';
import { Download, Lock, ChevronDown } from 'lucide-react';
import { COURSES, COLOR_MAP, COMPETENCIES, STUDENT_GRADES_B1, STUDENT_GRADES_B2, USERS, gradeToLiteral, literalColor } from '../../data/mockData';

const BIMESTRES = ['Bimestre I', 'Bimestre II'];
const user = USERS.Alumno;

export default function AlumnoLibreta() {
  const [bimestre, setBimestre] = useState('Bimestre II');
  const [downloading, setDownloading] = useState(false);

  const gradesData = bimestre === 'Bimestre I' ? STUDENT_GRADES_B1 : STUDENT_GRADES_B2;
  const gradesDataB1 = STUDENT_GRADES_B1;
  const gradesDataB2 = STUDENT_GRADES_B2;

  function handleDownload() {
    if (user.hasDebt) return;
    setDownloading(true);
    setTimeout(() => setDownloading(false), 1500);
  }

  // Compute overall average across all areas (average of area averages)
  const areaAvgs = COURSES.map(course => {
    const grades = (gradesData as Record<string, number[]>)[course.id] || [];
    return grades.length > 0 ? grades.reduce((a, b) => a + b, 0) / grades.length : null;
  }).filter((v): v is number => v !== null);

  const overallAvg = areaAvgs.length > 0 ? (areaAvgs.reduce((a, b) => a + b, 0) / areaAvgs.length).toFixed(2) : '—';
  const overallAvgNum = areaAvgs.length > 0 ? areaAvgs.reduce((a, b) => a + b, 0) / areaAvgs.length : null;
  const overallLit = gradeToLiteral(overallAvgNum);

  // Build table rows (with rowspan per area)
  const tableRows: React.ReactNode[] = [];

  COURSES.forEach(course => {
    const comps = COMPETENCIES[course.id] || [];
    const gradesB1 = (gradesDataB1 as Record<string, number[]>)[course.id] || [];
    const gradesB2 = (gradesDataB2 as Record<string, number[]>)[course.id] || [];
    const currentGrades = bimestre === 'Bimestre I' ? gradesB1 : gradesB2;

    const avgNum = currentGrades.length > 0
      ? currentGrades.reduce((a: number, b: number) => a + b, 0) / currentGrades.length
      : null;
    const lit = gradeToLiteral(avgNum);
    const c = COLOR_MAP[course.color];
    const totalRows = comps.length + 1; // competency rows + 1 average row

    // Competency rows
    comps.forEach((comp: string, i: number) => {
      const gradeB1 = gradesB1[i] ?? null;
      const gradeB2 = gradesB2[i] ?? null;
      const compGrade = bimestre === 'Bimestre I' ? gradeB1 : gradeB2;
      const compLit = gradeToLiteral(compGrade);

      tableRows.push(
        <tr key={`${course.id}-comp-${i}`} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
          {i === 0 && (
            <td
              rowSpan={totalRows}
              className="px-4 py-3 border-r border-slate-100 align-middle bg-white"
              style={{ verticalAlign: 'middle' }}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <div className={`size-2.5 rounded-full shrink-0 ${c.dot}`} />
                <span className="font-semibold text-slate-800 text-sm">{course.name}</span>
              </div>
              <p className="text-xs text-slate-400 ml-[18px]">{course.teacher}</p>
            </td>
          )}
          <td className="px-4 py-2.5 text-sm text-slate-600 max-w-[260px]">
            <p className="leading-snug">{comp}</p>
          </td>
          <td className="text-center px-3 py-2.5 text-slate-500 text-sm w-16">
            {gradeB1 ?? <span className="text-slate-300">—</span>}
          </td>
          <td className="text-center px-3 py-2.5 font-semibold text-slate-800 text-sm w-16">
            {gradeB2 ?? <span className="text-slate-300">—</span>}
          </td>
          <td className="text-center px-3 py-2.5 w-16">
            <span className={`inline-flex items-center justify-center w-8 h-6 rounded-lg text-xs font-bold border ${literalColor(compLit)}`}>
              {compLit}
            </span>
          </td>
        </tr>
      );
    });

    // Area average row
    const avgB1num = gradesB1.length > 0 ? gradesB1.reduce((a: number, b: number) => a + b, 0) / gradesB1.length : null;
    const avgB2num = gradesB2.length > 0 ? gradesB2.reduce((a: number, b: number) => a + b, 0) / gradesB2.length : null;

    tableRows.push(
      <tr key={`${course.id}-avg`} className={`border-b-2 border-slate-200 ${c.light}`}>
        <td className="px-4 py-2.5">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Promedio del Área</span>
        </td>
        <td className="text-center px-3 py-2.5 text-sm font-bold text-slate-600">
          {avgB1num !== null ? avgB1num.toFixed(1) : '—'}
        </td>
        <td className="text-center px-3 py-2.5">
          <span className="text-base font-bold text-slate-900">
            {avgB2num !== null ? avgB2num.toFixed(1) : '—'}
          </span>
        </td>
        <td className="text-center px-3 py-2.5">
          <span className={`inline-flex items-center justify-center w-9 h-7 rounded-xl text-xs font-bold border ${literalColor(lit)}`}>
            {lit}
          </span>
        </td>
      </tr>
    );
  });

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Libreta Digital</h1>
          <p className="text-sm text-slate-500 mt-0.5">{user.name} · {user.grade}° Sec. {user.section} · {user.year}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={bimestre}
              onChange={e => setBimestre(e.target.value)}
              className="appearance-none bg-white border border-slate-200 text-slate-700 text-sm rounded-xl px-4 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {BIMESTRES.map(b => <option key={b}>{b}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
          </div>

          <button
            onClick={handleDownload}
            disabled={user.hasDebt || downloading}
            title={user.hasDebt ? 'Bloqueado: deuda pendiente' : ''}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              user.hasDebt
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20'
            }`}
          >
            {downloading ? (
              <svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            ) : <Download className="size-4" />}
            {downloading ? 'Generando PDF…' : user.hasDebt ? 'Bloqueado' : 'Descargar PDF'}
          </button>
        </div>
      </div>

      {/* Summary card */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="sm:col-span-2 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-5 text-white">
          <p className="text-xs text-blue-200 uppercase tracking-wider mb-1">Promedio general</p>
          <p className="text-4xl font-bold leading-none">{overallAvg}</p>
          <span className="inline-block mt-2 text-xs font-bold px-2 py-0.5 rounded-lg bg-white/20 text-white border border-white/30">
            {overallLit}
          </span>
          <p className="text-xs text-blue-200 mt-2">{bimestre} · {user.year}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Cursos aprobados</p>
          <p className="text-2xl font-bold text-slate-900">
            {COURSES.filter(c => {
              const g = (gradesData as Record<string, number[]>)[c.id] || [];
              const a = g.length > 0 ? g.reduce((x, y) => x + y, 0) / g.length : 0;
              return a >= 11;
            }).length}/{COURSES.length}
          </p>
          <p className="text-xs text-slate-400 mt-1">Nota mínima: 11</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Logro destacado</p>
          <p className="text-2xl font-bold text-emerald-700">
            {COURSES.filter(c => {
              const g = (gradesData as Record<string, number[]>)[c.id] || [];
              const a = g.length > 0 ? g.reduce((x, y) => x + y, 0) / g.length : 0;
              return a >= 18;
            }).length}
          </p>
          <p className="text-xs text-slate-400 mt-1">Cursos con AD</p>
        </div>
      </div>

      {/* Main libreta table with competencies per area */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Libreta header */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">I.E. San José de Calasanz</p>
              <h2 className="text-sm font-bold text-slate-800 mt-0.5">LIBRETA DE NOTAS — {bimestre.toUpperCase()} {user.year}</h2>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Alumno: <span className="font-semibold text-slate-700">{user.name}</span></p>
              <p className="text-xs text-slate-500">Grado: <span className="font-semibold text-slate-700">{user.grade}° Secundaria — Sec. {user.section}</span></p>
            </div>
          </div>
        </div>

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
            <tbody>
              {tableRows}
            </tbody>
            <tfoot>
              <tr className="bg-blue-50 border-t-2 border-blue-200">
                <td className="px-4 py-3 border-r border-blue-100" />
                <td className="px-4 py-3 text-sm font-bold text-blue-800 uppercase tracking-wider">
                  Promedio General
                </td>
                <td className="text-center px-3 py-3 text-sm font-bold text-slate-600">
                  {(() => {
                    const b1avgs = COURSES.map(c => {
                      const g = (gradesDataB1 as Record<string, number[]>)[c.id] || [];
                      return g.length > 0 ? g.reduce((a, b) => a + b, 0) / g.length : null;
                    }).filter((v): v is number => v !== null);
                    return b1avgs.length > 0 ? (b1avgs.reduce((a, b) => a + b, 0) / b1avgs.length).toFixed(1) : '—';
                  })()}
                </td>
                <td className="text-center px-3 py-3 text-base font-bold text-blue-700">
                  {overallAvg}
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

        {/* Scale reference */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
            <span>Escala literal:</span>
            {[['AD', '18–20', 'Logro destacado'], ['A', '14–17', 'Logro esperado'], ['B', '11–13', 'En proceso'], ['C', '00–10', 'En inicio']].map(([l, r, d]) => (
              <span key={l} className={`font-medium px-2 py-0.5 rounded-md border ${literalColor(l)}`}>{l} ({r}) {d}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}