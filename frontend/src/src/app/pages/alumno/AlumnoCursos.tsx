import { useState } from 'react';
import { Link } from 'react-router';
import { Search, BookOpen, Clock, ChevronRight, AlertCircle } from 'lucide-react';
import { COURSES, COLOR_MAP, STUDENT_GRADES_B2, gradeToLiteral, literalColor } from '../../data/mockData';

export default function AlumnoCursos() {
  const [search, setSearch] = useState('');

  const filtered = COURSES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.teacher.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mis Cursos</h1>
          <p className="text-sm text-slate-500 mt-0.5">3° Secundaria A · Bimestre II 2025 · {COURSES.length} cursos</p>
        </div>
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="search"
            placeholder="Buscar curso o docente…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <AlertCircle className="size-10 text-slate-300 mb-3" />
          <p className="text-slate-600 font-medium">No se encontraron cursos</p>
          <p className="text-sm text-slate-400 mt-1">Intenta con otro término de búsqueda</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(course => {
            const c = COLOR_MAP[course.color];
            const grades = (STUDENT_GRADES_B2 as Record<string, number[]>)[course.id] || [];
            const courseAvg = grades.length > 0 ? grades.reduce((a, b) => a + b, 0) / grades.length : null;
            const lit = gradeToLiteral(courseAvg);

            return (
              <Link
                key={course.id}
                to={`/alumno/cursos/${course.id}`}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-slate-300 transition-all duration-200 group flex flex-col"
              >
                {/* Color header */}
                <div className={`${c.bg} h-2`} />

                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`flex size-10 items-center justify-center rounded-xl ${c.light}`}>
                      <BookOpen className={`size-5 ${c.text}`} />
                    </div>
                    {courseAvg !== null && (
                      <span className={`text-xs font-bold px-2 py-1 rounded-lg border ${literalColor(lit)}`}>
                        {courseAvg.toFixed(1)} · {lit}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-semibold text-slate-900 leading-snug">{course.name}</h3>
                  <p className="text-sm text-slate-500 mt-0.5">{course.teacher}</p>
                  <p className="text-xs text-slate-400 mt-2 flex-1 leading-relaxed">{course.description}</p>

                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Clock className="size-3.5 text-slate-400 shrink-0" />
                      <p className="text-xs text-slate-500 truncate">{course.schedule}</p>
                    </div>
                    {course.pendingReviews > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="size-3.5 shrink-0 flex items-center justify-center">
                          <span className="size-2 rounded-full bg-amber-400" />
                        </span>
                        <p className="text-xs text-amber-700 font-medium">
                          {course.pendingReviews} actividad{course.pendingReviews > 1 ? 'es' : ''} pendiente{course.pendingReviews > 1 ? 's' : ''}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-slate-400">Ver materiales y notas</span>
                    <ChevronRight className="size-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
