import { createBrowserRouter, Navigate } from 'react-router';
import { AppShell } from './components/layout/AppShell';
import Login from './pages/Login';
import AlumnoDashboard from './pages/alumno/AlumnoDashboard';
import AlumnoCursos from './pages/alumno/AlumnoCursos';
import AlumnoCursoDetalle from './pages/alumno/AlumnoCursoDetalle';
import AlumnoLibreta from './pages/alumno/AlumnoLibreta';
import AlumnoAsistencias from './pages/alumno/AlumnoAsistencias';
import AlumnoPagos from './pages/alumno/AlumnoPagos';
import DocenteDashboard from './pages/docente/DocenteDashboard';
import DocenteAsistencia from './pages/docente/DocenteAsistencia';
import DocenteTareas from './pages/docente/DocenteTareas';
import DocenteNotas from './pages/docente/DocenteNotas';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminCuentas from './pages/admin/AdminCuentas';
import AdminHorarios from './pages/admin/AdminHorarios';
import AdminAsistenciaDocente from './pages/admin/AdminAsistenciaDocente';
import AdminPeriodo from './pages/admin/AdminPeriodo';
import AdminBimestres from './pages/admin/AdminBimestres';
import AdminEscalaLiteral from './pages/admin/AdminEscalaLiteral';
import AdminInstitucion from './pages/admin/AdminInstitucion';
import AdminCompetencias from './pages/admin/AdminCompetencias';
import AdminBloqueo from './pages/admin/AdminBloqueo';
import SecretariaDashboard from './pages/secretaria/SecretariaDashboard';
import SecretariaVouchers from './pages/secretaria/SecretariaVouchers';
import SecretariaPagos from './pages/secretaria/SecretariaPagos';
import SecretariaSIAGIE from './pages/secretaria/SecretariaSIAGIE';
import SecretariaAlumnos from './pages/secretaria/SecretariaAlumnos';
import SecretariaSituacionFinal from './pages/secretaria/SecretariaSituacionFinal';
import SecretariaLibretas from './pages/secretaria/SecretariaLibretas';
import SecretariaLibretasSeccion from './pages/secretaria/SecretariaLibretasSeccion';
import SecretariaLibretaPreview from './pages/secretaria/SecretariaLibretaPreview';

export const router = createBrowserRouter([
  { path: '/', Component: Login },

  // ── Alumno Portal ────────────────────────────────────────
  {
    path: '/alumno',
    Component: AppShell,
    children: [
      { index: true, Component: () => <Navigate to="inicio" replace /> },
      { path: 'inicio',        Component: AlumnoDashboard },
      { path: 'cursos',        Component: AlumnoCursos },
      { path: 'cursos/:id',    Component: AlumnoCursoDetalle },
      { path: 'libreta',       Component: AlumnoLibreta },
      { path: 'asistencias',   Component: AlumnoAsistencias },
      { path: 'pagos',         Component: AlumnoPagos },
    ],
  },

  // ── Docente Portal ───────────────────────────────────────
  {
    path: '/docente',
    Component: AppShell,
    children: [
      { index: true, Component: () => <Navigate to="inicio" replace /> },
      { path: 'inicio',      Component: DocenteDashboard },
      { path: 'asistencia',  Component: DocenteAsistencia },
      { path: 'tareas',      Component: DocenteTareas },
      { path: 'notas',       Component: DocenteNotas },
    ],
  },

  // ── Admin Portal ─────────────────────────────────────────
  {
    path: '/admin',
    Component: AppShell,
    children: [
      { index: true, Component: () => <Navigate to="inicio" replace /> },
      { path: 'inicio',        Component: AdminDashboard },
      { path: 'cuentas',       Component: AdminCuentas },
      { path: 'horarios',      Component: AdminHorarios },
      { path: 'asistencia',    Component: AdminAsistenciaDocente },
      { path: 'bloqueo',       Component: AdminBloqueo },
      { path: 'periodo',       Component: AdminPeriodo },
      { path: 'bimestres',     Component: AdminBimestres },
      { path: 'escala',        Component: AdminEscalaLiteral },
      { path: 'institucion',   Component: AdminInstitucion },
      { path: 'competencias',  Component: AdminCompetencias },
    ],
  },

  // ── Secretaría Portal ────────────────────────────────────────
  {
    path: '/secretaria',
    Component: AppShell,
    children: [
      { index: true, Component: () => <Navigate to="inicio" replace /> },
      { path: 'inicio',            Component: SecretariaDashboard },
      { path: 'vouchers',          Component: SecretariaVouchers },
      { path: 'pagos',             Component: SecretariaPagos },
      { path: 'siagie',            Component: SecretariaSIAGIE },
      { path: 'alumnos',           Component: SecretariaAlumnos },
      { path: 'situacion-final',   Component: SecretariaSituacionFinal },
      { path: 'libretas',                  Component: SecretariaLibretas },
      { path: 'libretas/secciones/:seccionId', Component: SecretariaLibretasSeccion },
      { path: 'libretas/:alumnoId',             Component: SecretariaLibretaPreview },
    ],
  },

  // Catch-all → Login
  { path: '*', Component: () => <Navigate to="/" replace /> },
]);