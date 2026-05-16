import { Link } from 'react-router';
import { Receipt, DollarSign, FileOutput, ChevronRight, TrendingUp, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { PENDING_VOUCHERS, ALL_PAYMENTS_SEC } from '../../data/mockData';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const paymentStatusData = [
  { name: 'Pagados', value: ALL_PAYMENTS_SEC.filter(s=>s.status==='paid').length, color: '#059669' },
  { name: 'Parcial', value: ALL_PAYMENTS_SEC.filter(s=>s.status==='partial').length, color: '#d97706' },
  { name: 'Vencido', value: ALL_PAYMENTS_SEC.filter(s=>s.status==='overdue').length, color: '#dc2626' },
];

const monthlyData = [
  { mes: 'Ene', recaudado: 15750 },
  { mes: 'Feb', recaudado: 14350 },
  { mes: 'Mar', recaudado: 15050 },
  { mes: 'Abr', recaudado: 13400 },
  { mes: 'May', recaudado: 4200 },
];

export default function SecretariaDashboard() {
  const totalPending = PENDING_VOUCHERS.filter(v => v.status === 'pending').length;
  const totalRecaudado = monthlyData.reduce((s, m) => s + m.recaudado, 0);
  const totalDeuda = ALL_PAYMENTS_SEC.reduce((s, p) => s + p.pending, 0);

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <p className="text-sm text-slate-500 mb-1">Panel de secretaría</p>
        <h1 className="text-2xl font-bold text-slate-900">Gestión Administrativa</h1>
        <p className="text-sm text-slate-500 mt-0.5">I.E. San José de Calasanz · Mayo 2025</p>
      </div>

      {/* Alert: pending vouchers */}
      {totalPending > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <AlertCircle className="size-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">
              {totalPending} voucher{totalPending > 1 ? 's' : ''} pendiente{totalPending > 1 ? 's' : ''} de verificación
            </p>
            <p className="text-sm text-amber-700 mt-0.5">Revisa y confirma los comprobantes subidos por las familias.</p>
          </div>
          <Link to="/secretaria/vouchers" className="shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-medium transition-colors">
            Revisar ahora
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Vouchers pendientes', value: `${totalPending}`, sub: 'Por verificar', icon: Receipt,     color: 'bg-amber-50 text-amber-600',   to: '/secretaria/vouchers' },
          { label: 'Recaudado 2025',      value: `S/ ${(totalRecaudado/1000).toFixed(1)}k`, sub: 'Ene–May 2025', icon: DollarSign,  color: 'bg-emerald-50 text-emerald-600', to: '/secretaria/pagos' },
          { label: 'Deuda total',         value: `S/ ${(totalDeuda/1000).toFixed(1)}k`, sub: 'Pendiente de cobro', icon: AlertCircle, color: 'bg-red-50 text-red-600',      to: '/secretaria/pagos' },
          { label: 'Listos SIAGIE',       value: '116',  sub: 'de 124 alumnos',  icon: FileOutput,  color: 'bg-teal-50 text-teal-600',     to: '/secretaria/siagie' },
        ].map(s => (
          <Link key={s.label} to={s.to} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow group">
            <div className="flex items-start justify-between mb-3">
              <div className={`flex size-10 items-center justify-center rounded-xl ${s.color}`}>
                <s.icon className="size-5" />
              </div>
              <ChevronRight className="size-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
            </div>
            <p className="text-2xl font-bold text-slate-900 leading-none">{s.value}</p>
            <p className="text-sm font-medium text-slate-600 mt-1">{s.label}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Recaudación mensual 2025</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
              <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis key="xaxis" dataKey="mes" tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <YAxis key="yaxis" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `S/${v/1000}k`} />
              <Tooltip
                key="tooltip"
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                formatter={(v: number) => [`S/ ${v.toLocaleString()}`, 'Recaudado']}
                cursor={{ fill: '#f8fafc' }}
              />
              <Bar key="bar" dataKey="recaudado" fill="#0d9488" radius={[6, 6, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Payment status pie */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Estado de cuentas</h2>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie key="pie" data={paymentStatusData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" paddingAngle={3} isAnimationActive={false}>
                {paymentStatusData.map((entry, i) => <Cell key={`cell-sec-${i}`} fill={entry.color} />)}
              </Pie>
              <Tooltip key="tooltip" contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {paymentStatusData.map(d => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-xs text-slate-600">{d.name}</span>
                </div>
                <span className="text-xs font-bold text-slate-700">{d.value} alumnos</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent vouchers */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Últimos vouchers enviados</h2>
          <Link to="/secretaria/vouchers" className="text-xs text-teal-600 hover:text-teal-800 transition-colors flex items-center gap-1">
            Ver todos <ChevronRight className="size-3.5" />
          </Link>
        </div>
        <div className="divide-y divide-slate-50">
          {PENDING_VOUCHERS.map(v => (
            <div key={v.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
              <div className="flex size-9 items-center justify-center rounded-full bg-teal-100 text-teal-700 text-sm font-semibold shrink-0">
                {v.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">{v.studentName}</p>
                <p className="text-xs text-slate-400">{v.grade} · {v.month}</p>
              </div>
              <p className="text-sm font-bold text-slate-700 shrink-0">S/ {v.amount}</p>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-medium shrink-0">
                <Clock className="size-3" /> Pendiente
              </span>
              <Link to="/secretaria/vouchers" className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium transition-colors shrink-0">
                Revisar
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}