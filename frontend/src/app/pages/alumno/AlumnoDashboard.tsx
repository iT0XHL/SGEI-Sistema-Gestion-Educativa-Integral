import { Link } from 'react-router';
import { BookOpen, ChevronRight, Clock, CheckCircle2 } from 'lucide-react';
import { COURSES, COLOR_MAP, ACTIVITIES, USERS, STUDENT_GRADES_B2, gradeToLiteral, literalColor } from '../../data/mockData';

const user = USERS.Alumno;

export default function AlumnoDashboard() {
  const allGrades = Object.values(STUDENT_GRADES_B2).flat();
  const avg = (allGrades.reduce((a, b) => a + b, 0) / allGrades.length).toFixed(1);

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500 mb-1">Buenos días 👋</p>
          <h1 className="text-2xl font-bold text-slate-900">{user.name}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{user.grade}° Sec. {user.section} · Año escolar {user.year}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-medium self-start sm:self-auto">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          Bimestre II activo
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Courses grid */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-800">Mis cursos</h2>
            <Link to="/alumno/cursos" className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors">
              Ver todos <ChevronRight className="size-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {COURSES.slice(0, 4).map(course => {
              const c = COLOR_MAP[course.color];
              const grades = STUDENT_GRADES_B2[course.id as keyof typeof STUDENT_GRADES_B2] || [];
              const courseAvg = grades.length > 0 ? (grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(1) : '—';
              const lit = gradeToLiteral(grades.length > 0 ? grades.reduce((a, b) => a + b, 0) / grades.length : null);
              return (
                <Link
                  key={course.id}
                  to={`/alumno/cursos/${course.id}`}
                  className="bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md hover:border-slate-300 transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`flex size-9 items-center justify-center rounded-xl ${c.bg} text-white`}>
                      <BookOpen className="size-4" />
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${literalColor(lit)}`}>
                      {courseAvg !== '—' ? `${courseAvg} (${lit})` : 'Sin notas'}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800">{course.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{course.teacher}</p>
                  <div className="flex items-center gap-1.5 mt-3">
                    <Clock className="size-3 text-slate-400" />
                    <p className="text-xs text-slate-500 truncate">{course.nextActivity}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right column: upcoming activities */}
        <div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Actividades próximas</h3>
              <Link to="/alumno/cursos" className="text-xs text-blue-600 hover:underline">Ver más</Link>
            </div>
            <div className="divide-y divide-slate-50">
              {ACTIVITIES.map(act => (
                <div key={act.id} className="px-4 py-3 flex items-start gap-3">
                  <div className={`mt-0.5 flex size-6 items-center justify-center rounded-full shrink-0 ${
                    act.status === 'pending'   ? 'bg-amber-100 text-amber-600' :
                    act.status === 'submitted' ? 'bg-blue-100 text-blue-600' :
                    'bg-emerald-100 text-emerald-600'
                  }`}>
                    {act.status === 'graded' ? <CheckCircle2 className="size-3.5" /> : <Clock className="size-3.5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-700 font-medium leading-snug truncate">{act.title}</p>
                    <p className="text-xs text-slate-400">Vence: {act.dueDate}</p>
                  </div>
                  {act.score && (
                    <span className="text-xs font-bold text-emerald-700 shrink-0">{act.score}/20</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent grades — REMOVED */}
    </div>
  );
}