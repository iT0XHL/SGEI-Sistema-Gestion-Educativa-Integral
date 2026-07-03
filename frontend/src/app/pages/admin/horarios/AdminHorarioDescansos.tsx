import { useEffect, useState } from 'react';
import { Save, Loader2, Coffee, UtensilsCrossed } from 'lucide-react';
import type { NivelRow, PeriodoRow, DescansoDTO } from '@/lib/api/horarios.api';
import { useDescansos, useUpsertDescanso } from '@/hooks/admin/useHorariosAdmin';
import { DESCANSO_HOURS } from '@/app/components/horarios/horarioConstants';

interface AdminHorarioDescansosProps {
  periodoActivo: PeriodoRow;
  niveles: NivelRow[];
}

// Recreo y Refrigerio/Almuerzo varían por Nivel (decisión de negocio) — mismo
// horario Lunes-Viernes, editable en cualquier momento por el Admin. Sin
// flujo de publicación: el cambio se refleja de inmediato en Docente/Alumno.
export function AdminHorarioDescansos({ periodoActivo, niveles }: AdminHorarioDescansosProps) {
  const nivelIds = niveles.map((n) => n.id);
  const { data: descansos = [], isLoading } = useDescansos(periodoActivo.id, nivelIds);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="size-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
        <h2 className="text-sm font-semibold text-slate-700">Recreo y Refrigerio / Almuerzo por Nivel</h2>
        <p className="text-xs text-slate-400 mt-0.5">Mismo horario Lunes a Viernes. Docentes y Alumnos del nivel ven exactamente estas horas.</p>
      </div>
      <div className="divide-y divide-slate-50">
        {niveles.map((nivel) => (
          <NivelDescansoRow
            key={nivel.id}
            nivel={nivel}
            periodoActivo={periodoActivo}
            recreo={descansos.find((d) => d.nivel_id === nivel.id && d.tipo === 'RECREO')}
            refrigerio={descansos.find((d) => d.nivel_id === nivel.id && d.tipo === 'REFRIGERIO')}
          />
        ))}
        {niveles.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-slate-400">No hay niveles registrados.</p>
        )}
      </div>
    </div>
  );
}

function TimeRangeEditor({
  icon, label, inicio, fin, onInicio, onFin, onGuardar, guardando,
}: {
  icon: React.ReactNode;
  label: string;
  inicio: string;
  fin: string;
  onInicio: (v: string) => void;
  onFin: (v: string) => void;
  onGuardar: () => void;
  guardando: boolean;
}) {
  const inválido = fin <= inicio;
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600 w-28 shrink-0">{icon} {label}</span>
      <select value={inicio} onChange={(e) => onInicio(e.target.value)} className="bg-slate-50 border border-slate-200 text-xs rounded-lg px-2 py-1.5">
        {DESCANSO_HOURS.map((h) => <option key={h}>{h}</option>)}
      </select>
      <span className="text-slate-400 text-xs">–</span>
      <select value={fin} onChange={(e) => onFin(e.target.value)} className="bg-slate-50 border border-slate-200 text-xs rounded-lg px-2 py-1.5">
        {DESCANSO_HOURS.map((h) => <option key={h}>{h}</option>)}
      </select>
      <button
        onClick={onGuardar}
        disabled={guardando || inválido}
        title={inválido ? 'La hora de fin debe ser mayor que la de inicio' : undefined}
        className="flex items-center gap-1 bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
      >
        {guardando ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />} Guardar
      </button>
    </div>
  );
}

function NivelDescansoRow({
  nivel, periodoActivo, recreo, refrigerio,
}: {
  nivel: NivelRow;
  periodoActivo: PeriodoRow;
  recreo?: DescansoDTO;
  refrigerio?: DescansoDTO;
}) {
  const upsert = useUpsertDescanso();

  const [recreoInicio, setRecreoInicio] = useState(recreo?.hora_inicio ?? '10:00');
  const [recreoFin, setRecreoFin] = useState(recreo?.hora_fin ?? '10:15');
  const [refrigerioInicio, setRefrigerioInicio] = useState(refrigerio?.hora_inicio ?? '12:30');
  const [refrigerioFin, setRefrigerioFin] = useState(refrigerio?.hora_fin ?? '13:15');

  // Sincroniza si llegan valores nuevos del servidor (ej. tras guardar).
  useEffect(() => {
    if (recreo) { setRecreoInicio(recreo.hora_inicio); setRecreoFin(recreo.hora_fin); }
  }, [recreo?.hora_inicio, recreo?.hora_fin]);
  useEffect(() => {
    if (refrigerio) { setRefrigerioInicio(refrigerio.hora_inicio); setRefrigerioFin(refrigerio.hora_fin); }
  }, [refrigerio?.hora_inicio, refrigerio?.hora_fin]);

  return (
    <div className="px-5 py-4 space-y-3">
      <p className="text-sm font-semibold text-slate-800">{nivel.nombre}</p>
      <TimeRangeEditor
        icon={<Coffee className="size-3.5 text-amber-500" />}
        label="Recreo"
        inicio={recreoInicio}
        fin={recreoFin}
        onInicio={setRecreoInicio}
        onFin={setRecreoFin}
        guardando={upsert.isPending}
        onGuardar={() => upsert.mutate({ nivel_id: nivel.id, periodo_id: periodoActivo.id, tipo: 'RECREO', hora_inicio: recreoInicio, hora_fin: recreoFin })}
      />
      <TimeRangeEditor
        icon={<UtensilsCrossed className="size-3.5 text-orange-500" />}
        label="Refrigerio"
        inicio={refrigerioInicio}
        fin={refrigerioFin}
        onInicio={setRefrigerioInicio}
        onFin={setRefrigerioFin}
        guardando={upsert.isPending}
        onGuardar={() => upsert.mutate({ nivel_id: nivel.id, periodo_id: periodoActivo.id, tipo: 'REFRIGERIO', hora_inicio: refrigerioInicio, hora_fin: refrigerioFin })}
      />
    </div>
  );
}
