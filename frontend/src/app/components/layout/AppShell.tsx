import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router';
import {
  LayoutDashboard, BookOpen, FileText, CalendarCheck, CreditCard,
  ClipboardList, PenLine, Users, Calendar, UserCheck,
  Receipt, DollarSign, FileOutput, Bell, Menu, X, ChevronRight,
  LogOut, GraduationCap, AlertCircle, Info,
  CalendarRange, BookMarked, Sliders, School, ListChecks,
} from 'lucide-react';
import type { Role } from '../../data/mockData';
import { useSession } from '../../../lib/hooks/useSession';
import { periodosApi, bimestresApi } from '../../../lib/api/periodos.api';
import { secretariaApi } from '../../../lib/api/secretaria.api';
import {
  useNotificaciones,
  useContarNoLeidas,
  useMarcarLeida,
  useMarcarTodasLeidas,
} from '../../../hooks/shared/useNotificaciones';
import { useRealtimeNotifications } from '../../../hooks/shared/useRealtimeNotifications';
import type { Notificacion, TipoNotificacion } from '../../../types/notificacion';

function getInitials(nombre: string): string {
  return nombre.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

interface NavItem { label: string; path: string; icon: React.ElementType; badge?: number }

// 🔄 Corrección #12 — Normalizar rol lowercase (URL) → PascalCase (auth_schema.rol_usuario ENUM)
// En producción se aplica al leer el JWT: normalizeRole(session.user.role)
function normalizeRole(rawRole: string): Role {
  const roleMap: Record<string, Role> = {
    'alumno':     'Alumno',
    'docente':    'Docente',
    'admin':      'Admin',
    'secretaria': 'Secretaria',
    // También acepta ya en PascalCase (idempotente)
    'Alumno':     'Alumno',
    'Docente':    'Docente',
    'Admin':      'Admin',
    'Secretaria': 'Secretaria',
  };
  return roleMap[rawRole] ?? rawRole as Role;
}

// 🔄 Corrección #12 — Claves en PascalCase para coincidir con type Role
const NAV_CONFIG: Record<Role, NavItem[]> = {
  Alumno: [
    { label: 'Inicio',         path: '/alumno/inicio',       icon: LayoutDashboard },
    { label: 'Mis Cursos',     path: '/alumno/cursos',       icon: BookOpen },
    { label: 'Libreta Digital',path: '/alumno/libreta',      icon: FileText },
    { label: 'Asistencias',    path: '/alumno/asistencias',  icon: CalendarCheck },
    { label: 'Pagos',          path: '/alumno/pagos',        icon: CreditCard },
  ],
  Docente: [
    { label: 'Inicio',              path: '/docente/inicio',     icon: LayoutDashboard },
    { label: 'Registro Asistencia', path: '/docente/asistencia', icon: CalendarCheck },
    { label: 'Tareas y Materiales', path: '/docente/tareas',     icon: ClipboardList },
    { label: 'Ingreso de Notas',    path: '/docente/notas',      icon: PenLine },
  ],
  Admin: [
    { label: 'Inicio',                  path: '/admin/inicio',        icon: LayoutDashboard },
    { label: 'Gestión de Cuentas',      path: '/admin/cuentas',       icon: Users },
    { label: 'Horarios',                path: '/admin/horarios',      icon: Calendar },
    { label: 'Asistencia Docente',      path: '/admin/asistencia',    icon: UserCheck },
    { label: 'Período Académico',       path: '/admin/periodo',       icon: CalendarRange },
    { label: 'Bimestres',               path: '/admin/bimestres',     icon: BookMarked },
    { label: 'Escala de Calificaciones',path: '/admin/escala',        icon: Sliders },
    { label: 'Institución Educativa',   path: '/admin/institucion',   icon: School },
    { label: 'Competencias',            path: '/admin/competencias',  icon: ListChecks },
  ],
  Secretaria: [
    { label: 'Inicio',              path: '/secretaria/inicio',           icon: LayoutDashboard },
    { label: 'Gestión de Alumnos',  path: '/secretaria/alumnos',          icon: GraduationCap },
    { label: 'Validar Vouchers',    path: '/secretaria/vouchers',         icon: Receipt },
    { label: 'Estado de Pagos',     path: '/secretaria/pagos',            icon: DollarSign },
    { label: 'Situación Final',     path: '/secretaria/situacion-final',  icon: GraduationCap },
    { label: 'Exportar SIAGIE',     path: '/secretaria/siagie',           icon: FileOutput },
    { label: 'Libretas',            path: '/secretaria/libretas',          icon: FileText },
  ],
};

const ROLE_LABELS: Record<Role, string> = {
  Alumno:     'Portal del Alumno',
  Docente:    'Portal Docente',
  Admin:      'Administración',
  Secretaria: 'Secretaría',
};

const ROLE_COLORS: Record<Role, string> = {
  Alumno:     'from-blue-600 to-blue-800',
  Docente:    'from-indigo-600 to-indigo-800',
  Admin:      'from-slate-700 to-slate-900',
  Secretaria: 'from-teal-600 to-teal-800',
};

// Icono por tipo/prioridad de la notificación real del backend.
function NotificationIcon({ n }: { n: Notificacion }) {
  if (n.prioridad === 'alta' || n.prioridad === 'urgente') {
    return <AlertCircle className="size-4 text-amber-500" />;
  }
  if (n.tipo === 'pago')       return <CreditCard className="size-4 text-emerald-500" />;
  if (n.tipo === 'academico')  return <BookOpen className="size-4 text-blue-500" />;
  if (n.tipo === 'comunicado') return <Info className="size-4 text-indigo-500" />;
  return <Info className="size-4 text-slate-500" />;
}

// Tiempo relativo legible en español ("hace 5 min", "ayer", ...).
function tiempoRelativo(iso: string): string {
  const fecha = new Date(iso);
  const seg = Math.floor((Date.now() - fecha.getTime()) / 1000);
  if (seg < 60)     return 'ahora';
  const min = Math.floor(seg / 60);
  if (min < 60)     return `hace ${min} min`;
  const horas = Math.floor(min / 60);
  if (horas < 24)   return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias === 1)   return 'ayer';
  if (dias < 7)     return `hace ${dias} días`;
  return fecha.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
}

const FILTROS_NOTIF: { value: TipoNotificacion | 'todas'; label: string }[] = [
  { value: 'todas',      label: 'Todas' },
  { value: 'academico',  label: 'Académico' },
  { value: 'pago',       label: 'Pago' },
  { value: 'sistema',    label: 'Sistema' },
  { value: 'comunicado', label: 'Comunicado' },
];

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [filtroNotif, setFiltroNotif] = useState<TipoNotificacion | 'todas'>('todas');
  const notifRef = useRef<HTMLDivElement>(null);
  const [periodoActivo, setPeriodoActivo] = useState<string>('');
  const [bimestreActivo, setBimestreActivo] = useState<string>('');
  const [vouchersPendientes, setVouchersPendientes] = useState<number>(0);

  // 🔄 Corrección #12 — normalizeRole convierte 'alumno' (URL) → 'Alumno' (ENUM PascalCase)
  const role = normalizeRole(location.pathname.split('/')[1]);
  const baseNavItems = NAV_CONFIG[role] || [];
  const navItems: NavItem[] = baseNavItems.map(item =>
    item.path === '/secretaria/vouchers' && vouchersPendientes > 0
      ? { ...item, badge: vouchersPendientes }
      : item,
  );
  const { session } = useSession();
  const displayName = session?.nombre ?? '…';
  const initials = session ? getInitials(session.nombre) : '…';

  // ── Notificaciones reales del backend (con polling de respaldo) ──
  const { data: notifData }   = useNotificaciones();
  const { data: contadorData } = useContarNoLeidas();
  const marcarLeida           = useMarcarLeida();
  const marcarTodas           = useMarcarTodasLeidas();
  const notifications: Notificacion[] = notifData ?? [];
  const unread = contadorData?.no_leidas ?? 0;
  const notificacionesFiltradas = filtroNotif === 'todas'
    ? notifications
    : notifications.filter(n => n.tipo === filtroNotif);

  // Canal en vivo (SSE): toast + refresco de la campana sin recargar.
  useRealtimeNotifications({ enabled: !!session });

  function handleNotifClick(n: Notificacion) {
    if (!n.leida) marcarLeida.mutate(n.id);
    if (n.url_accion && n.url_accion.startsWith('/')) {
      setNotifOpen(false);
      navigate(n.url_accion);
    }
  }

  // Guard: redirige al portal correcto si el rol del JWT no coincide con la URL
  useEffect(() => {
    if (!session) return;
    const sessionRole = normalizeRole(session.rol);
    if (sessionRole !== role) {
      const portalInicio: Record<Role, string> = {
        Alumno:     '/alumno/inicio',
        Docente:    '/docente/inicio',
        Admin:      '/admin/inicio',
        Secretaria: '/secretaria/inicio',
      };
      navigate(portalInicio[sessionRole] ?? '/', { replace: true });
    }
  }, [session, role, navigate]);

  // Cargar período y bimestre activos
  useEffect(() => {
    async function loadPeriodoYBimestre() {
      try {
        const periodosRes = await periodosApi.listar({ activo: true, limit: 1 });
        const periodo = periodosRes.items[0];
        if (periodo) {
          setPeriodoActivo(periodo.nombre);
          const bimestresRes = await bimestresApi.listar({ periodoId: periodo.id, limit: 100 });
          const bimestreAct = bimestresRes.items.find(b => !b.cerrado);
          if (bimestreAct) {
            setBimestreActivo(bimestreAct.nombre);
          }
        }
      } catch (err) {
        // Silently fail if unable to load
        console.error('Error cargando período/bimestre activo:', err);
      }
    }
    loadPeriodoYBimestre();
  }, []);

  // Cargar conteo de vouchers pendientes (solo Secretaria)
  // Se actualiza al cambiar de ruta para reflejar aprobaciones/rechazos recientes
  useEffect(() => {
    if (role !== 'Secretaria') {
      setVouchersPendientes(0);
      return;
    }
    secretariaApi.resumen()
      .then(r => setVouchersPendientes(r.resumen_financiero.vouchers_pendientes))
      .catch(() => setVouchersPendientes(0));
  }, [role, location.pathname]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function markAllRead() {
    if (unread > 0) marcarTodas.mutate();
  }

  const isActive = (path: string) => location.pathname === path || (path !== `/${role}/inicio` && location.pathname.startsWith(path));

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40 w-64 flex flex-col
          bg-gradient-to-b ${ROLE_COLORS[role]} text-white
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <div className="flex size-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
            <GraduationCap className="size-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-wide text-white">SGEI</p>
            <p className="text-xs text-white/60">{ROLE_LABELS[role]}</p>
          </div>
          <button
            className="ml-auto lg:hidden p-1 rounded-lg hover:bg-white/10 transition-colors"
            onClick={() => setSidebarOpen(false)}
            aria-label="Cerrar menú"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* User info */}
        <div className="px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-white/20 text-white text-sm font-semibold shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{displayName}</p>
              <p className="text-xs text-white/60 capitalize">{role}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <ul className="space-y-1">
            {navItems.map(item => {
              const active = isActive(item.path);
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150
                      ${active
                        ? 'bg-white/20 text-white font-medium shadow-sm'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'}
                    `}
                    aria-current={active ? 'page' : undefined}
                  >
                    <item.icon className="size-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge ? (
                      <span className="flex size-5 items-center justify-center rounded-full bg-white/25 text-xs font-semibold">
                        {item.badge}
                      </span>
                    ) : active ? (
                      <ChevronRight className="size-3 opacity-60" />
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Period indicator */}
        <div className="px-4 pb-3">
          <div className="rounded-xl bg-white/10 px-3 py-2.5">
            <p className="text-xs text-white/50 uppercase tracking-wider">Período activo</p>
            <p className="text-sm text-white font-medium">
              {bimestreActivo && periodoActivo
                ? `${bimestreActivo} · ${periodoActivo.split(' ').pop()}`
                : '—'}
            </p>
          </div>
        </div>

        {/* Logout */}
        <div className="px-3 pb-5">
          <button
            onClick={() => navigate('/')}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/70 hover:bg-white/10 hover:text-white transition-all"
          >
            <LogOut className="size-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── Main content area ── */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center gap-3 bg-white border-b border-slate-200 px-4 lg:px-6 shrink-0 shadow-sm">
          <button
            className="lg:hidden p-2 rounded-xl hover:bg-slate-100 transition-colors"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu className="size-5 text-slate-600" />
          </button>

          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-500 hidden sm:block">
              {periodoActivo && bimestreActivo
                ? <>Año escolar {periodoActivo.split(' ').pop()} · <span className="text-slate-700 font-medium">{bimestreActivo}</span></>
                : <>Cargando...</>
              }
            </p>
          </div>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(o => !o)}
              className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors"
              aria-label={`Notificaciones${unread > 0 ? ` (${unread} sin leer)` : ''}`}
            >
              <Bell className="size-5 text-slate-600" />
              {unread > 0 && (
                <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {unread}
                </span>
              )}
            </button>

            {/* Notifications panel */}
            {notifOpen && (
              <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-800">Notificaciones</h3>
                  {unread > 0 && (
                    <button
                      onClick={markAllRead}
                      disabled={marcarTodas.isPending}
                      className="text-xs text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50"
                    >
                      Marcar todas como leídas
                    </button>
                  )}
                </div>

                {/* Filtros por tipo (§17.9) */}
                <div className="flex gap-1.5 overflow-x-auto px-3 py-2 border-b border-slate-100">
                  {FILTROS_NOTIF.map(f => (
                    <button
                      key={f.value}
                      onClick={() => setFiltroNotif(f.value)}
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs transition-colors ${
                        filtroNotif === f.value
                          ? 'bg-slate-800 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                  {notificacionesFiltradas.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-slate-400">
                      No tienes notificaciones{filtroNotif !== 'todas' ? ' de este tipo' : ''}.
                    </p>
                  ) : (
                    notificacionesFiltradas.map(n => (
                      <button
                        key={n.id}
                        onClick={() => handleNotifClick(n)}
                        className={`flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${!n.leida ? 'bg-blue-50/40' : ''}`}
                      >
                        <div className="mt-0.5 shrink-0"><NotificationIcon n={n} /></div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm leading-snug ${!n.leida ? 'text-slate-800 font-medium' : 'text-slate-600'}`}>
                            {n.titulo}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.cuerpo}</p>
                          <p className="text-xs text-slate-400 mt-1">{tiempoRelativo(n.created_at)}</p>
                        </div>
                        {!n.leida && <div className="mt-2 shrink-0 size-2 rounded-full bg-blue-500" />}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User avatar */}
          <div className={`flex size-8 items-center justify-center rounded-full bg-gradient-to-br ${ROLE_COLORS[role]} text-white text-xs font-semibold shrink-0`}>
            {initials}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}