import { useState, useEffect } from 'react';
import { Sliders, CheckCircle2, AlertTriangle, PenLine, Save, X, Loader2 } from 'lucide-react';
import { escalaApi, periodosApi, type EscalaDTO, type PeriodoDTO } from '../../../lib/api/admin.api';

type EscalaKey = 'AD' | 'A' | 'B' | 'C';

const ESCALA_COLORS: Record<EscalaKey, string> = {
  AD: 'bg-emerald-100 text-emerald-700',
  A:  'bg-blue-100 text-blue-700',
  B:  'bg-amber-100 text-amber-700',
  C:  'bg-red-100 text-red-700',
};

interface RowEdit {
  rango_inferior: string;
  rango_superior: string;
  error: string;
}

export default function AdminEscalaLiteral() {
  const [periodos, setPeriodos] = useState<PeriodoDTO[]>([]);
  const [periodActivo, setPeriodActivo] = useState<PeriodoDTO | null>(null);
  const [items, setItems] = useState<EscalaDTO[]>([]);
  const [editing, setEditing] = useState<Record<string, RowEdit>>({});
  const [verifyResult, setVerifyResult] = useState<{ ok: boolean; messages: string[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPeriodos();
  }, []);

  async function loadPeriodos() {
    try {
      setLoading(true);
      setError('');
      const res = await periodosApi.listar();
      setPeriodos(res.items);
      const activo = res.items.find(p => p.activo);
      setPeriodActivo(activo || null);
      if (activo) {
        await loadEscala(activo.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando períodos');
    } finally {
      setLoading(false);
    }
  }

  async function loadEscala(periodoId: string) {
    try {
      const data = await escalaApi.listar(periodoId);
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando escala');
    }
  }

  function startEdit(item: EscalaDTO) {
    setEditing(prev => ({
      ...prev,
      [item.id]: {
        rango_inferior: String(item.rango_inferior),
        rango_superior: String(item.rango_superior),
        error: '',
      },
    }));
  }

  function cancelEdit(id: string) {
    setEditing(prev => { const next = { ...prev }; delete next[id]; return next; });
  }

  async function saveRow(id: string) {
    const row = editing[id];
    if (!row || !periodActivo) return;
    const inf = parseFloat(row.rango_inferior);
    const sup = parseFloat(row.rango_superior);

    if (isNaN(inf) || isNaN(sup)) {
      setEditing(prev => ({ ...prev, [id]: { ...prev[id], error: 'Ingresa valores numéricos válidos.' } }));
      return;
    }
    if (inf >= sup) {
      setEditing(prev => ({ ...prev, [id]: { ...prev[id], error: 'El rango inferior debe ser menor al superior.' } }));
      return;
    }
    if (inf < 0 || sup > 20) {
      setEditing(prev => ({ ...prev, [id]: { ...prev[id], error: 'Los rangos deben estar entre 0 y 20.' } }));
      return;
    }

    try {
      setSaving(true);
      const item = items.find(e => e.id === id);
      if (!item) return;

      // Construir escalas ajustando automáticamente los rangos para cobertura continua
      const sorted = [...items].sort((a, b) => a.rango_inferior - b.rango_inferior);
      const escalas = sorted.map(e => {
        if (e.id === id) {
          return { escala: e.escala, rango_inferior: inf, rango_superior: sup };
        }
        return { escala: e.escala, rango_inferior: e.rango_inferior, rango_superior: e.rango_superior };
      });

      // Ajustar rangos automáticamente para evitar huecos
      for (let i = 0; i < escalas.length - 1; i++) {
        // El rango superior del actual debe ser igual al rango inferior del siguiente
        escalas[i + 1].rango_inferior = escalas[i].rango_superior;
      }
      // Asegurar que el primero empiece en 0 y el último termine en 20
      escalas[0].rango_inferior = 0;
      escalas[escalas.length - 1].rango_superior = 20;

      await escalaApi.upsert({ periodo_id: periodActivo.id, escalas });
      await loadEscala(periodActivo.id);
      cancelEdit(id);
      setVerifyResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error guardando escala');
    } finally {
      setSaving(false);
    }
  }

  async function handleVerify() {
    if (!periodActivo) return;
    try {
      const result = await escalaApi.cobertura(periodActivo.id);
      setVerifyResult({ ok: result.completa, messages: result.cubre_0_20 ? [] : ['La escala no cubre el rango 0-20 correctamente.'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error verificando cobertura');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <p className="text-sm text-slate-500 mb-1">Panel de administración</p>
        <h1 className="text-2xl font-bold text-slate-900">Escala de Calificaciones</h1>
        <p className="text-sm text-slate-500 mt-0.5">Configura la conversión de nota vigesimal a escala literal (AD/A/B/C)</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
          <AlertTriangle className="size-5 text-red-600 shrink-0" />
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {/* Contexto de período */}
      {periodActivo ? (
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3">
          <Sliders className="size-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-800">Período activo: {periodActivo.nombre}</p>
            <p className="text-xs text-blue-700 mt-0.5">
              La escala literal define cómo se convierte la nota vigesimal (0–20) en calificación AD/A/B/C.
              Debe cubrir el rango completo de 0 a 20 sin superposiciones.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-amber-800">
            No hay período académico activo. Activa un período primero en <strong>Período Académico</strong>.
          </p>
        </div>
      )}

      {/* Tabla de escalas */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">Escalas de calificación (4 fijas)</p>
          <button
            onClick={handleVerify}
            disabled={saving || !periodActivo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-900 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="size-3.5" /> Verificar cobertura
          </button>
        </div>

        {/* Resultado de verificación */}
        {verifyResult && (
          <div className={`mx-5 mt-4 flex items-start gap-3 rounded-xl px-4 py-3 border ${verifyResult.ok ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
            {verifyResult.ok
              ? <CheckCircle2 className="size-5 text-emerald-600 shrink-0 mt-0.5" />
              : <AlertTriangle className="size-5 text-red-500 shrink-0 mt-0.5" />
            }
            <div>
              {verifyResult.ok
                ? <p className="text-sm font-medium text-emerald-800">Los rangos cubren el rango completo 0–20 sin huecos ni superposiciones.</p>
                : <>
                    <p className="text-sm font-medium text-red-800 mb-1">Se encontraron problemas:</p>
                    <ul className="space-y-0.5">
                      {verifyResult.messages.map((m, i) => <li key={i} className="text-xs text-red-700">• {m}</li>)}
                    </ul>
                  </>
              }
            </div>
          </div>
        )}

        <div className="overflow-x-auto p-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Escala</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Descripción</th>
                <th className="text-center px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Rango inferior</th>
                <th className="text-center px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Rango superior</th>
                <th className="text-right px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.map(item => {
                const isEditing = !!editing[item.id];
                const row = editing[item.id];
                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${ESCALA_COLORS[item.escala]}`}>
                        {item.escala}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700">{item.descripcion}</td>
                    <td className="px-4 py-3.5 text-center">
                      {isEditing ? (
                        <input
                          type="number" step="0.01" min="0" max="20"
                          value={row.rango_inferior}
                          onChange={e => setEditing(prev => ({ ...prev, [item.id]: { ...prev[item.id], rango_inferior: e.target.value, error: '' } }))}
                          className="w-20 text-center text-sm border border-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-slate-400"
                        />
                      ) : (
                        <span className="font-mono text-slate-700">{item.rango_inferior}</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {isEditing ? (
                        <div>
                          <input
                            type="number" step="0.01" min="0" max="20"
                            value={row.rango_superior}
                            onChange={e => setEditing(prev => ({ ...prev, [item.id]: { ...prev[item.id], rango_superior: e.target.value, error: '' } }))}
                            className="w-20 text-center text-sm border border-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-slate-400"
                          />
                          {row.error && <p className="text-xs text-red-500 mt-1 text-left">{row.error}</p>}
                        </div>
                      ) : (
                        <span className="font-mono text-slate-700">{item.rango_superior}</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => saveRow(item.id)} disabled={saving} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                            {saving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
                            Guardar
                          </button>
                          <button onClick={() => cancelEdit(item.id)} disabled={saving} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-50">
                            <X className="size-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => startEdit(item)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium ml-auto">
                          <PenLine className="size-3" /> Editar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
