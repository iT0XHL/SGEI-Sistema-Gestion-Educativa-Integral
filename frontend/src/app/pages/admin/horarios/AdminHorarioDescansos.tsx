import { useEffect, useState } from 'react';
import { Save, Loader2, Coffee, UtensilsCrossed, Clock, AlertTriangle } from 'lucide-react';
import type { NivelRow, PeriodoRow, DescansoDTO } from '@/lib/api/horarios.api';
import { ApiError } from '@/lib/api/client';
import {
  useDescansos, useUpsertDescanso, useJornadaConfig, useUpsertJornadaConfig,
} from '@/hooks/admin/useHorariosAdmin';
import { DESCANSO_HOURS } from '@/app/components/horarios/horarioConstants';

interface AdminHorarioDescansosProps {
  periodoActivo: PeriodoRow;
  niveles: NivelRow[];
}

// Franjas de inicio de jornada ofrecidas al Admin (06:00-09:00 en incrementos de 5 min).
const JORNADA_INICIO_HOURS: string[] = (() => {
  const opts: string[] = [];
  for (let h = 6; h <= 9; h++) {
    for (let m = 0; m < 60; m += 5) {
      if (h === 9 && m > 0) break;
      opts.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return opts;
})();

const DURACION_HORA_OPCIONES = [30, 35, 40, 45, 50, 55, 60, 70, 80, 90];

// Recreo y Refrigerio/Almuerzo son anclas fijas a CUALQUIER hora que el
// Admin elija — varían por Nivel, mismo horario Lunes-Viernes, editables
// en cualquier momento. Los bloques de clase se calculan alrededor de
// ellos (ver horarioSlots.ts), así que no hay restricción de horario
// para el Recreo/Refrigerio en sí. Sin flujo de publicación: el cambio
// se refleja de inmediato en Docente/Alumno.
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
        <h2 className="text-sm font-semibold text-slate-700">Jornada, Recreo y Refrigerio / Almuerzo por Nivel</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Recreo y Refrigerio son fijos, a la hora que definas. Los bloques de clase se calculan alrededor de ellos: hacia
          atrás desde el Recreo hasta el inicio de jornada, entre Recreo y Refrigerio, y después del Refrigerio hasta
          completar el total de horas del día.
        </p>
      </div>
      <div className="divide-y divide-slate-100">
        {niveles.map((nivel) => (
          <NivelJornadaRow
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
  icon, label, inicio, fin, onInicio, onFin, onGuardar, guardando, error,
}: {
  icon: React.ReactNode;
  label: string;
  inicio: string;
  fin: string;
  onInicio: (v: string) => void;
  onFin: (v: string) => void;
  onGuardar: () => void;
  guardando: boolean;
  error?: string;
}) {
  const inválido = fin <= inicio;
  return (
    <div className="space-y-1">
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
      {error && (
        <p className="flex items-center gap-1 text-[11px] text-red-600 pl-[7.5rem]">
          <AlertTriangle className="size-3 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}

function NivelJornadaRow({
  nivel, periodoActivo, recreo, refrigerio,
}: {
  nivel: NivelRow;
  periodoActivo: PeriodoRow;
  recreo?: DescansoDTO;
  refrigerio?: DescansoDTO;
}) {
  const { data: jornada } = useJornadaConfig(periodoActivo.id, nivel.id);
  const upsertJornada = useUpsertJornadaConfig();
  const upsertDescanso = useUpsertDescanso();

  const [horaInicioJornada, setHoraInicioJornada] = useState(jornada?.hora_inicio_jornada ?? '07:30');
  const [duracionHoraMin, setDuracionHoraMin] = useState(jornada?.duracion_hora_min ?? 50);
  const [totalHorasDia, setTotalHorasDia] = useState(jornada?.total_horas_dia ?? 8);
  useEffect(() => {
    if (jornada) {
      setHoraInicioJornada(jornada.hora_inicio_jornada);
      setDuracionHoraMin(jornada.duracion_hora_min);
      setTotalHorasDia(jornada.total_horas_dia);
    }
  }, [jornada?.hora_inicio_jornada, jornada?.duracion_hora_min, jornada?.total_horas_dia]);

  const [recreoInicio, setRecreoInicio] = useState(recreo?.hora_inicio ?? '10:00');
  const [recreoFin, setRecreoFin] = useState(recreo?.hora_fin ?? '10:15');
  const [refrigerioInicio, setRefrigerioInicio] = useState(refrigerio?.hora_inicio ?? '12:30');
  const [refrigerioFin, setRefrigerioFin] = useState(refrigerio?.hora_fin ?? '13:15');
  const [errorRecreo, setErrorRecreo] = useState('');
  const [errorRefrigerio, setErrorRefrigerio] = useState('');

  // Sincroniza si llegan valores nuevos del servidor (ej. tras guardar).
  useEffect(() => {
    if (recreo) { setRecreoInicio(recreo.hora_inicio); setRecreoFin(recreo.hora_fin); }
  }, [recreo?.hora_inicio, recreo?.hora_fin]);
  useEffect(() => {
    if (refrigerio) { setRefrigerioInicio(refrigerio.hora_inicio); setRefrigerioFin(refrigerio.hora_fin); }
  }, [refrigerio?.hora_inicio, refrigerio?.hora_fin]);

  return (
    <div className="px-5 py-4 space-y-4">
      <p className="text-sm font-semibold text-slate-800">{nivel.nombre}</p>

      <div className="flex items-center gap-2 flex-wrap bg-slate-50 rounded-lg px-3 py-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600 w-28 shrink-0">
          <Clock className="size-3.5 text-slate-500" /> Jornada
        </span>
        <select value={horaInicioJornada} onChange={(e) => setHoraInicioJornada(e.target.value)} className="bg-white border border-slate-200 text-xs rounded-lg px-2 py-1.5">
          {JORNADA_INICIO_HOURS.map((h) => <option key={h}>{h}</option>)}
        </select>
        <span className="text-[11px] text-slate-400">hora escolar de</span>
        <select value={duracionHoraMin} onChange={(e) => setDuracionHoraMin(Number(e.target.value))} className="bg-white border border-slate-200 text-xs rounded-lg px-2 py-1.5">
          {DURACION_HORA_OPCIONES.map((m) => <option key={m} value={m}>{m} min</option>)}
        </select>
        <span className="text-[11px] text-slate-400">total de</span>
        <select value={totalHorasDia} onChange={(e) => setTotalHorasDia(Number(e.target.value))} className="bg-white border border-slate-200 text-xs rounded-lg px-2 py-1.5">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n} horas/día</option>)}
        </select>
        <button
          onClick={() => upsertJornada.mutate({ nivel_id: nivel.id, periodo_id: periodoActivo.id, hora_inicio_jornada: horaInicioJornada, duracion_hora_min: duracionHoraMin, total_horas_dia: totalHorasDia })}
          disabled={upsertJornada.isPending}
          className="flex items-center gap-1 bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
        >
          {upsertJornada.isPending ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />} Guardar
        </button>
      </div>

      <TimeRangeEditor
        icon={<Coffee className="size-3.5 text-amber-500" />}
        label="Recreo"
        inicio={recreoInicio}
        fin={recreoFin}
        onInicio={setRecreoInicio}
        onFin={setRecreoFin}
        guardando={upsertDescanso.isPending}
        error={errorRecreo}
        onGuardar={() => {
          setErrorRecreo('');
          upsertDescanso.mutate(
            { nivel_id: nivel.id, periodo_id: periodoActivo.id, tipo: 'RECREO', hora_inicio: recreoInicio, hora_fin: recreoFin },
            { onError: (err) => setErrorRecreo(err instanceof ApiError ? err.message : 'Error guardando el recreo.') },
          );
        }}
      />
      <TimeRangeEditor
        icon={<UtensilsCrossed className="size-3.5 text-orange-500" />}
        label="Refrigerio"
        inicio={refrigerioInicio}
        fin={refrigerioFin}
        onInicio={setRefrigerioInicio}
        onFin={setRefrigerioFin}
        guardando={upsertDescanso.isPending}
        error={errorRefrigerio}
        onGuardar={() => {
          setErrorRefrigerio('');
          upsertDescanso.mutate(
            { nivel_id: nivel.id, periodo_id: periodoActivo.id, tipo: 'REFRIGERIO', hora_inicio: refrigerioInicio, hora_fin: refrigerioFin },
            { onError: (err) => setErrorRefrigerio(err instanceof ApiError ? err.message : 'Error guardando el refrigerio.') },
          );
        }}
      />
    </div>
  );
}
