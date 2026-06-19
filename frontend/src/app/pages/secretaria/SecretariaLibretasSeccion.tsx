import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import { Loader2, AlertCircle, Download, FileText, CheckCircle2, Eye, Lock, ArrowLeft } from 'lucide-react';
import { libretasApi } from '@/lib/api/libretas.api';
import { bimestresApi } from '@/lib/api/bimestres.api';
import { LibretaStatusBadge } from '../../components/libretas/LibretaStatusBadge';
import type { ResumenAlumnoLibreta } from '@/types/libreta';

export default function SecretariaLibretasSeccion() {
  const { seccionId } = useParams<{ seccionId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bimestreIdParam = searchParams.get('bimestreId') ?? '';

  const [alumnos, setAlumnos] = useState<ResumenAlumnoLibreta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [bimestres, setBimestres] = useState<{ id: string; nombre: string }[]>([]);
  const [filterBimestre, setFilterBimestre] = useState(bimestreIdParam);

  useEffect(() => {
    bimestresApi.listar()
      .then(r => setBimestres(r))
      .catch(() => {});
  }, []);

  useEffect(() => {
    async function load() {
      if (!seccionId) return;
      try {
        setLoading(true);
        setError(null);
        const data = await libretasApi.resumenSeccion(seccionId, filterBimestre || undefined);
        setAlumnos(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [seccionId, filterBimestre]);

  async function handleGenerar(alumnoId: string) {
    if (!filterBimestre) return;
    setGenerating(alumnoId);
    try {
      await libretasApi.generar(alumnoId, filterBimestre);
      const data = await libretasApi.resumenSeccion(seccionId!, filterBimestre);
      setAlumnos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar');
    } finally {
      setGenerating(null);
    }
  }

  async function handleGenerarLote() {
    if (!filterBimestre || !seccionId) return;
    setBatchGenerating(true);
    try {
      await libretasApi.generarLote(seccionId, filterBimestre);
      const data = await libretasApi.resumenSeccion(seccionId, filterBimestre);
      setAlumnos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar lote');
    } finally {
      setBatchGenerating(false);
    }
  }

  async function handleExportarLote() {
    if (!filterBimestre || !seccionId) return;
    setExporting(true);
    try {
      const blob = await libretasApi.descargarLote(seccionId, filterBimestre);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `libretas_seccion_${seccionId.slice(0, 8)}.zip`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 150);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al exportar');
    } finally {
      setExporting(false);
    }
  }

  const completos = alumnos.filter(a => a.notas_completas).length;
  const conLibreta = alumnos.filter(a => a.libreta_estado).length;

  if (loading) {
    return <div className="p-6 lg:p-8 max-w-6xl mx-auto"><Loader2 className="size-6 animate-spin text-teal-600" /></div>;
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/secretaria/libretas')} className="p-2 rounded-xl hover:bg-slate-200 transition-colors">
            <ArrowLeft className="size-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Detalle de Sección</h1>
            <p className="text-sm text-slate-500 mt-0.5">{alumnos.length} alumnos · {completos} completos · {conLibreta} con libreta</p>
          </div>
        </div>
        <div className="flex gap-3">
          <select
            value={filterBimestre}
            onChange={e => setFilterBimestre(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">Todos los bimestres</option>
            {bimestres.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
          </select>
          <button
            onClick={handleGenerarLote}
            disabled={batchGenerating || !filterBimestre}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
          >
            {batchGenerating ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
            {batchGenerating ? 'Generando…' : 'Generar lote'}
          </button>
          <button
            onClick={handleExportarLote}
            disabled={exporting || conLibreta === 0}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
          >
            {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            {exporting ? 'Exportando…' : 'Descargar ZIP'}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
          <AlertCircle className="size-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Alumno</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Competencias</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Notas</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">%</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Libreta</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Bloqueo</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {alumnos.map(a => {
              const pct = a.total_competencias > 0 ? Math.round((a.notas_registradas / a.total_competencias) * 100) : 0;
              return (
                <tr key={a.alumno_id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-slate-800">{a.alumno_nombre}</td>
                  <td className="text-center px-4 py-3.5 text-slate-600">{a.total_competencias}</td>
                  <td className="text-center px-4 py-3.5 text-slate-600">{a.notas_registradas}</td>
                  <td className="text-center px-4 py-3.5">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-12 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${pct === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-slate-500">{pct}%</span>
                    </div>
                  </td>
                  <td className="text-center px-4 py-3.5">
                    {a.libreta_estado ? (
                      <LibretaStatusBadge estado={a.libreta_estado as never} />
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="text-center px-4 py-3.5">
                    {a.bloquea ? (
                      <Lock className="size-4 text-red-400 mx-auto" />
                    ) : (
                      <CheckCircle2 className="size-4 text-emerald-400 mx-auto" />
                    )}
                  </td>
                  <td className="text-center px-4 py-3.5">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => navigate(`/secretaria/libretas/${a.alumno_id}${filterBimestre ? `?bimestreId=${filterBimestre}` : ''}`)}
                        className="p-2 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                        title="Vista previa"
                      >
                        <Eye className="size-4" />
                      </button>
                      <button
                        onClick={() => handleGenerar(a.alumno_id)}
                        disabled={generating === a.alumno_id || !filterBimestre}
                        className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
                        title="Generar libreta"
                      >
                        {generating === a.alumno_id ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
