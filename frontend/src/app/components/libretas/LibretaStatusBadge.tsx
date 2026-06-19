import { ESTADO_LIBRETA_COLOR, ESTADO_LIBRETA_LABEL } from '@/types/libreta';
import type { EstadoLibreta } from '@/types/libreta';

export function LibretaStatusBadge({ estado }: { estado: EstadoLibreta }) {
  const color = ESTADO_LIBRETA_COLOR[estado] ?? 'bg-slate-100 text-slate-500';
  const label = ESTADO_LIBRETA_LABEL[estado] ?? estado;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${color}`}>
      {label}
    </span>
  );
}

export function RecepcionStatusBadge({ estado }: { estado: string }) {
  const colors: Record<string, string> = {
    Pendiente:            'bg-slate-50 text-slate-600 border-slate-200',
    Parcial:              'bg-amber-50 text-amber-700 border-amber-200',
    Completo:             'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Cerrado por docente':'bg-blue-50 text-blue-700 border-blue-200',
    'Observado':          'bg-red-50 text-red-700 border-red-200',
    'Validado por secretaría': 'bg-teal-50 text-teal-700 border-teal-200',
  };
  const color = colors[estado] ?? 'bg-slate-50 text-slate-500';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${color}`}>
      {estado}
    </span>
  );
}
