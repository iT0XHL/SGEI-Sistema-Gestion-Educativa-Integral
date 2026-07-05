import { useState, useMemo, useEffect } from 'react';
import { PlusCircle, X, Trash2, PenLine, Save, ChevronDown, ArrowUp, ArrowDown, ListChecks, Loader2, AlertTriangle, Wand2, RotateCcw, Info } from 'lucide-react';
import { estructuraApi, competenciasApi, areasApi, type CompetenciaDTO, type CursoDTO, type GradoDTO, type AreaAcademicaDTO, type NivelDTO } from '../../../lib/api/admin.api';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '../../components/ui/alert-dialog';

type TipoCompetencia = 'regular' | 'transversal';

interface Competencia extends CompetenciaDTO {}

const TIPO_COLORS: Record<TipoCompetencia, string> = {
  regular:      'bg-blue-100 text-blue-700',
  transversal:  'bg-purple-100 text-purple-700',
};

const EMPTY_FORM = { nombre: '', descripcion: '', tipo: 'regular' as TipoCompetencia, peso: '100' };

export default function AdminCompetencias() {
  const [niveles, setNiveles] = useState<NivelDTO[]>([]);
  const [cursos, setCursos] = useState<CursoDTO[]>([]);
  const [grados, setGrados] = useState<GradoDTO[]>([]);
  const [areas, setAreas] = useState<AreaAcademicaDTO[]>([]);
  const [competencias, setCompetencias] = useState<Competencia[]>([]);
  const [filterNivel,  setFilterNivel]  = useState('');
  const [filterCurso,  setFilterCurso]  = useState('');
  const [filterGrado,  setFilterGrado]  = useState(''); // '' = defaults del nivel (comportamiento clásico)
  const [modal, setModal]     = useState(false);
  const [form, setForm]       = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [personalizando, setPersonalizando] = useState(false);
  const [error, setError] = useState('');

  // Edición inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm]   = useState(EMPTY_FORM);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError('');
      const nivelesData = await estructuraApi.niveles();
      setNiveles(nivelesData);
      if (nivelesData.length > 0) setFilterNivel(nivelesData[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando niveles');
    } finally {
      setLoading(false);
    }
  }

  // Cursos del nivel seleccionado — antes se traían TODOS los cursos de
  // TODOS los niveles sin filtrar (bug: mezclaba Primaria/Secundaria y
  // catálogo viejo/nuevo en un solo select sin agrupar).
  useEffect(() => {
    if (!filterNivel) { setCursos([]); setFilterCurso(''); return; }
    estructuraApi.cursos(filterNivel)
      .then(cursosData => {
        setCursos(cursosData);
        setFilterCurso(cursosData[0]?.id ?? '');
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Error cargando cursos'));
  }, [filterNivel]);

  const cursoActual = cursos.find(c => c.id === filterCurso);

  // Grados del mismo nivel del curso seleccionado — el override es por
  // grado, y un grado solo tiene sentido dentro del nivel de su curso.
  useEffect(() => {
    setFilterGrado('');
    if (!cursoActual) { setGrados([]); setAreas([]); return; }
    estructuraApi.grados(cursoActual.nivel_id)
      .then(setGrados)
      .catch(err => setError(err instanceof Error ? err.message : 'Error cargando grados'));
    areasApi.listar(cursoActual.nivel_id)
      .then(setAreas)
      .catch(err => setError(err instanceof Error ? err.message : 'Error cargando áreas académicas'));
  }, [cursoActual?.nivel_id, filterCurso]);

  const areaDelCurso = useMemo(
    () => areas.find(a => a.id === cursoActual?.area_academica_id) ?? null,
    [areas, cursoActual],
  );

  useEffect(() => {
    if (!filterCurso) return;
    loadCompetencias();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCurso]);

  async function loadCompetencias() {
    try {
      // Trae TODAS las filas del curso (defaults + overrides de cualquier
      // grado) para poder distinguir en el cliente cuál set mostrar.
      const data = await competenciasApi.listar(filterCurso);
      setCompetencias(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando competencias');
    }
  }

  const defaults = useMemo(() => competencias.filter(c => c.grado_id === null), [competencias]);
  const overridesDelGrado = useMemo(
    () => (filterGrado ? competencias.filter(c => c.grado_id === filterGrado) : []),
    [competencias, filterGrado],
  );
  const tienePersonalizacion = filterGrado !== '' && overridesDelGrado.length > 0;
  const mostrando = filterGrado ? (tienePersonalizacion ? overridesDelGrado : defaults) : defaults;
  const puedeEditar = filterGrado === '' || tienePersonalizacion;

  const filtered = useMemo(() =>
    [...mostrando].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)),
  [mostrando]);

  const sumaPesos = useMemo(
    () => filtered.reduce((acc, c) => acc + Number(c.peso), 0),
    [filtered],
  );

  async function handlePersonalizar() {
    if (!filterCurso || !filterGrado) return;
    try {
      setPersonalizando(true);
      setError('');
      await competenciasApi.copiarAGrado(filterCurso, filterGrado);
      await loadCompetencias();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error personalizando competencias para el grado');
    } finally {
      setPersonalizando(false);
    }
  }

  async function handleRestaurar() {
    if (!filterCurso || !filterGrado) return;
    try {
      setPersonalizando(true);
      setError('');
      await competenciasApi.restaurarPredeterminado(filterCurso, filterGrado);
      await loadCompetencias();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error restaurando los valores del nivel');
    } finally {
      setPersonalizando(false);
    }
  }

  async function moveUp(id: string) {
    const arr = [...filtered];
    const idx = arr.findIndex(c => c.id === id);
    if (idx <= 0) return;
    const newOrden = arr[idx].orden ?? 0;
    const prevOrden = arr[idx - 1].orden ?? 0;
    try {
      await competenciasApi.reordenar([
        { id: arr[idx].id, orden: prevOrden },
        { id: arr[idx - 1].id, orden: newOrden },
      ]);
      await loadCompetencias();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error reordenando competencias');
    }
  }

  async function moveDown(id: string) {
    const arr = [...filtered];
    const idx = arr.findIndex(c => c.id === id);
    if (idx >= arr.length - 1) return;
    const newOrden = arr[idx].orden ?? 0;
    const nextOrden = arr[idx + 1].orden ?? 0;
    try {
      await competenciasApi.reordenar([
        { id: arr[idx].id, orden: nextOrden },
        { id: arr[idx + 1].id, orden: newOrden },
      ]);
      await loadCompetencias();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error reordenando competencias');
    }
  }

  async function handleDelete(id: string) {
    try {
      await competenciasApi.eliminar(id);
      await loadCompetencias();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error eliminando competencia');
    }
  }

  function startEdit(comp: Competencia) {
    setEditingId(comp.id);
    setEditForm({ nombre: comp.nombre, descripcion: comp.descripcion || '', tipo: comp.tipo, peso: String(comp.peso) });
  }

  async function saveEdit(id: string) {
    if (!editForm.nombre.trim()) return;
    try {
      setSaving(true);
      const peso = parseFloat(editForm.peso);
      await competenciasApi.actualizar(id, { ...editForm, peso: isNaN(peso) ? undefined : peso });
      await loadCompetencias();
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error guardando competencia');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!form.nombre.trim()) { setFormError('El nombre es obligatorio.'); return; }
    if (!filterCurso) { setFormError('Selecciona un curso primero.'); return; }
    try {
      setSaving(true);
      const peso = parseFloat(form.peso);
      await competenciasApi.crear({
        curso_id: filterCurso,
        grado_id: filterGrado || null,
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || undefined,
        tipo: form.tipo,
        peso: isNaN(peso) ? undefined : peso,
      });
      await loadCompetencias();
      setForm(EMPTY_FORM);
      setModal(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error creando competencia');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400';

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
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500 mb-1">Panel de administración</p>
          <h1 className="text-2xl font-bold text-slate-900">Criterios de Evaluación</h1>
          <p className="text-sm text-slate-500 mt-0.5">Administra los criterios de evaluación (antes «competencias») por curso, cada uno con su peso — y personalízalos por grado cuando varíen</p>
        </div>
        <button
          onClick={() => { setModal(true); setFormError(''); }}
          disabled={!puedeEditar}
          title={!puedeEditar ? 'Personaliza este grado antes de agregar criterios propios' : undefined}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm shrink-0"
        >
          <PlusCircle className="size-4" /> Nuevo criterio
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
          <AlertTriangle className="size-5 text-red-600 shrink-0" />
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {/* Filtros de nivel + curso + grado */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nivel</label>
          <div className="relative">
            <select value={filterNivel} onChange={e => setFilterNivel(e.target.value)}
              className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-slate-400">
              {niveles.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Curso</label>
          <div className="relative">
            <select value={filterCurso} onChange={e => setFilterCurso(e.target.value)}
              className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-slate-400">
              {cursos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
          </div>
          <p className="text-xs mt-1.5">
            {areaDelCurso ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">Área: {areaDelCurso.nombre}</span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">
                Sin área asignada — cámbialo en Estructura Académica
              </span>
            )}
          </p>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Grado (opcional)</label>
          <div className="relative">
            <select value={filterGrado} onChange={e => setFilterGrado(e.target.value)}
              className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-slate-400">
              <option value="">Todos los grados (valores por defecto del nivel)</option>
              {grados.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
        <p className="text-xs text-slate-400 self-end pb-2.5">{filtered.length} competencia{filtered.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Banner de personalización por grado */}
      {filterGrado && (
        tienePersonalizacion ? (
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 flex-wrap">
            <Wand2 className="size-5 text-blue-600 shrink-0" />
            <p className="text-sm font-medium text-blue-800 flex-1 min-w-[200px]">
              Este grado tiene competencias personalizadas para {cursoActual?.nombre} — no afecta a los demás grados del nivel.
            </p>
            <button
              onClick={handleRestaurar}
              disabled={personalizando}
              className="flex items-center gap-1.5 border border-blue-300 text-blue-700 hover:bg-blue-100 disabled:opacity-40 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            >
              {personalizando ? <Loader2 className="size-3 animate-spin" /> : <RotateCcw className="size-3" />} Restaurar valores del nivel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 flex-wrap">
            <Info className="size-5 text-slate-500 shrink-0" />
            <p className="text-sm font-medium text-slate-600 flex-1 min-w-[200px]">
              Usando los valores predeterminados del nivel para este grado.
            </p>
            <button
              onClick={handlePersonalizar}
              disabled={personalizando || defaults.length === 0}
              title={defaults.length === 0 ? 'El nivel no tiene competencias definidas para este curso' : undefined}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            >
              {personalizando ? <Loader2 className="size-3 animate-spin" /> : <Wand2 className="size-3" />} Personalizar para este grado
            </button>
          </div>
        )
      )}

      {/* Suma de pesos del curso actual */}
      {filtered.length > 0 && (
        <div className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 border ${
          Math.abs(sumaPesos - 100) < 0.01 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
        }`}>
          {Math.abs(sumaPesos - 100) < 0.01 ? (
            <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
          ) : (
            <AlertTriangle className="size-4 text-amber-600 shrink-0" />
          )}
          <p className={`text-sm font-medium ${Math.abs(sumaPesos - 100) < 0.01 ? 'text-emerald-800' : 'text-amber-800'}`}>
            Suma de pesos: {sumaPesos}%
            {Math.abs(sumaPesos - 100) >= 0.01 && ' — no suma 100%, los cálculos se normalizan automáticamente'}
          </p>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
          <ListChecks className="size-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-700">
            {cursoActual?.nombre ?? 'Curso'}{filterGrado ? ` — ${grados.find(g => g.id === filterGrado)?.nombre ?? ''}` : ' — Todos los grados'}
          </h2>
        </div>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <ListChecks className="size-10 text-slate-200 mb-3" />
            <p className="text-slate-500">No hay criterios de evaluación para este curso</p>
            <p className="text-xs text-slate-400 mt-1">Haz clic en «Nuevo criterio» para agregar uno</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-center px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider w-16">Orden</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nombre</th>
                  <th className="text-center px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo</th>
                  <th className="text-center px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">Peso</th>
                  <th className="text-right px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((comp, idx) => {
                  const isEditing = editingId === comp.id;
                  return (
                    <tr key={comp.id} className="hover:bg-slate-50 transition-colors">
                      {/* Orden + reorder buttons */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => moveUp(comp.id)} disabled={idx === 0 || !puedeEditar}
                            className="p-1 rounded-md hover:bg-slate-200 disabled:opacity-30 text-slate-500 transition-colors">
                            <ArrowUp className="size-3.5" />
                          </button>
                          <span className="text-xs font-semibold text-slate-600 w-5 text-center">{idx + 1}</span>
                          <button onClick={() => moveDown(comp.id)} disabled={idx === filtered.length - 1 || !puedeEditar}
                            className="p-1 rounded-md hover:bg-slate-200 disabled:opacity-30 text-slate-500 transition-colors">
                            <ArrowDown className="size-3.5" />
                          </button>
                        </div>
                      </td>
                      {/* Nombre */}
                      <td className="px-4 py-3.5">
                        {isEditing ? (
                          <div className="space-y-2">
                            <input value={editForm.nombre} onChange={e => setEditForm(f => ({ ...f, nombre: e.target.value }))}
                              maxLength={300}
                              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400" />
                            <textarea value={editForm.descripcion} onChange={e => setEditForm(f => ({ ...f, descripcion: e.target.value }))}
                              maxLength={1000} rows={2} placeholder="Descripción (opcional)"
                              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none" />
                          </div>
                        ) : (
                          <div>
                            <p className="font-medium text-slate-800">{comp.nombre}</p>
                            {comp.descripcion && <p className="text-xs text-slate-400 mt-0.5">{comp.descripcion}</p>}
                          </div>
                        )}
                      </td>
                      {/* Tipo */}
                      <td className="px-4 py-3.5 text-center">
                        {isEditing ? (
                          <select value={editForm.tipo} onChange={e => setEditForm(f => ({ ...f, tipo: e.target.value as TipoCompetencia }))}
                            className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400">
                            <option value="regular">regular</option>
                            <option value="transversal">transversal</option>
                          </select>
                        ) : (
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${TIPO_COLORS[comp.tipo]}`}>
                            {comp.tipo}
                          </span>
                        )}
                      </td>
                      {/* Peso */}
                      <td className="px-4 py-3.5 text-center">
                        {isEditing ? (
                          <input type="number" min={0.01} max={100} step="0.01" value={editForm.peso}
                            onChange={e => setEditForm(f => ({ ...f, peso: e.target.value }))}
                            className="w-16 text-xs text-center border border-slate-200 rounded-lg px-1.5 py-1 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400" />
                        ) : (
                          <span className="text-xs font-semibold text-slate-600">{Number(comp.peso)}%</span>
                        )}
                      </td>
                      {/* Acciones */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!puedeEditar ? (
                            <span className="text-xs text-slate-400 italic">Personaliza el grado para editar</span>
                          ) : isEditing ? (
                            <>
                              <button onClick={() => saveEdit(comp.id)} disabled={saving} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                                {saving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
                                Guardar
                              </button>
                              <button onClick={() => setEditingId(null)} disabled={saving} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-50">
                                <X className="size-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => startEdit(comp)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium">
                                <PenLine className="size-3" /> Editar
                              </button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <button className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors">
                                    <Trash2 className="size-3.5" />
                                  </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Eliminar competencia?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Se eliminará permanentemente <strong>«{comp.nombre}»</strong>. Esta acción no se puede deshacer.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={() => handleDelete(comp.id)}>
                                      Sí, eliminar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal nueva competencia */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-800">Nuevo criterio de evaluación</h3>
              <button onClick={() => setModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="size-4 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {formError && <p className="text-xs text-red-500">{formError}</p>}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Nombre <span className="text-red-500">*</span></label>
                <input type="text" maxLength={300} value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej. Resuelve problemas de cantidad"
                  className={inputCls} />
                <p className={`text-xs text-right mt-1 ${form.nombre.length >= 300 ? 'text-red-500' : 'text-slate-400'}`}>{form.nombre.length}/300</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Descripción <span className="text-slate-400">(opcional)</span></label>
                <textarea maxLength={1000} rows={3} value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Describe brevemente la competencia…"
                  className={`${inputCls} resize-none`} />
                <p className={`text-xs text-right mt-1 ${form.descripcion.length >= 1000 ? 'text-red-500' : 'text-slate-400'}`}>{form.descripcion.length}/1000</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Tipo</label>
                  <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as TipoCompetencia }))} className={inputCls}>
                    <option value="regular">regular</option>
                    <option value="transversal">transversal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Peso (%)</label>
                  <input type="number" min={0.01} max={100} step="0.01" value={form.peso}
                    onChange={e => setForm(f => ({ ...f, peso: e.target.value }))} className={inputCls} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)} disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="flex-1 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                  {saving ? 'Agregando...' : 'Agregar criterio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
