import { useState, useMemo } from 'react';
import { GraduationCap, Save, CheckCircle2, ChevronDown, Search } from 'lucide-react';
import { STUDENTS_3A } from '../../data/mockData';

type SituacionFinal = 'Promovido' | 'Repitente' | 'Retirado' | 'Trasladado' | 'Fallecido' | null;
type Comportamiento = 'AD' | 'A' | 'B' | 'C';

interface AlumnoSituacion {
  id: string;
  name: string;
  initials: string;
  grado: string;
  seccion: string;
  situacion_final: SituacionFinal;
  comportamiento: Comportamiento;
  numero_areas_desaprobadas: number;
  motivo_retiro: string;
  dirty: boolean;
  saved: boolean;
}

const SITUACION_COLORS: Record<string, string> = {
  Promovido:   'bg-emerald-100 text-emerald-700',
  Repitente:   'bg-amber-100 text-amber-700',
  Retirado:    'bg-red-100 text-red-700',
  Trasladado:  'bg-red-100 text-red-700',
  Fallecido:   'bg-slate-100 text-slate-600',
};

const INITIAL_DATA: AlumnoSituacion[] = STUDENTS_3A.map(s => ({
  id: s.id,
  name: s.name,
  initials: s.initials,
  grado: '3°',
  seccion: 'A',
  situacion_final: null,
  comportamiento: 'A',
  numero_areas_desaprobadas: 0,
  motivo_retiro: '',
  dirty: false,
  saved: false,
}));

const GRADOS = ['1°', '2°', '3°', '4°', '5°'];
const SECCIONES = ['A', 'B', 'C'];

export default function SecretariaSituacionFinal() {
  const [alumnos, setAlumnos] = useState<AlumnoSituacion[]>(INITIAL_DATA);
  const [filterNivel,   setFilterNivel]   = useState('Secundaria');
  const [filterGrado,   setFilterGrado]   = useState('Todos');
  const [filterSeccion, setFilterSeccion] = useState('Todos');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => alumnos.filter(a => {
    const matchGrado   = filterGrado   === 'Todos' || a.grado   === filterGrado;
    const matchSeccion = filterSeccion === 'Todos' || a.seccion === filterSeccion;
    const matchSearch  = a.name.toLowerCase().includes(search.toLowerCase());
    return matchGrado && matchSeccion && matchSearch;
  }), [alumnos, filterGrado, filterSeccion, search]);

  // Estadísticas
  const promovidos   = alumnos.filter(a => a.situacion_final === 'Promovido').length;
  const repitentes   = alumnos.filter(a => a.situacion_final === 'Repitente').length;
  const retirados    = alumnos.filter(a => a.situacion_final === 'Retirado' || a.situacion_final === 'Trasladado').length;
  const sinRegistrar = alumnos.filter(a => !a.situacion_final).length;

  function updateField<K extends keyof AlumnoSituacion>(id: string, field: K, value: AlumnoSituacion[K]) {
    setAlumnos(prev => prev.map(a =>
      a.id === id ? { ...a, [field]: value, dirty: true, saved: false } : a
    ));
  }

  function handleSave(id: string) {
    const alumno = alumnos.find(a => a.id === id);
    if (!alumno) return;
    const needsMotivo = alumno.situacion_final === 'Retirado' || alumno.situacion_final === 'Trasladado';
    if (needsMotivo && !alumno.motivo_retiro.trim()) return;
    // En producción: await fetch(`/api/situacion-final/${id}`, { method: 'PATCH', body: JSON.stringify(alumno) });
    setAlumnos(prev => prev.map(a => a.id === id ? { ...a, dirty: false, saved: true } : a));
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <p className="text-sm text-slate-500 mb-1">Portal de Secretaría</p>
        <h1 className="text-2xl font-bold text-slate-900">Situación Final de Alumnos</h1>
        <p className="text-sm text-slate-500 mt-0.5">Registra la situación académica final de cada alumno para el acta SIAGIE</p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Promovidos',          value: promovidos,   cls: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
          { label: 'Repitentes',          value: repitentes,   cls: 'bg-amber-50 border-amber-200 text-amber-700' },
          { label: 'Retirados/Trasladados', value: retirados,  cls: 'bg-red-50 border-red-200 text-red-700' },
          { label: 'Sin registrar',       value: sinRegistrar, cls: 'bg-slate-50 border-slate-200 text-slate-600' },
        ].map(stat => (
          <div key={stat.label} className={`bg-white rounded-2xl border shadow-sm p-5 ${stat.cls.split(' ').find(c => c.startsWith('border'))}`}>
            <p className={`text-2xl font-bold ${stat.cls.split(' ').find(c => c.startsWith('text'))}`}>{stat.value}</p>
            <p className="text-xs font-medium text-slate-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Nivel */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nivel</label>
            <div className="relative">
              <select value={filterNivel} onChange={e => setFilterNivel(e.target.value)}
                className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-teal-400">
                <option>Primaria</option>
                <option>Secundaria</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
          {/* Grado */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Grado</label>
            <div className="relative">
              <select value={filterGrado} onChange={e => setFilterGrado(e.target.value)}
                className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-teal-400">
                <option value="Todos">Todos</option>
                {GRADOS.map(g => <option key={g}>{g}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
          {/* Sección */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Sección</label>
            <div className="relative">
              <select value={filterSeccion} onChange={e => setFilterSeccion(e.target.value)}
                className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-teal-400">
                <option value="Todos">Todas</option>
                {SECCIONES.map(s => <option key={s}>{s}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
          {/* Búsqueda */}
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

      {/* Tabla */}
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
              {filtered.map(alumno => {
                const needsMotivo = alumno.situacion_final === 'Retirado' || alumno.situacion_final === 'Trasladado';
                const saveDisabled = !alumno.dirty || (needsMotivo && !alumno.motivo_retiro.trim());
                return (
                  <tr key={alumno.id} className={`hover:bg-slate-50 transition-colors ${alumno.saved ? 'bg-emerald-50/30' : ''}`}>
                    {/* Alumno */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-8 items-center justify-center rounded-full bg-teal-100 text-teal-700 text-xs font-semibold shrink-0">
                          {alumno.initials}
                        </div>
                        <span className="text-sm font-medium text-slate-800 whitespace-nowrap">{alumno.name}</span>
                      </div>
                    </td>
                    {/* Grado/Sección */}
                    <td className="px-3 py-3.5 text-center">
                      <span className="text-xs font-medium text-slate-600">{alumno.grado} {alumno.seccion}</span>
                    </td>
                    {/* Situación Final */}
                    <td className="px-3 py-3.5 text-center">
                      <div className="relative inline-block">
                        <select
                          value={alumno.situacion_final ?? ''}
                          onChange={e => {
                            const val = e.target.value as SituacionFinal;
                            updateField(alumno.id, 'situacion_final', val || null);
                            if (val !== 'Retirado' && val !== 'Trasladado') {
                              updateField(alumno.id, 'motivo_retiro', '');
                            }
                          }}
                          className={`appearance-none pr-6 pl-2.5 py-1 rounded-full text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-teal-400 cursor-pointer ${
                            alumno.situacion_final ? SITUACION_COLORS[alumno.situacion_final] + ' border-transparent' : 'bg-slate-100 text-slate-500 border-slate-200'
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
                    {/* Motivo retiro */}
                    <td className="px-3 py-3.5 text-center">
                      {needsMotivo ? (
                        <input
                          type="text"
                          value={alumno.motivo_retiro}
                          onChange={e => updateField(alumno.id, 'motivo_retiro', e.target.value)}
                          placeholder="Motivo requerido…"
                          className={`w-full text-xs px-2.5 py-1.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-teal-400 ${
                            !alumno.motivo_retiro.trim() ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50'
                          }`}
                        />
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    {/* Comportamiento */}
                    <td className="px-3 py-3.5 text-center">
                      <select
                        value={alumno.comportamiento}
                        onChange={e => updateField(alumno.id, 'comportamiento', e.target.value as Comportamiento)}
                        className="appearance-none bg-slate-50 border border-slate-200 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-400"
                      >
                        {(['AD','A','B','C'] as const).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    {/* Áreas desaprobadas */}
                    <td className="px-3 py-3.5 text-center">
                      <input
                        type="number"
                        min={0}
                        max={13}
                        value={alumno.numero_areas_desaprobadas}
                        onChange={e => updateField(alumno.id, 'numero_areas_desaprobadas', Math.min(13, Math.max(0, Number(e.target.value))))}
                        className="w-16 text-center text-xs border border-slate-200 bg-slate-50 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-400"
                      />
                    </td>
                    {/* Guardar */}
                    <td className="px-4 py-3.5 text-right">
                      {alumno.saved && !alumno.dirty ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                          <CheckCircle2 className="size-3.5" /> Guardado
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSave(alumno.id)}
                          disabled={saveDisabled}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-teal-600 hover:bg-teal-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed ml-auto"
                        >
                          <Save className="size-3" /> Guardar
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
