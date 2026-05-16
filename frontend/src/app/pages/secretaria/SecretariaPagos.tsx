import { useState } from 'react';
import { Search, CheckCircle2, AlertCircle, Clock, DollarSign, TrendingUp } from 'lucide-react';
import { ALL_PAYMENTS_SEC } from '../../data/mockData';

type FilterStatus = 'all' | 'paid' | 'partial' | 'overdue';

// 🔄 Corrección #13 — 'partial' y 'overdue' son SOLO estados de UI.
// Se derivan de los datos DB; NUNCA se envían en INSERT/UPDATE a financial_schema.estado_pago.
// Al hacer PATCH usar únicamente: 'Pendiente' | 'En_Revision' | 'Pagado' | 'Rechazado'
function calcPaymentDisplayStatus(
  estadoDb: string,
  fechaVencimiento: string,
  tienePagosParciales: boolean
): 'paid' | 'partial' | 'overdue' | 'pending' {
  if (estadoDb === 'Pagado') return 'paid';
  const isPending = estadoDb === 'Pendiente' || estadoDb === 'En_Revision';
  if (isPending && new Date(fechaVencimiento) < new Date()) return 'overdue';
  if (isPending && tienePagosParciales) return 'partial';
  return 'pending';
}

const MONTHLY_FEE = 350;
const MORA_RATE   = 0.05;

function calcMora(pending: number): number {
  if (pending <= 0) return 0;
  const unpaidMonths = Math.round(pending / MONTHLY_FEE);
  return parseFloat((unpaidMonths * MONTHLY_FEE * MORA_RATE).toFixed(2));
}

export default function SecretariaPagos() {
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState<FilterStatus>('all');
  const [payments, setPayments] = useState(ALL_PAYMENTS_SEC);

  const filtered = payments.filter(p => {
    const matchSearch =
      p.studentName.toLowerCase().includes(search.toLowerCase()) ||
      p.grade.toLowerCase().includes(search.toLowerCase());
    // 🔄 Corrección #13 — filtrar por estado derivado, no por campo 'status' de la DB
    const displayStatus = calcPaymentDisplayStatus(p.estadoDb, p.fechaVencimiento, p.tienePagosParciales);
    const matchFilter = filter === 'all' || displayStatus === filter;
    return matchSearch && matchFilter;
  });

  const totalRecauded = payments.reduce((s, p) => s + p.paid, 0);
  const totalDebt     = payments.reduce((s, p) => s + p.pending, 0);
  const totalMora     = payments.reduce((s, p) => s + calcMora(p.pending), 0);
  // 🔄 Corrección #13 — contar 'overdue' mediante estado derivado
  const overdue = payments.filter(p =>
    calcPaymentDisplayStatus(p.estadoDb, p.fechaVencimiento, p.tienePagosParciales) === 'overdue'
  ).length;

  const STATUS_CONFIG = {
    paid:    { label: 'Al día',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    partial: { label: 'Parcial',   cls: 'bg-amber-50 text-amber-700 border-amber-200',       icon: Clock },
    overdue: { label: 'Vencido',   cls: 'bg-red-50 text-red-700 border-red-200',             icon: AlertCircle },
    pending: { label: 'Pendiente', cls: 'bg-slate-100 text-slate-600 border-slate-200',      icon: Clock },
  };

  const FILTERS: { value: FilterStatus; label: string }[] = [
    { value: 'all',     label: 'Todos' },
    { value: 'paid',    label: 'Al día' },
    { value: 'partial', label: 'Parcial' },
    { value: 'overdue', label: 'Vencido' },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Estado de Pagos</h1>
        <p className="text-sm text-slate-500 mt-0.5">Gestión de cuentas por cobrar — Año 2025</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-50">
              <DollarSign className="size-4 text-emerald-600" />
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Recaudado</p>
          </div>
          <p className="text-xl font-bold text-slate-900">S/ {totalRecauded.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-red-50">
              <AlertCircle className="size-4 text-red-600" />
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Por cobrar</p>
          </div>
          <p className="text-xl font-bold text-slate-900">S/ {totalDebt.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-orange-50">
              <TrendingUp className="size-4 text-orange-600" />
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Total mora</p>
          </div>
          <p className="text-xl font-bold text-orange-700">S/ {totalMora.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-0.5">5% × cuotas vencidas</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-amber-50">
              <Clock className="size-4 text-amber-600" />
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Morosos</p>
          </div>
          <p className="text-xl font-bold text-slate-900">{overdue} alumnos</p>
        </div>
      </div>

      {/* Mora info banner */}
      <div className="bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 flex items-center gap-3">
        <TrendingUp className="size-4 text-orange-600 shrink-0" />
        <p className="text-xs text-orange-700">
          <strong>Cálculo de mora:</strong> 5% del monto mensual (S/ {MONTHLY_FEE}) por cada cuota impaga, de forma acumulativa.
          Por ejemplo: 3 cuotas impagas → S/ {(3 * MONTHLY_FEE * MORA_RATE).toFixed(2)} de mora.
        </p>
      </div>

      {/* Filters + search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === f.value ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="search"
            placeholder="Buscar alumno o grado…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[520px]">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Alumno</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Grado</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Pagado</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-orange-600">Mora (5%)</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[120px]">Avance</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(student => {
                const pct  = Math.round(student.paid / student.total * 100);
                const mora = calcMora(student.pending);
                const unpaidMonths = Math.round(student.pending / MONTHLY_FEE);
                // 🔄 Corrección #13 — estado UI derivado de estadoDb + fecha + parciales
                const displayStatus = calcPaymentDisplayStatus(student.estadoDb, student.fechaVencimiento, student.tienePagosParciales);
                const st   = STATUS_CONFIG[displayStatus];
                const StatusIcon = st.icon;
                return (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-8 items-center justify-center rounded-full bg-teal-100 text-teal-700 text-xs font-semibold shrink-0">
                          {student.studentName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </div>
                        <span className="font-semibold text-slate-800">{student.studentName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 hidden sm:table-cell">{student.grade}</td>
                    <td className="px-4 py-3.5 text-right font-semibold text-emerald-700">
                      S/ {student.paid.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {mora > 0 ? (
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-orange-600">S/ {mora.toFixed(2)}</span>
                          <span className="text-[10px] text-slate-400">{unpaidMonths} cuota{unpaidMonths !== 1 ? 's' : ''} × 5%</span>
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${pct === 100 ? 'bg-emerald-500' : pct > 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 w-8 text-right">{pct}%</span>
                      </div>
                    </td>
                    <td className="text-center px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${st.cls}`}>
                        <StatusIcon className="size-3" /> {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {/* 🔄 Corrección #13 — comparar estadoDb, no el status UI */}
                      {student.estadoDb !== 'Pagado' && (
                        <button
                          onClick={() => setPayments(prev => prev.map(p =>
                            // Al PATCH: usar 'Pagado' (ENUM DB) — nunca 'paid'
                            p.id === student.id ? { ...p, estadoDb: 'Pagado' as const, paid: p.total, pending: 0 } : p
                          ))}
                          className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium transition-colors"
                        >
                          Marcar pagado
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center py-12 text-center">
              <p className="text-slate-500">No se encontraron resultados</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}