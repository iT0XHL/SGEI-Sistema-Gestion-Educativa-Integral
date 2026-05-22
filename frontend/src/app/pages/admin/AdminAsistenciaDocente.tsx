import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Clock, Save, ChevronDown, Loader2, AlertTriangle } from 'lucide-react';
import { asistenciaDocentesApi, getEstadoColor, getEstadoLabel, cargarDocentes } from '../../../lib/api/asistencias.api';
import type { AsistenciaDocenteRow, DocenteRow } from '../../../lib/api/asistencias.api';


type Estado = 'P' | 'F' | 'T' | 'J' | null;

const toLocalDate = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export default function AdminAsistenciaDocente() {
  const [date, setDate] = useState(toLocalDate(new Date()));
  const [docentes, setDocentes] = useState<DocenteRow[]>([]);
  const [attendance, setAttendance] = useState<Record<string, Estado>>({});
  const [historial, setHistorial] = useState<AsistenciaDocenteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  // Cargar docentes al montar
  useEffect(() => {
    async function loadData() {
      try {
        const docentesList = await cargarDocentes();
        setDocentes(docentesList);

        // Cargar asistencias del día actual
        const asisRes = await asistenciaDocentesApi.listar({
          fecha_inicio: date,
          fecha_fin: date,
          limit: 500
        });
        const asisMap: Record<string, Estado> = {};
        (asisRes.items || []).forEach(a => {
          asisMap[a.docente_id] = a.estado;
        });
        setAttendance(asisMap);

        // Cargar historial del mes
        const [year, month] = date.split('-');
        const firstDay = `${year}-${month}-01`;
        const lastDayObj = new Date(parseInt(year), parseInt(month), 0);
        const lastDay = toLocalDate(lastDayObj);
        const histRes = await asistenciaDocentesApi.listar({
          fecha_inicio: firstDay,
          fecha_fin: lastDay,
          limit: 500
        });
        setHistorial(histRes.items || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error cargando datos');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [date]);

  const present = Object.values(attendance).filter(v => v === 'P').length;
  const absent = Object.values(attendance).filter(v => v === 'F').length;
  const late = Object.values(attendance).filter(v => v === 'T').length;
  const justified = Object.values(attendance).filter(v => v === 'J').length;
  const total = docentes.length;

  async function mark(id: string, s: Estado) {
    setSaved(false);
    setAttendance(prev => ({ ...prev, [id]: prev[id] === s ? null : s }));
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      for (const [docenteId, estado] of Object.entries(attendance)) {
        if (estado === null) continue;

        const existing = historial.find(
          a => a.docente_id === docenteId && a.fecha.split('T')[0] === date
        );

        if (existing) {
          await asistenciaDocentesApi.actualizar(existing.id, { estado });
        } else {
          await asistenciaDocentesApi.crear({
            docente_id: docenteId,
            fecha: date,
            estado,
            justificacion: null,
          });
        }
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error guardando asistencia');
    } finally {
      setSaving(false);
    }
  }

  // Resumen mensual
  const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Setiembre','Octubre','Noviembre','Diciembre'];
  const currentMonth = MONTHS[parseInt(date.split('-')[1]) - 1];

  const monthData = historial.reduce((acc, a) => {
    const key = a.docente_id;
    if (!acc[key]) acc[key] = { present: 0, absent: 0, late: 0, justified: 0 };
    if (a.estado === 'P') acc[key].present++;
    if (a.estado === 'F') acc[key].absent++;
    if (a.estado === 'T') acc[key].late++;
    if (a.estado === 'J') acc[key].justified++;
    return acc;
  }, {} as Record<string, any>);

  const monthSummary = Object.values(monthData).reduce(
    (acc, data) => ({
      present: acc.present + data.present,
      absent: acc.absent + data.absent,
      late: acc.late + data.late,
      justified: acc.justified + data.justified,
    }),
    { present: 0, absent: 0, late: 0, justified: 0 }
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Asistencia Docente</h1>
          <p className="text-slate-600 mt-1">Registra y gestiona la asistencia del personal docente</p>
        </div>
        <div className="flex gap-3 items-center">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              saved ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saving ? 'Guardando…' : saved ? 'Guardado' : 'Guardar'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-red-800 text-sm">{error}</div>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-700">{present}</p>
          <p className="text-xs text-green-600 font-medium">Presentes</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-blue-700">{justified}</p>
          <p className="text-xs text-blue-600 font-medium">Justificados</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-amber-700">{late}</p>
          <p className="text-xs text-amber-600 font-medium">Tardanzas</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-red-700">{absent}</p>
          <p className="text-xs text-red-600 font-medium">Faltas</p>
        </div>
      </div>

      {/* Teacher list */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <p className="text-sm font-semibold text-slate-700">{total} docentes · {parseLocalDate(date).toLocaleDateString('es-PE', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
        <div className="divide-y divide-slate-200">
          {docentes.map(docente => {
            const estado = attendance[docente.id];
            const initials = `${docente.nombres?.charAt(0) || '?'}${docente.apellido_paterno?.charAt(0) || '?'}`.toUpperCase();
            return (
              <div key={docente.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition">
                <div className="flex w-10 h-10 items-center justify-center rounded-full bg-slate-200 text-slate-700 text-sm font-bold shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{docente.nombres} {docente.apellido_paterno}</p>
                  <p className="text-xs text-slate-400">{docente.dni}</p>
                </div>
                <div className={`hidden sm:block text-xs font-medium ${
                  estado === 'P' ? 'text-green-600' :
                  estado === 'F' ? 'text-red-600' :
                  estado === 'T' ? 'text-amber-600' :
                  estado === 'J' ? 'text-blue-600' :
                  'text-slate-400'
                }`}>
                  {estado ? getEstadoLabel(estado) : 'Sin marcar'}
                </div>
                <div className="flex gap-2 shrink-0">
                  {(['P', 'J', 'T', 'F'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => mark(docente.id, s)}
                      title={s === 'P' ? 'Presente' : s === 'F' ? 'Falta' : s === 'T' ? 'Tardanza' : 'Justificado'}
                      className={`flex w-9 h-9 items-center justify-center rounded-lg text-xs font-bold transition-all ${
                        estado === s
                          ? s === 'P' ? 'bg-green-500 text-white'
                            : s === 'F' ? 'bg-red-500 text-white'
                            : s === 'T' ? 'bg-amber-500 text-white'
                            : 'bg-blue-500 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Monthly summary */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-sm font-semibold text-slate-700">Resumen de {currentMonth}</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{monthSummary.present}</p>
            <p className="text-xs text-slate-600">Presentes</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{monthSummary.justified}</p>
            <p className="text-xs text-slate-600">Justificados</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-600">{monthSummary.late}</p>
            <p className="text-xs text-slate-600">Tardanzas</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{monthSummary.absent}</p>
            <p className="text-xs text-slate-600">Faltas</p>
          </div>
        </div>
      </div>
    </div>
  );
}
