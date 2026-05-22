import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Users, Calendar, UserCheck, TrendingUp, BookOpen, ChevronRight, AlertTriangle, ShieldAlert, Loader2 } from 'lucide-react';
import { estadisticasApi } from '../../../lib/api/admin.api';
import type { EstadisticasDTO } from '../../../lib/api/admin.api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function AdminDashboard() {
  const [stats, setStats] = useState<EstadisticasDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    estadisticasApi
      .obtener()
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : 'Error al cargar estadísticas'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3">
          <Loader2 className="size-6 animate-spin text-slate-400" />
          <p className="text-slate-600">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        <div className="text-center py-12">
          <p className="text-slate-500">No hay datos disponibles</p>
        </div>
      </div>
    );
  }

  const assistancePercent = stats.asistencia_hoy.total_docentes > 0
    ? Math.round((stats.asistencia_hoy.presentes / stats.asistencia_hoy.total_docentes) * 100)
    : 0;

  const gradeData = [
    { grado: '1°', promedio: 14.2 },
    { grado: '2°', promedio: 13.8 },
    { grado: '3°', promedio: 14.9 },
    { grado: '4°', promedio: 15.1 },
    { grado: '5°', promedio: 14.6 },
  ];

  const paymentData = [
    { name: 'Pagado', value: 68, color: '#059669' },
    { name: 'Pendiente', value: 24, color: '#d97706' },
    { name: 'Vencido', value: 8, color: '#dc2626' },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <p className="text-sm text-slate-500 mb-1">Panel de administración</p>
        <h1 className="text-2xl font-bold text-slate-900">Vista General del Sistema</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {stats.periodo
            ? `${stats.periodo.nombre} · Año escolar ${stats.periodo.anio}`
            : 'Sin período académico activo'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Estudiantes matriculados',
            value: `${stats.alumnos.total}`,
            sub: stats.periodo?.nombre || 'Año actual',
            icon: BookOpen,
            color: 'bg-blue-50 text-blue-600',
            change: stats.alumnos.bloqueados > 0 ? `${stats.alumnos.bloqueados} bloqueados` : 'Ninguno bloqueado',
          },
          {
            label: 'Docentes activos',
            value: `${stats.docentes.total}`,
            sub: 'En el sistema',
            icon: Users,
            color: 'bg-indigo-50 text-indigo-600',
            change: 'Personal activo',
          },
          {
            label: 'Asistencia hoy',
            value: `${assistancePercent}%`,
            sub: 'Docentes presentes',
            icon: UserCheck,
            color: 'bg-emerald-50 text-emerald-600',
            change: `${stats.asistencia_hoy.presentes}/${stats.asistencia_hoy.total_docentes}`,
          },
          {
            label: 'Libretas bloqueadas',
            value: `${stats.alumnos.bloqueados}`,
            sub: 'Por deudas — automático',
            icon: ShieldAlert,
            color: 'bg-amber-50 text-amber-600',
            change: 'Detección automática',
          },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-start justify-between mb-3">
              <div className={`flex size-10 items-center justify-center rounded-xl ${s.color}`}>
                <s.icon className="size-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 leading-none">{s.value}</p>
            <p className="text-sm font-medium text-slate-600 mt-1">{s.label}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.change}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Avg grades chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Promedio general por grado — Bimestre II 2025</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={gradeData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis key="xaxis" dataKey="grado" tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <YAxis key="yaxis" domain={[0, 20]} tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip
                key="tooltip"
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                cursor={{ fill: '#f8fafc' }}
              />
              <Bar key="bar" dataKey="promedio" fill="#6366f1" radius={[6, 6, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Payment status pie */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Estado de pagos</h2>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie key="pie" data={paymentData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value" paddingAngle={3} isAnimationActive={false}>
                {paymentData.map((entry, i) => <Cell key={`cell-admin-${i}`} fill={entry.color} />)}
              </Pie>
              <Tooltip key="tooltip" contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {paymentData.map(d => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-xs text-slate-600">{d.name}</span>
                </div>
                <span className="text-xs font-bold text-slate-700">{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sections grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Gestión de Cuentas',  desc: 'Crear y gestionar accesos del personal', to: '/admin/cuentas',     icon: Users,     color: 'bg-blue-600',    count: 'Usuarios' },
          { label: 'Horarios',            desc: 'Asignar cursos, horas y docentes',       to: '/admin/horarios',    icon: Calendar,  color: 'bg-indigo-600',  count: `${stats.asignaciones} asignaciones` },
          { label: 'Asistencia Docente',  desc: 'Control de puntualidad del personal',   to: '/admin/asistencia',  icon: UserCheck, color: 'bg-emerald-600', count: `Hoy: ${stats.asistencia_hoy.presentes} presentes` },
        ].map(s => (
          <Link
            key={s.to}
            to={s.to}
            className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md hover:border-slate-300 transition-all group flex flex-col"
          >
            <div className={`flex size-10 items-center justify-center rounded-xl mb-3 ${s.color} text-white`}>
              <s.icon className="size-5" />
            </div>
            <p className="text-sm font-semibold text-slate-800">{s.label}</p>
            <p className="text-xs text-slate-400 mt-1 flex-1">{s.desc}</p>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-500">{s.count}</span>
              <ChevronRight className="size-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
            </div>
          </Link>
        ))}
      </div>

      {/* Recent alerts */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="text-sm font-semibold text-slate-700">Alertas recientes del sistema</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {[
            { icon: AlertTriangle, color: 'text-amber-500 bg-amber-50', msg: '3 docentes con notas del Bimestre II sin cerrar', time: 'Hace 2 horas' },
            { icon: ShieldAlert, color: 'text-red-500 bg-red-50', msg: '14 libretas bloqueadas automáticamente por deudas de mayo', time: 'Hace 4 horas' },
            { icon: UserCheck, color: 'text-orange-500 bg-orange-50', msg: 'Luis Quispe registró inasistencia hoy (C. y Tecnología)', time: 'Hoy 8:05 AM' },
            { icon: Users, color: 'text-blue-500 bg-blue-50', msg: 'Nueva cuenta docente creada: Marco Benítez Soto', time: 'Ayer 3:12 PM' },
          ].map((a, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors">
              <div className={`flex size-8 items-center justify-center rounded-lg shrink-0 ${a.color}`}>
                <a.icon className="size-4" />
              </div>
              <p className="text-sm text-slate-700 flex-1">{a.msg}</p>
              <span className="text-xs text-slate-400 shrink-0">{a.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}