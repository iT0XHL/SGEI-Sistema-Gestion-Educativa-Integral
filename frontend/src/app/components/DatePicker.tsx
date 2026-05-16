import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Calendar, X } from 'lucide-react';

const MONTHS_ES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];
const DAYS_SHORT = ['Lu','Ma','Mi','Ju','Vi','Sá','Do'];

// ── Presets de color (clases completas para Tailwind) ─────────────────────────
const PRESETS = {
  teal: {
    filled:       'border-teal-400 bg-teal-50 text-teal-800',
    ring:         'focus:ring-teal-400',
    selDay:       'bg-teal-600 text-white hover:bg-teal-700',
    selMonthYear: 'bg-teal-600 text-white',
    todayRing:    'ring-1 ring-teal-400 text-teal-700',
  },
  indigo: {
    filled:       'border-indigo-400 bg-indigo-50 text-indigo-800',
    ring:         'focus:ring-indigo-400',
    selDay:       'bg-indigo-600 text-white hover:bg-indigo-700',
    selMonthYear: 'bg-indigo-600 text-white',
    todayRing:    'ring-1 ring-indigo-400 text-indigo-700',
  },
} as const;

type ColorPreset = keyof typeof PRESETS;

interface DatePickerProps {
  value: string;           // YYYY-MM-DD
  onChange: (v: string) => void;
  max?: string;            // YYYY-MM-DD
  min?: string;            // YYYY-MM-DD
  placeholder?: string;
  color?: ColorPreset;
  hasError?: boolean;
}

export function DatePicker({
  value,
  onChange,
  max,
  min,
  placeholder = 'Seleccionar fecha',
  color = 'teal',
  hasError = false,
}: DatePickerProps) {
  const today      = new Date();
  const todayStr   = today.toISOString().split('T')[0];
  const parsed     = value ? new Date(value + 'T12:00:00') : null;

  // Año por defecto: año escolar actual
  const defaultYear  = today.getFullYear();
  const initYear     = (parsed && !isNaN(parsed.getTime())) ? parsed.getFullYear()  : defaultYear;
  const initMonth    = (parsed && !isNaN(parsed.getTime())) ? parsed.getMonth()     : 0;

  const [open,     setOpen]     = useState(false);
  const [view,     setView]     = useState<'day' | 'month' | 'year'>('day');
  const [navYear,  setNavYear]  = useState(initYear);
  const [navMonth, setNavMonth] = useState(initMonth);
  const [yearPage, setYearPage] = useState(Math.floor(initYear / 12) * 12);

  const c = PRESETS[color];

  // Sincronizar navegación cuando cambia value externamente
  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T12:00:00');
      if (!isNaN(d.getTime())) {
        setNavYear(d.getFullYear());
        setNavMonth(d.getMonth());
      }
    }
  }, [value]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  // Offset lunes-primero (Lu=0 … Do=6)
  const getFirstDay    = (y: number, m: number) => (new Date(y, m, 1).getDay() + 6) % 7;
  const pad2           = (n: number) => String(n).padStart(2, '0');
  const buildDateStr   = (y: number, m: number, d: number) => `${y}-${pad2(m + 1)}-${pad2(d)}`;

  function selectDay(day: number) {
    const ds = buildDateStr(navYear, navMonth, day);
    if (max && ds > max) return;
    if (min && ds < min) return;
    onChange(ds);
    setOpen(false);
    setView('day');
  }

  function prevMonth() {
    if (navMonth === 0) { setNavMonth(11); setNavYear(y => y - 1); }
    else setNavMonth(m => m - 1);
  }
  function nextMonth() {
    if (navMonth === 11) { setNavMonth(0); setNavYear(y => y + 1); }
    else setNavMonth(m => m + 1);
  }

  const daysInMonth = getDaysInMonth(navYear, navMonth);
  const firstDay    = getFirstDay(navYear, navMonth);

  const displayValue = (parsed && !isNaN(parsed.getTime()))
    ? `${pad2(parsed.getDate())}/${pad2(parsed.getMonth() + 1)}/${parsed.getFullYear()}`
    : '';

  return (
    <div>
      {/* ── Trigger ─────────────────────────────────────────────────────── */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(p => !p)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setOpen(p => !p); }}
        className={`w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm text-left cursor-pointer
          transition-all outline-none focus:ring-2 ${
          hasError
            ? 'border-red-400 bg-red-50 text-red-700 focus:ring-red-400'
            : value
              ? `${c.filled} ${c.ring}`
              : `border-slate-200 bg-slate-50 text-slate-400 ${c.ring}`
        } ${open ? 'ring-2' : ''}`}
      >
        <Calendar className="size-4 shrink-0 text-slate-400" />
        <span className={`flex-1 ${value ? '' : 'text-slate-400'}`}>{displayValue || placeholder}</span>
        {value ? (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onChange(''); setOpen(false); }}
            className="p-0.5 rounded-md hover:bg-black/10 text-slate-400 transition-colors"
          >
            <X className="size-3" />
          </button>
        ) : (
          <ChevronDown className={`size-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        )}
      </div>

      {/* ── Inline calendar — expands in document flow, no clipping ─────── */}
      {open && (
        <div className="mt-2 bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden select-none">

          {/* ── VISTA DÍA ── */}
          {view === 'day' && (
            <>
              {/* Header mes */}
              <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-slate-100">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <ChevronLeft className="size-4 text-slate-500" />
                </button>
                <button
                  type="button"
                  onClick={() => setView('month')}
                  className="px-3 py-1 rounded-lg hover:bg-slate-100 transition-colors text-sm font-semibold text-slate-700 capitalize"
                >
                  {MONTHS_ES[navMonth]} {navYear}
                </button>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <ChevronRight className="size-4 text-slate-500" />
                </button>
              </div>

              <div className="p-3">
                {/* Cabecera días */}
                <div className="grid grid-cols-7 mb-1">
                  {DAYS_SHORT.map(d => (
                    <span key={d} className="text-center text-[10px] font-semibold text-slate-400 py-1">{d}</span>
                  ))}
                </div>
                {/* Celdas */}
                <div className="grid grid-cols-7">
                  {Array.from({ length: firstDay }, (_, i) => <span key={`pad-${i}`} />)}
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const day  = i + 1;
                    const ds   = buildDateStr(navYear, navMonth, day);
                    const isSel = ds === value;
                    const isToday = ds === todayStr;
                    const isDis  = (!!max && ds > max) || (!!min && ds < min);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => !isDis && selectDay(day)}
                        disabled={isDis}
                        className={`flex size-8 items-center justify-center rounded-lg text-sm mx-auto transition-colors font-medium
                          ${isSel
                            ? c.selDay
                            : isDis
                              ? 'text-slate-300 cursor-not-allowed'
                              : isToday
                                ? c.todayRing
                                : 'text-slate-700 hover:bg-slate-100'
                          }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* ── VISTA MES ── */}
          {view === 'month' && (
            <>
              <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => setNavYear(y => y - 1)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <ChevronLeft className="size-4 text-slate-500" />
                </button>
                <button
                  type="button"
                  onClick={() => { setYearPage(Math.floor(navYear / 12) * 12); setView('year'); }}
                  className="px-3 py-1 rounded-lg hover:bg-slate-100 transition-colors text-sm font-semibold text-slate-700"
                >
                  {navYear}
                </button>
                <button
                  type="button"
                  onClick={() => setNavYear(y => y + 1)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <ChevronRight className="size-4 text-slate-500" />
                </button>
              </div>
              <div className="p-3 grid grid-cols-3 gap-1.5">
                {MONTHS_ES.map((m, i) => {
                  const isCurrent = i === navMonth && navYear === parsed?.getFullYear();
                  const isNav     = i === navMonth;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => { setNavMonth(i); setView('day'); }}
                      className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        isCurrent
                          ? c.selMonthYear
                          : isNav
                            ? 'bg-slate-200 text-slate-800'
                            : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {m.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* ── VISTA AÑO ── */}
          {view === 'year' && (
            <>
              <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => setYearPage(p => p - 12)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <ChevronLeft className="size-4 text-slate-500" />
                </button>
                <span className="text-sm font-semibold text-slate-700">
                  {yearPage} – {yearPage + 11}
                </span>
                <button
                  type="button"
                  onClick={() => setYearPage(p => p + 12)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <ChevronRight className="size-4 text-slate-500" />
                </button>
              </div>
              <div className="p-3 grid grid-cols-3 gap-1.5">
                {Array.from({ length: 12 }, (_, i) => yearPage + i).map(yr => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => { setNavYear(yr); setView('month'); }}
                    className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      yr === navYear
                        ? c.selMonthYear
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
