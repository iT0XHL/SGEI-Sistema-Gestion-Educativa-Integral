import { X, Edit2 } from 'lucide-react';
import { COLOR_MAP } from '../../data/mockData';
import { DAYS, DAY_TO_NUMBER, seSolapan } from './horarioConstants';
import type { Franja } from './horarioSlots';

const COLOR_LIST = ['blue', 'emerald', 'amber', 'purple', 'indigo', 'red', 'pink', 'teal'] as const;

// Forma mínima común entre un bloque "borrador" (HorarioRow) y un bloque
// "publicado" (HorarioPublicadoBloque) — el grid no necesita saber cuál es.
export interface HorarioGridBloque {
  id?: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  aula: string | null;
  curso: string;
  docente?: string;
  seccion?: string;
  grado?: string;
  nivel?: string;
}

interface HorarioSemanalGridProps {
  bloques: HorarioGridBloque[];
  mode: 'edit' | 'readonly';
  /** Etiqueta secundaria a mostrar bajo el curso: la sección (vista por Docente) o el docente (vista por Sección/Alumno). */
  mostrarEtiqueta?: 'docente' | 'seccion' | 'ninguna';
  /** Franjas del nivel (o niveles combinados) — filas de clase + Recreo/Refrigerio en su lugar real. */
  franjas: Franja[];
  onEdit?: (bloque: HorarioGridBloque) => void;
  onDelete?: (bloque: HorarioGridBloque) => void;
}

const DESCANSO_LABEL: Record<'RECREO' | 'REFRIGERIO', string> = {
  RECREO: 'Recreo',
  REFRIGERIO: 'Refrigerio / Almuerzo',
};

const DESCANSO_STYLE: Record<'RECREO' | 'REFRIGERIO', string> = {
  RECREO: 'bg-amber-50 border-amber-200 text-amber-700',
  REFRIGERIO: 'bg-orange-50 border-orange-200 text-orange-700',
};

export function HorarioSemanalGrid({ bloques, mode, mostrarEtiqueta = 'ninguna', franjas, onEdit, onDelete }: HorarioSemanalGridProps) {
  const cursoColor = new Map<string, typeof COLOR_LIST[number]>();
  let colorIdx = 0;
  function colorDe(curso: string) {
    if (!cursoColor.has(curso)) {
      cursoColor.set(curso, COLOR_LIST[colorIdx % COLOR_LIST.length]!);
      colorIdx += 1;
    }
    return COLOR_MAP[cursoColor.get(curso)!];
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="grid grid-cols-[64px_repeat(5,minmax(0,1fr))]">
        {/* Encabezado */}
        <div className="bg-slate-50 border-b border-r border-slate-100" />
        {DAYS.map((day) => (
          <div key={day} className="bg-slate-50 border-b border-slate-100 px-2 py-2 text-center">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">{day}</p>
          </div>
        ))}

        {/* Filas por franja */}
        {franjas.map((franja) => {
          if (franja.tipo !== 'CLASE') {
            return (
              <div key={`${franja.tipo}-${franja.hora_inicio}`} className="contents">
                <div className="border-b border-r border-slate-100 px-1 py-2 text-center bg-slate-50">
                  <p className="text-[10px] text-slate-400">{franja.hora_inicio}</p>
                </div>
                <div className={`col-span-5 border-b border-slate-100 px-3 py-2 flex items-center justify-center gap-2 border ${DESCANSO_STYLE[franja.tipo]}`}>
                  <p className="text-xs font-semibold">
                    {DESCANSO_LABEL[franja.tipo]} · {franja.hora_inicio}–{franja.hora_fin}
                  </p>
                </div>
              </div>
            );
          }

          return (
            <div key={`CLASE-${franja.hora_inicio}`} className="contents">
              <div className="border-b border-r border-slate-100 px-1 py-2 text-center bg-slate-50">
                <p className="text-[10px] text-slate-400">{franja.hora_inicio}</p>
              </div>
              {DAYS.map((day) => {
                const item = bloques.find(
                  (b) => b.dia_semana === DAY_TO_NUMBER[day] && seSolapan(franja.hora_inicio, franja.hora_fin, b.hora_inicio, b.hora_fin),
                );

                if (!item) {
                  return (
                    <div key={day} className="border-b border-r border-slate-50 last:border-r-0 min-h-[52px] flex items-center justify-center">
                      <span className="text-slate-200 text-xs">—</span>
                    </div>
                  );
                }

                const c = colorDe(item.curso);
                return (
                  <div key={day} className={`relative group border-b border-r border-slate-50 last:border-r-0 p-1.5 ${c.light}`}>
                    <p className={`text-[11px] font-semibold ${c.text} leading-tight truncate`}>{item.curso}</p>
                    {mostrarEtiqueta === 'seccion' && (item.seccion || item.grado) && (
                      <p className="text-[10px] text-slate-500 truncate">{item.grado} {item.seccion}</p>
                    )}
                    {mostrarEtiqueta === 'docente' && item.docente && (
                      <p className="text-[10px] text-slate-500 truncate">{item.docente}</p>
                    )}
                    {item.aula && <p className="text-[10px] text-slate-400 truncate">{item.aula}</p>}

                    {mode === 'edit' && (onEdit || onDelete) && (
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 flex gap-0.5 transition-all">
                        {onEdit && (
                          <button onClick={() => onEdit(item)} className="p-0.5 rounded-md bg-white/80 text-blue-500 hover:text-blue-700">
                            <Edit2 className="size-3" />
                          </button>
                        )}
                        {onDelete && (
                          <button onClick={() => onDelete(item)} className="p-0.5 rounded-md bg-white/80 text-red-500 hover:text-red-700">
                            <X className="size-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
