import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Receipt, DollarSign, FileOutput, ChevronRight, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { secretariaApi } from '../../../lib/api/secretaria.api';

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Set','Oct','Nov','Dic'];

function LoadingSkeleton() {
  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      <div className="space-y-2">
        <div className="h-4 w-40 bg-slate-200 rounded animate-pulse" />
        <div className="h-7 w-64 bg-slate-200 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="h-10 w-10 bg-slate-200 rounded-xl animate-pulse mb-3" />
            <div className="h-8 w-20 bg-slate-200 rounded animate-pulse mb-1" />
            <div className="h-4 w-28 bg-slate-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="h-5 w-44 bg-slate-200 rounded animate-pulse mb-4" />
          <div className="h-[180px] bg-slate-100 rounded animate-pulse" />
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="h-5 w-32 bg-slate-200 rounded animate-pulse mb-4" />
          <div className="h-[150px] bg-slate-100 rounded animate-pulse" />
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="h-5 w-48 bg-slate-200 rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="h-14 bg-slate-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SecretariaDashboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['secretaria-resumen'],
    queryFn: () => secretariaApi.resumen(),
    refetchInterval: 30_000,
  });

  const { data: vouchersRecientes, isLoading: loadingVouchers } = useQuery({
    queryKey: ['secretaria-vouchers-recientes'],
    queryFn: () => secretariaApi.vouchersRecientes(),
    refetchInterval: 30_000,
  });

  if (isLoading) return <LoadingSkeleton />;
  if (isError || !data) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <p className="text-sm font-semibold text-red-800">Error al cargar el resumen</p>
          <p className="text-xs text-red-600 mt-1">Intenta de nuevo más tarde.</p>
        </div>
      </div>
    );
  }

  const r = data;
  const periodoLabel = r.periodo
    ? `${r.periodo.nombre} · ${r.periodo.anio}`
    : 'Sin período activo';

  const totalRecaudado = r.resumen_financiero.total_recaudado;
  const totalDeuda     = r.resumen_financiero.total_deuda;
  const pendientes     = r.resumen_financiero.vouchers_pendientes;
  const alumnosAlDia   = r.resumen_financiero.alumnos_al_dia;
  const alumnosDeuda   = r.resumen_financiero.alumnos_con_deuda;
  const morosos        = r.resumen_financiero.morosos;
  const deudaVigente   = Math.max(0, alumnosDeuda - morosos);

  const monthlyData = r.recaudacion_mensual.map(m => ({
    mes: MESES[m.mes - 1] ?? `M${m.mes}`,
    recaudado: m.monto,
  }));

  const paymentStatusData = [
    { name: 'Al día',      value: alumnosAlDia, color: '#059669' },
    { name: 'Deuda vigente', value: deudaVigente, color: '#d97706' },
    { name: 'Morosos',     value: morosos,       color: '#dc2626' },
  ].filter(d => d.value > 0);

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <p className="text-sm text-slate-500 mb-1">Panel de secretaría</p>
        <h1 className="text-2xl font-bold text-slate-900">Gestión Administrativa</h1>
        <p className="text-sm text-slate-500 mt-0.5">IEP Virgen del Carmen - Las Viñas · {periodoLabel}</p>
      </div>

      {pendientes > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <AlertCircle className="size-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">
              {pendientes} voucher{pendientes > 1 ? 's' : ''} pendiente{pendientes > 1 ? 's' : ''} de verificación
            </p>
            <p className="text-sm text-amber-700 mt-0.5">Revisa y confirma los comprobantes subidos por las familias.</p>
          </div>
          <Link to="/secretaria/vouchers" className="shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-medium transition-colors">
            Revisar ahora
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Vouchers pendientes',
            value: `${pendientes}`,
            sub: 'Por verificar',
            icon: Receipt,
            color: 'bg-amber-50 text-amber-600',
            to: '/secretaria/vouchers',
          },
          {
            label: 'Recaudado',
            value: `S/ ${(totalRecaudado / 1000).toFixed(1)}k`,
            sub: `Total pagado`,
            icon: DollarSign,
            color: 'bg-emerald-50 text-emerald-600',
            to: '/secretaria/pagos',
          },
          {
            label: 'Deuda total',
            value: `S/ ${(totalDeuda / 1000).toFixed(1)}k`,
            sub: 'Pendiente de cobro',
            icon: AlertCircle,
            color: 'bg-red-50 text-red-600',
            to: '/secretaria/pagos',
          },
          {
            label: 'Listos SIAGIE',
            value: `${r.total_listos_siagie}`,
            sub: `de ${r.total_alumnos} alumnos`,
            icon: FileOutput,
            color: 'bg-teal-50 text-teal-600',
            to: '/secretaria/siagie',
          },
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
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Recaudación mensual {r.periodo?.anio ?? ''}</h2>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `S/${v / 1000}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  formatter={(v: number) => [`S/ ${v.toLocaleString()}`, 'Recaudado']}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="recaudado" fill="#0d9488" radius={[6, 6, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[180px] text-sm text-slate-400">
              Sin datos de recaudación
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Estado de cuentas</h2>
          {paymentStatusData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" paddingAngle={3} isAnimationActive={false}>
                    {paymentStatusData.map((entry, i) => (
                      <Cell key={`cell-sec-${i}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
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
            </>
          ) : (
            <div className="flex items-center justify-center h-[150px] text-sm text-slate-400">
              Sin alumnos en el período
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Últimos vouchers enviados</h2>
          <Link to="/secretaria/vouchers" className="text-xs text-teal-600 hover:text-teal-800 transition-colors flex items-center gap-1">
            Ver todos <ChevronRight className="size-3.5" />
          </Link>
        </div>
        <div className="divide-y divide-slate-50">
          {loadingVouchers ? (
            <div className="px-5 py-6 text-center text-sm text-slate-400">Cargando...</div>
          ) : vouchersRecientes && vouchersRecientes.length > 0 ? (
            vouchersRecientes.map(v => {
              const iniciales = v.alumno.nombre_completo
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map(p => p[0])
                .join('')
                .toUpperCase();
              const mesNombre = v.mes ? MESES[v.mes - 1] ?? '' : '';
              return (
                <div key={v.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                  <div className="flex size-9 items-center justify-center rounded-full bg-teal-100 text-teal-700 text-sm font-semibold shrink-0">
                    {iniciales}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{v.alumno.nombre_completo}</p>
                    <p className="text-xs text-slate-400">{v.alumno.grado_seccion}{mesNombre ? ` · ${mesNombre}` : ''}</p>
                  </div>
                  <p className="text-sm font-bold text-slate-700 shrink-0">S/ {v.monto}</p>
                  {v.estado_revision === 'En_Revision' && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-medium shrink-0">
                      <Clock className="size-3" /> Pendiente
                    </span>
                  )}
                  {v.estado_revision === 'Aprobada' && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium shrink-0">
                      <CheckCircle2 className="size-3" /> Aprobado
                    </span>
                  )}
                  {v.estado_revision === 'Rechazada' && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-xs font-medium shrink-0">
                      Rechazado
                    </span>
                  )}
                  {v.estado_revision === 'En_Revision' && (
                    <Link to="/secretaria/vouchers" className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium transition-colors shrink-0">
                      Revisar
                    </Link>
                  )}
                </div>
              );
            })
          ) : (
            <div className="px-5 py-6 text-center text-sm text-slate-400">No hay vouchers enviados aún</div>
          )}
        </div>
      </div>
    </div>
  );
}
