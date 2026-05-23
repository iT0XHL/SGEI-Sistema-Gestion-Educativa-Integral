import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Users, Calendar, UserCheck, BookOpen, ChevronRight, AlertTriangle, ShieldAlert, Loader2 } from 'lucide-react';
import { estadisticasApi } from '../../../lib/api/admin.api';
import type { EstadisticasDTO } from '../../../lib/api/admin.api';

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bimestres y secciones */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Estructura académica</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-lg">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Bimestres</p>
                <p className="text-lg font-bold text-slate-900">{stats.bimestres.abiertos} abierto{stats.bimestres.abiertos !== 1 ? 's' : ''} · {stats.bimestres.cerrados} cerrado{stats.bimestres.cerrados !== 1 ? 's' : ''}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Total: {stats.bimestres.total}</p>
              </div>
            </div>
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-lg">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Secciones activas</p>
                <p className="text-lg font-bold text-slate-900">{stats.secciones}</p>
              </div>
            </div>
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-lg">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Asignaciones</p>
                <p className="text-lg font-bold text-slate-900">{stats.asignaciones} docente-curso-sección</p>
              </div>
            </div>
          </div>
        </div>

        {/* Resumen de asistencia */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Asistencia docente hoy</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between px-4 py-3 bg-emerald-50 rounded-lg">
              <div>
                <p className="text-xs text-emerald-600 uppercase tracking-wider font-medium">Presentes</p>
                <p className="text-lg font-bold text-emerald-900">{stats.asistencia_hoy.presentes} ({assistancePercent}%)</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="px-3 py-2 bg-amber-50 rounded-lg">
                <p className="text-xs text-amber-600 font-medium">Tardanzas</p>
                <p className="text-sm font-bold text-amber-900">{stats.asistencia_hoy.tardanzas}</p>
              </div>
              <div className="px-3 py-2 bg-red-50 rounded-lg">
                <p className="text-xs text-red-600 font-medium">Faltas</p>
                <p className="text-sm font-bold text-red-900">{stats.asistencia_hoy.faltas}</p>
              </div>
              <div className="px-3 py-2 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-600 font-medium">Justificados</p>
                <p className="text-sm font-bold text-blue-900">{stats.asistencia_hoy.justificados}</p>
              </div>
            </div>
            <div className="text-xs text-slate-500 px-4 py-2">
              {stats.asistencia_hoy.sin_registrar} sin registrar
            </div>
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

      {/* Alertas basadas en datos reales */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="text-sm font-semibold text-slate-700">Alertas del sistema</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {stats.alumnos.bloqueados > 0 ? (
            <div className="flex items-center gap-3 px-5 py-3.5">
              <div className="flex size-8 items-center justify-center rounded-lg shrink-0 bg-red-50">
                <ShieldAlert className="size-4 text-red-500" />
              </div>
              <p className="text-sm text-slate-700 flex-1">
                {stats.alumnos.bloqueados} libreta{stats.alumnos.bloqueados !== 1 ? 's' : ''} bloqueada{stats.alumnos.bloqueados !== 1 ? 's' : ''} automáticamente por deudas
              </p>
            </div>
          ) : null}

          {stats.asistencia_hoy.sin_registrar > 0 ? (
            <div className="flex items-center gap-3 px-5 py-3.5">
              <div className="flex size-8 items-center justify-center rounded-lg shrink-0 bg-amber-50">
                <AlertTriangle className="size-4 text-amber-500" />
              </div>
              <p className="text-sm text-slate-700 flex-1">
                {stats.asistencia_hoy.sin_registrar} docente{stats.asistencia_hoy.sin_registrar !== 1 ? 's' : ''} sin registrar asistencia hoy
              </p>
            </div>
          ) : null}

          {stats.bimestres.cerrados > 0 && stats.asignaciones > 0 ? (
            <div className="flex items-center gap-3 px-5 py-3.5">
              <div className="flex size-8 items-center justify-center rounded-lg shrink-0 bg-blue-50">
                <UserCheck className="size-4 text-blue-500" />
              </div>
              <p className="text-sm text-slate-700 flex-1">
                {stats.bimestres.cerrados} bimestre{stats.bimestres.cerrados !== 1 ? 's' : ''} cerrado{stats.bimestres.cerrados !== 1 ? 's' : ''} — revisa el estado de calificaciones
              </p>
            </div>
          ) : null}

          {stats.alumnos.bloqueados === 0 && stats.asistencia_hoy.sin_registrar === 0 ? (
            <div className="px-5 py-6 text-center">
              <p className="text-sm text-slate-500">No hay alertas en este momento. El sistema opera normalmente.</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}