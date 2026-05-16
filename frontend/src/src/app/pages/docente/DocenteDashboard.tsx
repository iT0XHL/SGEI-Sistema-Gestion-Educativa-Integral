import { Link } from 'react-router';
import { BookOpen, ClipboardList, ChevronRight, TrendingUp, Users, CheckCircle2 } from 'lucide-react';
import { COURSES, COLOR_MAP, USERS } from '../../data/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const user = USERS.Docente;

// Teacher teaches math across multiple grades
const TEACHER_COURSES = [
  { ...COURSES[0], id: 'c1a', grade: '1°', section: 'A', pendingReviews: 8  },
  { ...COURSES[0], id: 'c1b', grade: '2°', section: 'A', pendingReviews: 5 },
  { ...COURSES[0], id: 'c1c', grade: '2°', section: 'B', pendingReviews: 3 },
  { ...COURSES[0], id: 'c1d', grade: '3°', section: 'A', pendingReviews: 5 },
  { ...COURSES[0], id: 'c1e', grade: '4°', section: 'A', pendingReviews: 2 },
  { ...COURSES[0], id: 'c1f', grade: '5°', section: 'A', pendingReviews: 0 },
];

const chartData = TEACHER_COURSES.map(c => ({
  name: `${c.grade} ${c.section}`,
  pendientes: c.pendingReviews,
}));

export default function DocenteDashboard() {
  const totalPending = TEACHER_COURSES.reduce((s, c) => s + c.pendingReviews, 0);

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500 mb-1">Bienvenido de vuelta 👋</p>
          <h1 className="text-2xl font-bold text-slate-900">{user.name}</h1>
          <p className="text-sm text-slate-500 mt-0.5">Área: {user.subject} · Bimestre II 2025</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-medium">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            En clase
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Secciones a cargo', value: `${TEACHER_COURSES.length}`, sub: 'Año 2025', icon: BookOpen, color: 'bg-blue-50 text-blue-600' },
          { label: 'Tareas pendientes', value: `${totalPending}`, sub: 'Por calificar', icon: ClipboardList, color: 'bg-amber-50 text-amber-600' },
          { label: 'Total estudiantes', value: '168', sub: 'En todas las secciones', icon: Users, color: 'bg-purple-50 text-purple-600' },
          { label: 'Notas ingresadas', value: '85%', sub: 'Bimestre II', icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className={`flex size-10 items-center justify-center rounded-xl mb-3 ${s.color}`}>
              <s.icon className="size-5" />
            </div>
            <p className="text-2xl font-bold text-slate-900 leading-none">{s.value}</p>
            <p className="text-sm font-medium text-slate-600 mt-1">{s.label}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Courses */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-800">Mis secciones</h2>
            <Link to="/docente/tareas" className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors">
              Gestionar <ChevronRight className="size-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TEACHER_COURSES.map(course => {
              const c = COLOR_MAP[course.color];
              return (
                <Link
                  key={course.id}
                  to={`/docente/tareas?curso=${course.id}&grado=${course.grade}&seccion=${course.section}`}
                  className="bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md hover:border-slate-300 transition-all group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`flex size-9 items-center justify-center rounded-xl ${c.bg} text-white`}>
                        <BookOpen className="size-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{course.name}</p>
                        <p className="text-xs text-slate-400">{course.grade}° Sec. {course.section}</p>
                      </div>
                    </div>
                    <ChevronRight className="size-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500">{course.totalStudents} estudiantes</p>
                    {course.pendingReviews > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-medium">
                        <span className="size-1.5 rounded-full bg-amber-500" />
                        {course.pendingReviews} pendientes
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
                        <CheckCircle2 className="size-3" /> Al día
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Chart + Quick actions */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Tareas pendientes por sección</h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis key="xaxis" dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis key="yaxis" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip
                  key="tooltip"
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar key="bar" dataKey="pendientes" fill="#3b82f6" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Acciones rápidas</h3>
            <div className="space-y-2">
              {[
                { label: 'Tomar asistencia', desc: 'Registro del día de hoy', to: '/docente/asistencia', color: 'text-emerald-600 bg-emerald-50' },
                { label: 'Subir actividad', desc: 'Nueva tarea o material', to: '/docente/tareas', color: 'text-blue-600 bg-blue-50' },
                { label: 'Ingresar notas', desc: 'Bimestre II en curso', to: '/docente/notas', color: 'text-purple-600 bg-purple-50' },
              ].map(a => (
                <Link
                  key={a.to}
                  to={a.to}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
                >
                  <div className={`flex size-8 items-center justify-center rounded-lg ${a.color}`}>
                    <TrendingUp className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{a.label}</p>
                    <p className="text-xs text-slate-400">{a.desc}</p>
                  </div>
                  <ChevronRight className="size-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}