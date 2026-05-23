import { useState, useEffect, useMemo } from 'react';
import { GraduationCap, Save, CheckCircle2, ChevronDown, Search, Loader2, AlertTriangle } from 'lucide-react';
import {
  periodosApi,
  alumnosAdminApi,
  estructuraApi,
  type AlumnoResumenDTO,
  type SeccionDTO,
} from '@/lib/api/admin.api';
import { sfaApi } from '@/lib/api/situacion-final.api';
import type { SituacionFinal } from '@/types/situacion-final';

type Comportamiento = 'AD' | 'A' | 'B' | 'C';

interface AlumnoRow {
  alumno_id:    string;
  nombre:       string;
  initials:     string;
  grado:        string;
  nivel:        string;
  seccion:      string;
  situacion:    SituacionFinal | null;
  comportamiento: Comportamiento;
  areas_desap:  number;
  motivo:       string;
  dirty:        boolean;
  saving:       boolean;
  saved:        boolean;
}

const SITUACION_COLORS: Record<string, string> = {
  Promovido:  'bg-emerald-100 text-emerald-700',
  Repitente:  'bg-amber-100 text-amber-700',
  Retirado:   'bg-red-100 text-red-700',
  Trasladado: 'bg-red-100 text-red-700',
  Fallecido:  'bg-slate-100 text-slate-600',
};

function makeInitials(nombres: string, ap: string): string {
  return `${nombres[0] ?? ''}${ap[0] ?? ''}`.toUpperCase();
}

export default function SecretariaSituacionFinal() {
  const [rows,      setRows]      = useState<AlumnoRow[]>([]);
  const [periodoId, setPeriodoId] = useState<string | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const [filterNivel,   setFilterNivel]   = useState('Todos');
  const [filterGrado,   setFilterGrado]   = useState('Todos');
  const [filterSeccion, setFilterSeccion] = useState('Todos');
  const [search,        setSearch]        = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const periodosRes = await periodosApi.listar({ activo: true, limit: 1 });
        const activo      = periodosRes.items[0];
        if (!activo) {
          if (!cancelled) { setLoading(false); setError('No hay período académico activo.'); }
          return;
        }

        const [alumnosData, sfaData, seccionesData] = await Promise.all([
          alumnosAdminApi.listar({ limit: 500, activo: 'true', periodoId: activo.id }),
          sfaApi.listar({ periodoId: activo.id }),
          estructuraApi.secciones({ periodoId: activo.id }),
        ]);

        if (cancelled) return;

        const seccionMap = new Map<string, SeccionDTO>(seccionesData.map(s => [s.id, s]));
        const sfaMap     = new Map(sfaData.map(s => [s.alumno_id, s]));

        const mapped: AlumnoRow[] = (alumnosData.items as AlumnoResumenDTO[]).map(a => {
          const sfa = sfaMap.get(a.id);
          const sec = seccionMap.get(a.seccion.id);
          return {
            alumno_id:     a.id,
            nombre:        `${a.apellido_paterno} ${a.apellido_materno}, ${a.nombres}`,
            initials:      makeInitials(a.nombres, a.apellido_paterno),
            grado:         a.seccion.grado.nombre,
            nivel:         sec?.grado.nivel?.nombre ?? 'Secundaria',
            seccion:       a.seccion.nombre,
            situacion:     sfa?.situacion_final ?? null,
            comportamiento: (sfa?.comportamiento as Comportamiento | null) ?? 'A',
            areas_desap:   sfa?.numero_areas_desaprobadas ?? 0,
            motivo:        sfa?.motivo_retiro ?? '',
            dirty:         false,
            saving:        false,
            saved:         !!sfa,
          };
        });

        setPeriodoId(activo.id);
        setRows(mapped);
      } catch (e) {
        if (!cancelled) setError((e as Error).message ?? 'Error al cargar datos.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const niveles = useMemo(() =>
    ['Todos', ...new Set(rows.map(r => r.nivel))].sort(),
    [rows]);

  const grados = useMemo(() => {
    const base = rows.filter(r => filterNivel === 'Todos' || r.nivel === filterNivel);
    return ['Todos', ...new Set(base.map(r => r.grado))].sort();
  }, [rows, filterNivel]);

  const secciones = useMemo(() => {
    const base = rows.filter(r =>
      (filterNivel === 'Todos' || r.nivel === filterNivel) &&
      (filterGrado === 'Todos' || r.grado === filterGrado),
    );
    return ['Todos', ...new Set(base.map(r => r.seccion))].sort();
  }, [rows, filterNivel, filterGrado]);

  const filtered = useMemo(() => rows.filter(r => {
    if (filterNivel   !== 'Todos' && r.nivel   !== filterNivel)   return false;
    if (filterGrado   !== 'Todos' && r.grado   !== filterGrado)   return false;
    if (filterSeccion !== 'Todos' && r.seccion !== filterSeccion)  return false;
    if (search && !r.nombre.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [rows, filterNivel, filterGrado, filterSeccion, search]);

  const promovidos   = rows.filter(r => r.situacion === 'Promovido').length;
  const repitentes   = rows.filter(r => r.situacion === 'Repitente').length;
  const retirados    = rows.filter(r => r.situacion === 'Retirado' || r.situacion === 'Trasladado').length;
  const sinRegistrar = rows.filter(r => !r.situacion).length;

  function updateField<K extends keyof AlumnoRow>(id: string, field: K, value: AlumnoRow[K]) {
    setRows(prev => prev.map(r =>
      r.alumno_id === id ? { ...r, [field]: value, dirty: true, saved: false } : r,
    ));
  }

  async function handleSave(alumnoId: string) {
    if (!periodoId) return;
    const row = rows.find(r => r.alumno_id === alumnoId);
    const situacion = row?.situacion;
    if (!row || !situacion) return;

    const needsMotivo = situacion === 'Retirado' || situacion === 'Trasladado';
    if (needsMotivo && row.motivo.trim().length < 5) return;

    setRows(prev => prev.map(r => r.alumno_id === alumnoId ? { ...r, saving: true } : r));
    try {
      await sfaApi.upsert({
        alumno_id:                 alumnoId,
        periodo_id:                periodoId,
        situacion_final:           situacion,
        numero_areas_desaprobadas: row.areas_desap,
        comportamiento:            row.comportamiento,
        motivo_retiro:             row.motivo.trim() || undefined,
      });
      setRows(prev => prev.map(r =>
        r.alumno_id === alumnoId ? { ...r, dirty: false, saving: false, saved: true } : r,
      ));
    } catch {
      setRows(prev => prev.map(r => r.alumno_id === alumnoId ? { ...r, saving: false } : r));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="size-6 animate-spin text-teal-600" />
        <span className="ml-2 text-slate-500">Cargando alumnos…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertTriangle className="size-6 text-red-500" />
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <p className="text-sm text-slate-500 mb-1">Portal de Secretaría</p>
        <h1 className="text-2xl font-bold text-slate-900">Situación Final de Alumnos</h1>
        <p className="text-sm text-slate-500 mt-0.5">Registra la situación académica final de cada alumno para el acta SIAGIE</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Promovidos',            value: promovidos,   border: 'border-emerald-200', text: 'text-emerald-700' },
          { label: 'Repitentes',            value: repitentes,   border: 'border-amber-200',   text: 'text-amber-700'   },
          { label: 'Retirados/Trasladados', value: retirados,    border: 'border-red-200',     text: 'text-red-700'     },
          { label: 'Sin registrar',         value: sinRegistrar, border: 'border-slate-200',   text: 'text-slate-600'   },
        ].map(s => (
          <div key={s.label} className={`bg-white rounded-2xl border shadow-sm p-5 ${s.border}`}>
            <p className={`text-2xl font-bold ${s.text}`}>{s.value}</p>
            <p className="text-xs font-medium text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nivel</label>
            <div className="relative">
              <select
                value={filterNivel}
                onChange={e => { setFilterNivel(e.target.value); setFilterGrado('Todos'); setFilterSeccion('Todos'); }}
                className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                {niveles.map(n => <option key={n}>{n}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Grado</label>
            <div className="relative">
              <select
                value={filterGrado}
                onChange={e => { setFilterGrado(e.target.value); setFilterSeccion('Todos'); }}
                className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                {grados.map(g => <option key={g}>{g}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Sección</label>
            <div className="relative">
              <select
                value={filterSeccion}
                onChange={e => setFilterSeccion(e.target.value)}
                className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                {secciones.map(s => <option key={s}>{s}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Buscar alumno</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Nombre…"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
          <GraduationCap className="size-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-700">Alumnos</h2>
          <span className="ml-auto text-xs text-slate-400">{filtered.length} alumno{filtered.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[200px]">Alumno</th>
                <th className="text-center px-3 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Grado/Sec.</th>
                <th className="text-center px-3 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[160px]">Situación Final</th>
                <th className="text-center px-3 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[220px]">Motivo retiro</th>
                <th className="text-center px-3 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Comportamiento</th>
                <th className="text-center px-3 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Áreas desap.</th>
                <th className="text-right px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Guardar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(row => {
                const needsMotivo  = row.situacion === 'Retirado' || row.situacion === 'Trasladado';
                const motivoOk     = !needsMotivo || row.motivo.trim().length >= 5;
                const saveDisabled = !row.dirty || !row.situacion || row.saving || !motivoOk;
                return (
                  <tr
                    key={row.alumno_id}
                    className={`hover:bg-slate-50 transition-colors ${row.saved && !row.dirty ? 'bg-emerald-50/30' : ''}`}
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-8 items-center justify-center rounded-full bg-teal-100 text-teal-700 text-xs font-semibold shrink-0">
                          {row.initials}
                        </div>
                        <span className="text-sm font-medium text-slate-800 whitespace-nowrap">{row.nombre}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <span className="text-xs font-medium text-slate-600">{row.grado} {row.seccion}</span>
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <div className="relative inline-block">
                        <select
                          value={row.situacion ?? ''}
                          onChange={e => {
                            const val = (e.target.value || null) as SituacionFinal | null;
                            updateField(row.alumno_id, 'situacion', val);
                            if (val !== 'Retirado' && val !== 'Trasladado') {
                              updateField(row.alumno_id, 'motivo', '');
                            }
                          }}
                          className={`appearance-none pr-6 pl-2.5 py-1 rounded-full text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-teal-400 cursor-pointer ${
                            row.situacion
                              ? SITUACION_COLORS[row.situacion] + ' border-transparent'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          <option value="">Sin registrar</option>
                          <option value="Promovido">Promovido</option>
                          <option value="Repitente">Repitente</option>
                          <option value="Retirado">Retirado</option>
                          <option value="Trasladado">Trasladado</option>
                          <option value="Fallecido">Fallecido</option>
                        </select>
                        <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 size-3 pointer-events-none text-current opacity-60" />
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      {needsMotivo ? (
                        <input
                          type="text"
                          value={row.motivo}
                          onChange={e => updateField(row.alumno_id, 'motivo', e.target.value)}
                          placeholder="Motivo (mín. 5 caracteres)…"
                          className={`w-full text-xs px-2.5 py-1.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-teal-400 ${
                            row.motivo.trim().length < 5
                              ? 'border-red-300 bg-red-50'
                              : 'border-slate-200 bg-slate-50'
                          }`}
                        />
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <select
                        value={row.comportamiento}
                        onChange={e => updateField(row.alumno_id, 'comportamiento', e.target.value as Comportamiento)}
                        className="appearance-none bg-slate-50 border border-slate-200 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-400"
                      >
                        {(['AD', 'A', 'B', 'C'] as const).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <input
                        type="number"
                        min={0}
                        max={13}
                        value={row.areas_desap}
                        onChange={e => updateField(row.alumno_id, 'areas_desap', Math.min(13, Math.max(0, Number(e.target.value))))}
                        className="w-16 text-center text-xs border border-slate-200 bg-slate-50 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-400"
                      />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {row.saved && !row.dirty ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                          <CheckCircle2 className="size-3.5" /> Guardado
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSave(row.alumno_id)}
                          disabled={saveDisabled}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-teal-600 hover:bg-teal-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed ml-auto"
                        >
                          {row.saving
                            ? <><Loader2 className="size-3 animate-spin" /> Guardando…</>
                            : <><Save className="size-3" /> Guardar</>
                          }
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                    No se encontraron alumnos con los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
