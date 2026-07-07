import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { AppShell } from './components/layout/AppShell';
import { RouteErrorBoundary } from './components/feedback/ErrorBoundary';

const Login = lazy(() => import('./pages/Login'));
const ForceChangePassword = lazy(() => import('./pages/ForceChangePassword'));
const AlumnoDashboard = lazy(() => import('./pages/alumno/AlumnoDashboard'));
const AlumnoCursos = lazy(() => import('./pages/alumno/AlumnoCursos'));
const AlumnoCursoDetalle = lazy(() => import('./pages/alumno/AlumnoCursoDetalle'));
const AlumnoLibreta = lazy(() => import('./pages/alumno/AlumnoLibreta'));
const AlumnoAsistencias = lazy(() => import('./pages/alumno/AlumnoAsistencias'));
const AlumnoPagos = lazy(() => import('./pages/alumno/AlumnoPagos'));
const AlumnoHorario = lazy(() => import('./pages/alumno/AlumnoHorario'));
const DocenteDashboard = lazy(() => import('./pages/docente/DocenteDashboard'));
const DocenteAsistencia = lazy(() => import('./pages/docente/DocenteAsistencia'));
const DocenteAsistenciaHistorial = lazy(() => import('./pages/docente/DocenteAsistenciaHistorial'));
const DocenteTareas = lazy(() => import('./pages/docente/DocenteTareas'));
const DocenteNotas = lazy(() => import('./pages/docente/DocenteNotas'));
const DocenteSimulacro = lazy(() => import('./pages/docente/DocenteSimulacro'));
const DocenteHorario = lazy(() => import('./pages/docente/DocenteHorario'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminCuentas = lazy(() => import('./pages/admin/AdminCuentas'));
const AdminHorarios = lazy(() => import('./pages/admin/AdminHorarios'));
const AdminAsistenciaDocente = lazy(() => import('./pages/admin/AdminAsistenciaDocente'));
const AdminAsistenciaAlumnos = lazy(() => import('./pages/admin/AdminAsistenciaAlumnos'));
const AdminPeriodo = lazy(() => import('./pages/admin/AdminPeriodo'));
const AdminBimestres = lazy(() => import('./pages/admin/AdminBimestres'));
const AdminEscalaLiteral = lazy(() => import('./pages/admin/AdminEscalaLiteral'));
const AdminInstitucion = lazy(() => import('./pages/admin/AdminInstitucion'));
const AdminCompetencias = lazy(() => import('./pages/admin/AdminCompetencias'));
const AdminBloqueo = lazy(() => import('./pages/admin/AdminBloqueo'));
const AdminAsignaciones = lazy(() => import('./pages/admin/AdminAsignaciones'));
const AdminEstructura = lazy(() => import('./pages/admin/AdminEstructura'));
const AdminSimulacro = lazy(() => import('./pages/admin/AdminSimulacro'));
const SecretariaDashboard = lazy(() => import('./pages/secretaria/SecretariaDashboard'));
const SecretariaVouchers = lazy(() => import('./pages/secretaria/SecretariaVouchers'));
const SecretariaPagos = lazy(() => import('./pages/secretaria/SecretariaPagos'));
const SecretariaSIAGIE = lazy(() => import('./pages/secretaria/SecretariaSIAGIE'));
const SecretariaAlumnos = lazy(() => import('./pages/secretaria/SecretariaAlumnos'));
const SecretariaSituacionFinal = lazy(() => import('./pages/secretaria/SecretariaSituacionFinal'));
const SecretariaLibretas = lazy(() => import('./pages/secretaria/SecretariaLibretas'));
const SecretariaLibretasSeccion = lazy(() => import('./pages/secretaria/SecretariaLibretasSeccion'));
const SecretariaLibretaPreview = lazy(() => import('./pages/secretaria/SecretariaLibretaPreview'));

const fallback = (
  <div className="flex items-center justify-center min-h-screen">
    <p className="text-slate-500">Cargando...</p>
  </div>
);

export const router = createBrowserRouter([
  { path: '/', element: <Suspense fallback={fallback}><Login /></Suspense>, errorElement: <RouteErrorBoundary /> },
  { path: '/cambiar-contrasena', element: <Suspense fallback={fallback}><ForceChangePassword /></Suspense>, errorElement: <RouteErrorBoundary /> },

  // ── Alumno Portal ────────────────────────────────────────
  {
    path: '/alumno',
    Component: AppShell,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, Component: () => <Navigate to="inicio" replace /> },
      { path: 'inicio',        element: <Suspense fallback={fallback}><AlumnoDashboard /></Suspense> },
      { path: 'cursos',        element: <Suspense fallback={fallback}><AlumnoCursos /></Suspense> },
      { path: 'cursos/:id',    element: <Suspense fallback={fallback}><AlumnoCursoDetalle /></Suspense> },
      { path: 'libreta',       element: <Suspense fallback={fallback}><AlumnoLibreta /></Suspense> },
      { path: 'asistencias',   element: <Suspense fallback={fallback}><AlumnoAsistencias /></Suspense> },
      { path: 'pagos',         element: <Suspense fallback={fallback}><AlumnoPagos /></Suspense> },
      { path: 'horario',       element: <Suspense fallback={fallback}><AlumnoHorario /></Suspense> },
    ],
  },

  // ── Docente Portal ───────────────────────────────────────
  {
    path: '/docente',
    Component: AppShell,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, Component: () => <Navigate to="inicio" replace /> },
      { path: 'inicio',      element: <Suspense fallback={fallback}><DocenteDashboard /></Suspense> },
      { path: 'asistencia',  element: <Suspense fallback={fallback}><DocenteAsistencia /></Suspense> },
      { path: 'historial-asistencia', element: <Suspense fallback={fallback}><DocenteAsistenciaHistorial /></Suspense> },
      { path: 'tareas',      element: <Suspense fallback={fallback}><DocenteTareas /></Suspense> },
      { path: 'notas',       element: <Suspense fallback={fallback}><DocenteNotas /></Suspense> },
      { path: 'simulacro',   element: <Suspense fallback={fallback}><DocenteSimulacro /></Suspense> },
      { path: 'horario',     element: <Suspense fallback={fallback}><DocenteHorario /></Suspense> },
    ],
  },

  // ── Admin Portal ─────────────────────────────────────────
  {
    path: '/admin',
    Component: AppShell,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, Component: () => <Navigate to="inicio" replace /> },
      { path: 'inicio',        element: <Suspense fallback={fallback}><AdminDashboard /></Suspense> },
      { path: 'estructura',    element: <Suspense fallback={fallback}><AdminEstructura /></Suspense> },
      { path: 'cuentas',       element: <Suspense fallback={fallback}><AdminCuentas /></Suspense> },
      { path: 'horarios',      element: <Suspense fallback={fallback}><AdminHorarios /></Suspense> },
      { path: 'asistencia',    element: <Suspense fallback={fallback}><AdminAsistenciaDocente /></Suspense> },
      { path: 'asistencia-alumnos', element: <Suspense fallback={fallback}><AdminAsistenciaAlumnos /></Suspense> },
      { path: 'bloqueo',       element: <Suspense fallback={fallback}><AdminBloqueo /></Suspense> },
      { path: 'periodo',       element: <Suspense fallback={fallback}><AdminPeriodo /></Suspense> },
      { path: 'bimestres',     element: <Suspense fallback={fallback}><AdminBimestres /></Suspense> },
      { path: 'escala',        element: <Suspense fallback={fallback}><AdminEscalaLiteral /></Suspense> },
      { path: 'institucion',   element: <Suspense fallback={fallback}><AdminInstitucion /></Suspense> },
      { path: 'competencias',  element: <Suspense fallback={fallback}><AdminCompetencias /></Suspense> },
      { path: 'asignaciones',  element: <Suspense fallback={fallback}><AdminAsignaciones /></Suspense> },
      { path: 'simulacro',     element: <Suspense fallback={fallback}><AdminSimulacro /></Suspense> },
    ],
  },

  // ── Secretaría Portal ────────────────────────────────────────
  {
    path: '/secretaria',
    Component: AppShell,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, Component: () => <Navigate to="inicio" replace /> },
      { path: 'inicio',            element: <Suspense fallback={fallback}><SecretariaDashboard /></Suspense> },
      { path: 'vouchers',          element: <Suspense fallback={fallback}><SecretariaVouchers /></Suspense> },
      { path: 'pagos',             element: <Suspense fallback={fallback}><SecretariaPagos /></Suspense> },
      { path: 'siagie',            element: <Suspense fallback={fallback}><SecretariaSIAGIE /></Suspense> },
      { path: 'alumnos',           element: <Suspense fallback={fallback}><SecretariaAlumnos /></Suspense> },
      { path: 'situacion-final',   element: <Suspense fallback={fallback}><SecretariaSituacionFinal /></Suspense> },
      { path: 'libretas',                       element: <Suspense fallback={fallback}><SecretariaLibretas /></Suspense> },
      { path: 'libretas/secciones/:seccionId',  element: <Suspense fallback={fallback}><SecretariaLibretasSeccion /></Suspense> },
      { path: 'libretas/:alumnoId',             element: <Suspense fallback={fallback}><SecretariaLibretaPreview /></Suspense> },
    ],
  },

  // Catch-all → Login
  { path: '*', Component: () => <Navigate to="/" replace /> },
]);
