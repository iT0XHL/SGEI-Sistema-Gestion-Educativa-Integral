import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Loader2, AlertCircle, FileText, ChevronRight, Filter } from 'lucide-react';
import { libretasApi } from '@/lib/api/libretas.api';
import { periodosApi, bimestresApi } from '@/lib/api/periodos.api';
import type { RecepcionRow } from '@/types/libreta';
import { ReceptionProgressTable } from '../../components/libretas/ReceptionProgressTable';

export default function SecretariaLibretas() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<RecepcionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterPeriodo, setFilterPeriodo] = useState('');
  const [filterBimestre, setFilterBimestre] = useState('');
  const [filterSeccion, setFilterSeccion] = useState('');
  const [periodos, setPeriodos] = useState<{ id: string; nombre: string; anio: number }[]>([]);
  const [bimestres, setBimestres] = useState<{ id: string; nombre: string; numero: number }[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const pRes = await periodosApi.listar({ limit: 100 });
        setPeriodos(pRes.items);
        const activo = pRes.items.find(p => p.activo);
        if (activo) {
          setFilterPeriodo(activo.id);
          const bRes = await bimestresApi.listar({ periodoId: activo.id, limit: 10 });
          setBimestres(bRes.items);
        }
      } catch { /* ignore */ }
    }
    load();
  }, []);

  useEffect(() => {
    if (!filterPeriodo) return;
    bimestresApi.listar({ periodoId: filterPeriodo, limit: 10 })
      .then(r => setBimestres(r.items))
      .catch(() => {});
  }, [filterPeriodo]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const params: Record<string, string> = {};
        if (filterBimestre) params.bimestreId = filterBimestre;
        if (filterSeccion) params.seccionId = filterSeccion;
        const data = await libretasApi.estadoRecepcion(params);
        setRows(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar datos');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [filterBimestre, filterSeccion]);

  const gradosUnicos = [...new Set(rows.map(r => r.grado))];
  const seccionesPorGrado = rows.reduce((acc, r) => {
    const key = `${r.grado}-${r.seccion_nombre}`;
    if (!acc.has(key)) acc.set(key, { grado: r.grado, seccion_id: r.seccion_id, seccion_nombre: r.seccion_nombre });
    return acc;
  }, new Map<string, { grado: string; seccion_id: string; seccion_nombre: string }>());
  const seccionesList = Array.from(seccionesPorGrado.values());

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Libretas de Notas</h1>
          <p className="text-sm text-slate-500 mt-0.5">Recepción, revisión y publicación de libretas individuales</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="size-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-700">Filtros</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Período</label>
            <select
              value={filterPeriodo}
              onChange={e => setFilterPeriodo(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Todos</option>
              {periodos.map(p => (
                <option key={p.id} value={p.id}>{p.nombre} ({p.anio})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Bimestre</label>
            <select
              value={filterBimestre}
              onChange={e => setFilterBimestre(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Todos</option>
              {bimestres.map(b => (
                <option key={b.id} value={b.id}>{b.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Grado</label>
            <select
              value={filterSeccion}
              onChange={e => setFilterSeccion(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Todos</option>
              {seccionesList.map(s => (
                <option key={s.seccion_id} value={s.seccion_id}>{s.grado} - Sección {s.seccion_nombre}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
          <AlertCircle className="size-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Tabla de recepción */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-teal-600" />
          <span className="ml-2 text-sm text-slate-500">Cargando estado de recepción…</span>
        </div>
      ) : (
        <>
          {/* Resumen de secciones */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {seccionesList.slice(0, 8).map(s => {
              const seccionRows = rows.filter(r => r.seccion_id === s.seccion_id);
              const completas = seccionRows.filter(r => r.estado === 'Cerrado por docente' || r.estado === 'Completo').length;
              return (
                <button
                  key={s.seccion_id}
                  onClick={() => navigate(`/secretaria/libretas/secciones/${s.seccion_id}${filterBimestre ? `?bimestreId=${filterBimestre}` : ''}`)}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-left hover:shadow-md hover:border-teal-300 transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-slate-800">{s.grado} - {s.seccion_nombre}</span>
                    <ChevronRight className="size-4 text-slate-300 group-hover:text-teal-500 transition-colors" />
                  </div>
                  {completas > 0 && (
                    <p className="text-xs text-emerald-600 font-medium">{completas}/{seccionRows.length} cursos completos</p>
                  )}
                  <p className="text-xs text-slate-400 mt-0.5">{seccionRows.length} curso(s)</p>
                </button>
              );
            })}
          </div>

          <ReceptionProgressTable rows={rows} />
        </>
      )}
    </div>
  );
}
