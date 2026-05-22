import { useState, useEffect, useMemo } from 'react';
import {
  PlusCircle, Search, UserCheck, UserX, Pencil, Loader2, AlertTriangle,
} from 'lucide-react';
import {
  usuariosApi, docentesAdminApi, alumnosAdminApi,
} from '../../../lib/api/admin.api';
import type {
  UsuarioDTO, DocenteDTO, AlumnoResumenDTO, AlumnoDetalleDTO,
} from '../../../lib/api/admin.api';
import UserFormModal, { type FormRol, type UserFormData } from '../../../app/components/UserFormModal';

type TipoCuenta = 'docente' | 'staff' | 'alumno';

interface RowCuenta {
  id:           string;
  tipo:         TipoCuenta;
  displayName:  string;
  initials:     string;
  rol:          string;
  email:        string;
  especialidad: string;
  activo:       boolean;
  createdAt:    string;
  docente?:     DocenteDTO;
  usuario?:     UsuarioDTO;
  alumno?:     AlumnoResumenDTO;
}

function fromDocente(d: DocenteDTO): RowCuenta {
  let displayName = `${d.nombres} ${d.apellido_paterno} ${d.apellido_materno}`.trim();
  if (!displayName) {
    displayName = d.usuario_login ?? d.email_institucional ?? 'Sin nombre';
  }
  const parts = displayName.split(' ');
  return {
    id:           d.id,
    tipo:         'docente',
    displayName,
    initials:     parts.slice(0, 2).map(p => p[0] ?? '').join('').toUpperCase(),
    rol:          'Docente',
    email:        d.usuario_login ?? d.email_institucional ?? '—',
    especialidad: d.especialidad,
    activo:       d.activo,
    createdAt:    d.fecha_ingreso ?? '',
    docente:      d,
  };
}

function fromUsuario(u: UsuarioDTO): RowCuenta {
  let displayName = `${u.nombres} ${u.apellido_paterno} ${u.apellido_materno}`.trim();
  if (!displayName) {
    displayName = u.usuario_login || 'Sin nombre';
  }
  const parts = displayName.split(' ');
  return {
    id:           u.id,
    tipo:         'staff',
    displayName,
    initials:     parts.slice(0, 2).map(p => p[0] ?? '').join('').toUpperCase(),
    rol:          u.rol,
    email:        u.usuario_login,
    especialidad: '',
    activo:       u.activo,
    createdAt:    u.created_at,
    usuario:      u,
  };
}

function fromAlumno(a: AlumnoResumenDTO): RowCuenta {
  let displayName = `${a.nombres} ${a.apellido_paterno} ${a.apellido_materno}`.trim();
  if (!displayName) {
    displayName = a.usuario_login || 'Sin nombre';
  }
  const parts = displayName.split(' ');
  return {
    id:           a.id,
    tipo:         'alumno',
    displayName,
    initials:     parts.slice(0, 2).map(p => p[0] ?? '').join('').toUpperCase(),
    rol:          'Alumno',
    email:        a.usuario_login ?? '—',
    especialidad: a.seccion?.grado?.nombre ? `${a.seccion.grado.nombre} - ${a.seccion.nombre}` : '',
    activo:       a.activo,
    createdAt:    '',
    alumno:       a,
  };
}

const ROLES = ['Docente', 'Admin', 'Secretaria', 'Alumno'] as const;
const ROL_COLORS: Record<string, string> = {
  Docente:    'bg-indigo-50 text-indigo-700 border-indigo-200',
  Admin:      'bg-slate-100 text-slate-700 border-slate-300',
  Secretaria: 'bg-teal-50 text-teal-700 border-teal-200',
  Alumno:     'bg-amber-50 text-amber-700 border-amber-200',
};

export default function AdminCuentas() {
  const [docenteRows, setDocenteRows] = useState<DocenteDTO[]>([]);
  const [staffRows,   setStaffRows]   = useState<UsuarioDTO[]>([]);
  const [alumnoRows,  setAlumnoRows]  = useState<AlumnoResumenDTO[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [fetchError,  setFetchError]  = useState('');

  const [search, setSearch] = useState('');
  const [rolTab, setRolTab] = useState<string>('');
  const [toggling, setToggling] = useState<string | null>(null);

  // Modal states
  const [formModal, setFormModal] = useState<{
    mode: 'create' | 'edit';
    rol?: FormRol;
    initialData?: UserFormData & { id: string };
  } | null>(null);


  const [confirmDelete, setConfirmDelete] = useState<RowCuenta | null>(null);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  // ── Carga inicial ───────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      docentesAdminApi.listar({ limit: 100 }),
      usuariosApi.listar({ limit: 100 }),
      alumnosAdminApi.listar({ limit: 100 }),
    ])
      .then(([docRes, usrRes, aluRes]) => {
        setDocenteRows(docRes.items);
        setStaffRows(usrRes.items);
        setAlumnoRows(aluRes.items);
      })
      .catch(() => setFetchError('No se pudieron cargar las cuentas.'))
      .finally(() => setLoading(false));
  }, []);

  // ── Lista unificada + filtros ──────────────────────────────
  const allAccounts = useMemo<RowCuenta[]>(() => {
    const merged: RowCuenta[] = [
      ...docenteRows.map(fromDocente),
      ...staffRows.map(fromUsuario),
      ...alumnoRows.map(fromAlumno),
    ];

    // Filtrar registros defectuosos: eliminar si displayName es igual al email
    // (significa que es un registro sin nombre real)
    const validAccounts = merged.filter(acc => {
      const emailLower = acc.email.toLowerCase();
      const displayLower = acc.displayName.toLowerCase();
      return displayLower !== emailLower;
    });

    // Deduplicar por (tipo, id) entre registros válidos
    const seen = new Set<string>();
    const deduplicated: RowCuenta[] = [];
    for (const account of validAccounts) {
      const key = `${account.tipo}:${account.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(account);
      }
    }

    deduplicated.sort((a, b) => a.displayName.localeCompare(b.displayName, 'es'));

    let filtered = deduplicated;
    if (rolTab) {
      filtered = filtered.filter(a => a.rol === rolTab);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(a =>
        a.displayName.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.especialidad.toLowerCase().includes(q),
      );
    }
    return filtered;
  }, [docenteRows, staffRows, alumnoRows, search, rolTab]);

  const stats = useMemo(() => {
    const all = [...docenteRows, ...staffRows, ...alumnoRows];
    return { activos: all.filter(a => a.activo).length, inactivos: all.filter(a => !a.activo).length };
  }, [docenteRows, staffRows, alumnoRows]);

  // ── Handlers ─────────────────────────────────────────────────
  function openCreate() {
    setFormModal({ mode: 'create' });
  }

  async function openEdit(row: RowCuenta) {
    if (row.tipo === 'docente' && row.docente) {
      const d = row.docente;
      setFormModal({
        mode: 'edit',
        rol: 'Docente',
        initialData: {
          id: d.id,
          usuario_login: d.usuario_login ?? '',
          dni: d.dni,
          nombres: d.nombres,
          apellido_paterno: d.apellido_paterno,
          apellido_materno: d.apellido_materno,
          especialidad: d.especialidad,
          telefono: d.telefono || '',
          email_institucional: d.email_institucional ?? '',
          fecha_nacimiento: d.fecha_nacimiento ?? '',
          sexo: d.sexo ?? '',
          titulo_profesional: d.titulo_profesional ?? '',
          fecha_ingreso: d.fecha_ingreso ?? '',
        } as UserFormData & { id: string },
      });
    } else if (row.tipo === 'alumno' && row.alumno) {
      try {
        const detalle = await alumnosAdminApi.obtener(row.id);
        const a = detalle as AlumnoDetalleDTO;
        setFormModal({
          mode: 'edit',
          rol: 'Alumno',
          initialData: {
            id: a.id,
            usuario_login: a.usuario_login ?? '',
            dni: a.dni,
            nombres: a.nombres,
            apellido_paterno: a.apellido_paterno,
            apellido_materno: a.apellido_materno,
            fecha_nacimiento: a.fecha_nacimiento?.split('T')[0] ?? '',
            sexo: a.sexo ?? '',
            seccion_id: a.seccion?.id ?? '',
            periodo_id: a.periodo_id ?? '',
            codigo_siagie: a.codigo_siagie ?? '',
            direccion: a.direccion ?? '',
            distrito: a.distrito ?? '',
            telefono_emergencia: a.telefono_emergencia ?? '',
            grupo_sanguineo: a.grupo_sanguineo ?? '',
            condicion_especial: a.condicion_especial ?? '',
          } as UserFormData & { id: string },
        });
      } catch {
        showToast('Error al cargar datos del alumno.', 'error');
      }
    } else if (row.tipo === 'staff' && row.usuario) {
      const u = row.usuario;
      setFormModal({
        mode: 'edit',
        rol: u.rol as 'Admin' | 'Secretaria',
        initialData: {
          id: u.id,
          usuario_login: u.usuario_login,
          rol: u.rol as 'Admin' | 'Secretaria',
          nombres: u.nombres ?? '',
          apellido_paterno: u.apellido_paterno ?? '',
          apellido_materno: u.apellido_materno ?? '',
        } as UserFormData & { id: string },
      });
    }
  }

  function handleFormSuccess(message: string) {
    setFormModal(null);
    showToast(message);
    // Reload data
    Promise.all([
      docentesAdminApi.listar({ limit: 100 }),
      usuariosApi.listar({ limit: 100 }),
      alumnosAdminApi.listar({ limit: 100 }),
    ]).then(([docRes, usrRes, aluRes]) => {
      setDocenteRows(docRes.items);
      setStaffRows(usrRes.items);
      setAlumnoRows(aluRes.items);
    }).catch(() => showToast('Error al recargar datos.', 'error'));
  }


  // ── Toggle (desactivar / reactivar) ─────────────────────────
  function handleToggleClick(row: RowCuenta) {
    if (row.activo) { setConfirmDelete(row); return; }
    executeToggle(row, false);
  }

  async function executeToggle(row: RowCuenta, wasActive: boolean) {
    setToggling(row.id);
    try {
      if (row.tipo === 'docente') {
        if (wasActive) { await docentesAdminApi.desactivar(row.id); }
        else { await docentesAdminApi.activar(row.id); }
        setDocenteRows(prev => prev.map(d => d.id === row.id ? { ...d, activo: !wasActive } : d));
      } else if (row.tipo === 'alumno') {
        if (wasActive) { await alumnosAdminApi.desactivar(row.id); }
        else { await alumnosAdminApi.activar(row.id); }
        setAlumnoRows(prev => prev.map(a => a.id === row.id ? { ...a, activo: !wasActive } : a));
      } else {
        if (wasActive) { const u = await usuariosApi.desactivar(row.id); setStaffRows(prev => prev.map(s => s.id === u.id ? u : s)); }
        else { const u = await usuariosApi.activar(row.id); setStaffRows(prev => prev.map(s => s.id === u.id ? u : s)); }
      }
      showToast(`Cuenta ${wasActive ? 'inhabilitada' : 'reactivada'} correctamente.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al cambiar estado.', 'error');
    } finally {
      setToggling(null);
    }
  }

  function handleConfirmDeactivate() {
    if (!confirmDelete) return;
    executeToggle(confirmDelete, true);
    setConfirmDelete(null);
  }

  // ── Render ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6 animate-pulse">
        <div className="flex justify-between">
          <div className="space-y-2">
            <div className="h-7 w-52 bg-slate-200 rounded" />
            <div className="h-4 w-32 bg-slate-200 rounded" />
          </div>
          <div className="h-10 w-36 bg-slate-200 rounded-xl" />
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 h-64" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestión de Cuentas</h1>
          <p className="text-sm text-slate-500 mt-0.5">{stats.activos} activos · {stats.inactivos} inactivos</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="search" placeholder="Buscar…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 w-44"
            />
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm ${
          toast.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          <AlertTriangle className="size-4 shrink-0" />
          <span>{toast.message}</span>
        </div>
      )}

      {fetchError && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
          <AlertTriangle className="size-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{fetchError}</p>
        </div>
      )}

      {/* Pestañas de rol + botón nuevo */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setRolTab('')} className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${!rolTab ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
          Todos
        </button>
        {ROLES.map(r => (
          <button key={r} onClick={() => setRolTab(r)} className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${rolTab === r ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
            {r === 'Admin' ? 'Administradores' : r === 'Secretaria' ? 'Secretarías' : `${r}s`}
          </button>
        ))}
        <div className="ml-auto">
          <button
            onClick={() => openCreate()}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-medium transition-colors shadow-sm"
          >
            <PlusCircle className="size-3.5" /> Nuevo
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Usuario</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Rol</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Correo</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {allAccounts.map(acc => (
              <tr key={`${acc.tipo}-${acc.id}`} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 text-xs font-semibold shrink-0">
                      {acc.initials}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 leading-tight">{acc.displayName}</p>
                      {acc.especialidad && <p className="text-xs text-slate-400">{acc.especialidad}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${ROL_COLORS[acc.rol] ?? ''}`}>
                    {acc.rol === 'Admin' ? 'Admin' : acc.rol === 'Secretaria' ? 'Secretaría' : acc.rol}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-slate-500 text-xs hidden md:table-cell">{acc.email}</td>
                <td className="text-center px-4 py-3.5">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                    acc.activo ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}>
                    {acc.activo ? <><UserCheck className="size-3" />Activo</> : <><UserX className="size-3" />Inactivo</>}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button onClick={() => openEdit(acc)} disabled={toggling !== null} title="Editar"
                      className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50">
                      <Pencil className="size-4" />
                    </button>
                    <button onClick={() => handleToggleClick(acc)} disabled={toggling !== null}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border disabled:opacity-50 ${
                        acc.activo ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      }`}>
                      {toggling === acc.id ? <Loader2 className="size-3.5 animate-spin inline" /> : acc.activo ? 'Desactivar' : 'Reactivar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {allAccounts.length === 0 && !fetchError && (
          <div className="flex flex-col items-center py-12 text-center">
            <p className="text-slate-500">No se encontraron usuarios{search ? ' para esa búsqueda' : ''}.</p>
          </div>
        )}
      </div>

      {/* ── Modal crear/editar (UserFormModal) ─────────────────── */}
      {formModal && (
        <UserFormModal
          mode={formModal.mode}
          rol={formModal.rol}
          initialData={formModal.initialData}
          onClose={() => setFormModal(null)}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* ── Modal confirmar desactivación ──────────────────────── */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="p-6 text-center">
              <AlertTriangle className="size-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">¿Inhabilitar cuenta?</h3>
              <p className="text-sm text-slate-500 mb-1">El usuario <strong>{confirmDelete.displayName}</strong> ({confirmDelete.rol})</p>
              <p className="text-sm text-slate-500">perderá el acceso al sistema hasta que sea reactivado.</p>
            </div>
            <div className="flex border-t border-slate-100">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-bl-2xl transition-colors">Cancelar</button>
              <button onClick={handleConfirmDeactivate} disabled={toggling !== null}
                className="flex-1 px-4 py-3 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-br-2xl transition-colors disabled:opacity-60">
                {toggling === confirmDelete.id ? '…' : 'Sí, inhabilitar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

