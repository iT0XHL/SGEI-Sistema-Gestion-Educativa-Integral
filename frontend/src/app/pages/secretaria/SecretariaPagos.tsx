// ============================================================
//  SecretariaPagos.tsx — Estado de pagos por alumno.
//  Conectado 100% al backend. Sin mock data.
//  Roles permitidos: Admin, Secretaria.
// ============================================================
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router';
import {
  Search, CheckCircle2, AlertCircle, Clock,
  DollarSign, Users, Receipt, Loader2, MinusCircle,
} from 'lucide-react';
import {
  secretariaApi,
  type AlumnoPagoResumenDTO,
  type EstadoPagoAlumno,
} from '../../../lib/api/secretaria.api';

// ── Tipos derivados de UI ─────────────────────────────────────
type FilterStatus = 'all' | EstadoPagoAlumno;

const STATUS_CFG: Record<EstadoPagoAlumno, { label: string; cls: string; icon: React.ElementType }> = {
  al_dia:     { label: 'Al día',     cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  pendiente:  { label: 'Pendiente',  cls: 'bg-amber-50 text-amber-700 border-amber-200',       icon: Clock },
  moroso:     { label: 'Moroso',     cls: 'bg-red-50 text-red-700 border-red-200',             icon: AlertCircle },
  sin_cuotas: { label: 'Sin cuotas', cls: 'bg-slate-50 text-slate-600 border-slate-200',       icon: MinusCircle },
};

// ── Helpers ───────────────────────────────────────────────────
function initials(name: string) {
  return name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

function fmtSol(n: number) {
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Componente principal ──────────────────────────────────────
export default function SecretariaPagos() {
  const [data,      setData]      = useState<AlumnoPagoResumenDTO[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [filter,    setFilter]    = useState<FilterStatus>('all');
  const [search,    setSearch]    = useState('');

  // ── Carga inicial ─────────────────────────────────────────────
  useEffect(() => {
    async function cargar() {
      setLoading(true);
      setFetchError('');
      try {
        const res = await secretariaApi.pagosPorAlumno();
        setData(res);
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : 'No se pudo cargar el estado de pagos.');
      } finally {
        setLoading(false);
      }
    }
    cargar();
  }, []);

  // ── Filtrado ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return data.filter(r => {
      const matchSearch = !q
        || r.nombre_completo.toLowerCase().includes(q)
        || r.grado.toLowerCase().includes(q)
        || r.seccion.toLowerCase().includes(q);
      const matchFilter = filter === 'all' || r.estado_pago === filter;
      return matchSearch && matchFilter;
    });
  }, [data, filter, search]);

  // ── Resumen global ────────────────────────────────────────────
  const totalRecaudado = data.reduce((s, r) => s + r.monto_pagado, 0);
  const totalPendiente = data.reduce((s, r) => s + r.monto_pendiente, 0);
  const totalVencido   = data.reduce((s, r) => s + r.monto_vencido,   0);
  const countAlDia     = data.filter(r => r.estado_pago === 'al_dia').length;
  const countPendiente = data.filter(r => r.estado_pago === 'pendiente').length;
  const countMorosos   = data.filter(r => r.estado_pago === 'moroso').length;
  const countSinCuotas = data.filter(r => r.estado_pago === 'sin_cuotas').length;

  const FILTERS: { value: FilterStatus; label: string; count: number }[] = [
    { value: 'all',        label: 'Todos',     count: data.length },
    { value: 'al_dia',     label: 'Al día',    count: countAlDia },
    { value: 'pendiente',  label: 'Pendiente', count: countPendiente },
    { value: 'moroso',     label: 'Moroso',    count: countMorosos },
    ...(countSinCuotas > 0
      ? [{ value: 'sin_cuotas' as const, label: 'Sin cuotas', count: countSinCuotas }]
      : []),
  ];

  // ── Loading ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-slate-200 rounded" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-slate-200 rounded-2xl" />)}
        </div>
        <div className="h-12 bg-slate-200 rounded-2xl" />
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 mx-4 my-2 bg-slate-100 rounded" />)}
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <p className="text-sm text-slate-500 mb-1">Panel de secretaría</p>
        <h1 className="text-2xl font-bold text-slate-900">Estado de Pagos</h1>
        <p className="text-sm text-slate-500 mt-0.5">Seguimiento de pagos por alumno — período activo</p>
      </div>

      {/* Error */}
      {fetchError && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
          <AlertCircle className="size-5 text-red-600 shrink-0" />
          <p className="text-sm text-red-800 flex-1">{fetchError}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-50">
              <DollarSign className="size-4 text-emerald-600" />
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Recaudado</p>
          </div>
          <p className="text-xl font-bold text-slate-900">{fmtSol(totalRecaudado)}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            de {fmtSol(totalRecaudado + totalPendiente)}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-amber-50">
              <Clock className="size-4 text-amber-600" />
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Por cobrar</p>
          </div>
          <p className="text-xl font-bold text-slate-900">{fmtSol(totalPendiente)}</p>
          {totalVencido > 0 && (
            <p className="text-xs text-red-600 mt-0.5 font-medium">
              {fmtSol(totalVencido)} vencido
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-teal-50">
              <Users className="size-4 text-teal-600" />
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Al día</p>
          </div>
          <p className="text-xl font-bold text-slate-900">{countAlDia}</p>
          <p className="text-xs text-slate-400 mt-0.5">de {data.length} alumnos</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-red-50">
              <AlertCircle className="size-4 text-red-600" />
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Morosos</p>
          </div>
          <p className="text-xl font-bold text-slate-900">{countMorosos}</p>
          <p className="text-xs text-slate-400 mt-0.5">con cuotas vencidas</p>
        </div>
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === f.value
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {f.label}
              {f.count !== undefined && (
                <span className="ml-1.5 text-xs text-slate-400">{f.count}</span>
              )}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="search"
            placeholder="Buscar alumno, grado…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Alumno
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">
                  Grado / Sección
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Pagado
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Pendiente
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[120px]">
                  Avance
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(r => {
                const cfg     = STATUS_CFG[r.estado_pago];
                const Icon    = cfg.icon;
                const avance  = r.porcentaje_pagado;
                const barCls  = avance === 100 ? 'bg-emerald-500' : avance > 50 ? 'bg-amber-400' : avance > 0 ? 'bg-red-400' : 'bg-slate-300';

                return (
                  <tr key={r.alumno_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-8 items-center justify-center rounded-full bg-teal-100 text-teal-700 text-xs font-semibold shrink-0">
                          {initials(r.nombre_completo)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{r.nombre_completo}</p>
                          {r.fecha_proxima_vencimiento && r.estado_pago !== 'al_dia' && (
                            <p className="text-xs text-slate-400">
                              {r.estado_pago === 'moroso' ? 'Vencido desde' : 'Vence'}: {fmtFecha(r.fecha_proxima_vencimiento)}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 hidden sm:table-cell">
                      {r.grado} &quot;{r.seccion}&quot;
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <p className="font-semibold text-emerald-700">{fmtSol(r.monto_pagado)}</p>
                      <p className="text-[10px] text-slate-400 font-normal">
                        de {fmtSol(r.monto_total)}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {r.monto_pendiente > 0 ? (
                        <>
                          <p className={`font-semibold ${r.moroso ? 'text-red-600' : 'text-slate-700'}`}>
                            {fmtSol(r.monto_pendiente)}
                          </p>
                          {r.monto_vencido > 0 && (
                            <p className="text-[10px] text-red-500 font-medium">
                              {fmtSol(r.monto_vencido)} vencido
                            </p>
                          )}
                        </>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {r.cuotas_total > 0 ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${barCls}`}
                                style={{ width: `${avance}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-500 w-9 text-right shrink-0">
                              {avance}%
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400">
                            {r.cuotas_pagadas} pagadas
                            {r.cuotas_vencidas > 0 && (
                              <span className="text-red-500 font-medium"> · {r.cuotas_vencidas} vencidas</span>
                            )}
                            {' '}/ {r.cuotas_total}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Sin cuotas</span>
                      )}
                    </td>
                    <td className="text-center px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.cls}`}>
                        <Icon className="size-3" /> {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {r.boletas_total > 0 && (() => {
                        const q = encodeURIComponent(r.nombre_completo);
                        if (r.boletas_pendientes > 0) {
                          return (
                            <Link
                              to={`/secretaria/vouchers?q=${q}&estado=En_Revision`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-medium transition-colors"
                            >
                              <Receipt className="size-3.5" />
                              Revisar
                              {r.boletas_pendientes > 1 && (
                                <span className="ml-0.5 text-[10px]">({r.boletas_pendientes})</span>
                              )}
                            </Link>
                          );
                        }
                        const cls = r.boletas_aprobadas > 0
                          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                          : 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200';
                        return (
                          <Link
                            to={`/secretaria/vouchers?q=${q}`}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${cls}`}
                          >
                            <Receipt className="size-3.5" />
                            Ver vouchers
                            <span className="ml-0.5 text-[10px]">({r.boletas_total})</span>
                          </Link>
                        );
                      })()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filtered.length === 0 && !loading && (
            <div className="flex flex-col items-center py-12 text-center">
              {data.length === 0 ? (
                <>
                  <Loader2 className="size-8 text-slate-300 mb-3" />
                  <p className="text-slate-500">No hay alumnos registrados en el período activo.</p>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-8 text-slate-300 mb-3" />
                  <p className="text-slate-500">No se encontraron resultados para la búsqueda.</p>
                  {filter !== 'all' && (
                    <button
                      onClick={() => setFilter('all')}
                      className="mt-2 text-sm text-teal-600 hover:underline"
                    >
                      Ver todos
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
