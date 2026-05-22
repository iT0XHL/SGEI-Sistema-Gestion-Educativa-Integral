import { useState, useEffect } from 'react';
import { PlusCircle, X, AlertTriangle, ChevronDown, Loader2, Edit2 } from 'lucide-react';
import { COLOR_MAP } from '../../data/mockData';
import {
  horariosApi, asignacionesApi,
  cargarDocentes, cargarCursos, cargarSecciones, cargarGrados, cargarPeriodos,
  obtenerPeriodoActivo,
  type HorarioRow, type DocenteRow, type CursoRow, type SeccionRow, type GradoRow,
  type PeriodoRow
} from '@/lib/api/horarios.api';

const HOURS = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];
const COLOR_LIST = ['blue', 'emerald', 'amber', 'purple', 'indigo', 'red', 'pink', 'teal'] as const;

const DAY_TO_NUMBER: Record<string, number> = {
  'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5
};

const NUMBER_TO_DAY: Record<number, string> = {
  1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes'
};

type ScheduleItem = HorarioRow & { color: typeof COLOR_LIST[number]; room?: string };

interface ModalState {
  open: boolean;
  mode: 'create' | 'edit';
  editingId?: string;
}

export default function AdminHorarios() {
  // Datos cargados desde BD
  const [docentes, setDocentes] = useState<DocenteRow[]>([]);
  const [cursos, setCursos] = useState<CursoRow[]>([]);
  const [secciones, setSecciones] = useState<SeccionRow[]>([]);
  const [grados, setGrados] = useState<GradoRow[]>([]);
  const [periodos, setPeriodos] = useState<PeriodoRow[]>([]);
  const [periodoActivo, setPeriodoActivo] = useState<PeriodoRow | null>(null);
  const [asignacionesData, setAsignacionesData] = useState<any[]>([]);

  // UI state
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>({ open: false, mode: 'create' });
  const [conflictWarn, setConflictWarn] = useState('');
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState('');

  const [filterGradeNum, setFilterGradeNum] = useState<string>('Todos');
  const [filterSection, setFilterSection] = useState<string>('Todos');

  const [form, setForm] = useState({
    day: 'Lunes',
    start: '08:00',
    end: '09:00',
    course_id: '',
    docente_id: '',
    grado_id: '',
    seccion_id: '',
    room: 'Aula 301',
  });

  // Cargar todos los datos maestros
  useEffect(() => {
    async function loadMasterData() {
      try {
        setLoading(true);
        const [docsData, cursosData, seccionesData, gradosData, periodosData, periodoAct] = await Promise.all([
          cargarDocentes(),
          cargarCursos(),
          cargarSecciones(),
          cargarGrados(),
          cargarPeriodos(),
          obtenerPeriodoActivo(),
        ]);

        setDocentes(docsData);
        setCursos(cursosData);
        setSecciones(seccionesData);
        setGrados(gradosData);
        setPeriodos(periodosData);
        setPeriodoActivo(periodoAct);

        // Cargar horarios y asignaciones
        if (periodoAct) {
          const [horarios, asignaciones] = await Promise.all([
            horariosApi.listar({ periodoId: periodoAct.id }),
            asignacionesApi.listar({ periodoId: periodoAct.id }),
          ]);

          setAsignacionesData(asignaciones);

          const enriched: ScheduleItem[] = horarios.map((h, idx) => ({
            ...h,
            color: COLOR_LIST[idx % COLOR_LIST.length],
            room: h.aula || 'Aula',
          }));
          setSchedule(enriched);
        }

        // Establecer valores por defecto del formulario
        if (cursosData.length > 0) setForm(p => ({ ...p, course_id: cursosData[0].id }));
        if (docsData.length > 0) setForm(p => ({ ...p, docente_id: docsData[0].id }));
        if (gradosData.length > 0) setForm(p => ({ ...p, grado_id: gradosData[0].id }));
      } catch (err) {
        console.error('Error loading master data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadMasterData();
  }, []);

  // Actualizar secciones cuando cambia el grado
  useEffect(() => {
    if (form.grado_id && secciones.length > 0) {
      const seccionesDelGrado = secciones.filter(s => s.grado_id === form.grado_id && s.periodo_id === periodoActivo?.id);
      if (seccionesDelGrado.length > 0 && !seccionesDelGrado.find(s => s.id === form.seccion_id)) {
        setForm(p => ({ ...p, seccion_id: seccionesDelGrado[0].id }));
      }
    }
  }, [form.grado_id, secciones, periodoActivo]);

  const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

  const gradesForSelect = grados.map(g => ({
    id: g.id,
    label: g.nombre,
  }));

  const sectionsForSelect = form.grado_id
    ? secciones.filter(s => s.grado_id === form.grado_id && s.periodo_id === periodoActivo?.id)
    : [];

  const sectionsForFilterGrade = filterGradeNum === 'Todos'
    ? []
    : Array.from(new Set(
        schedule
          .filter(s => {
            const grado = secciones.find(sec => sec.id === s.seccion)?.grado.nombre || '';
            return grado.includes(filterGradeNum);
          })
          .map(s => s.seccion.split(' ')[1])
      )).sort();

  const filtered = schedule.filter(s => {
    const [gradeStr, secStr] = s.seccion.split(' ');
    const gradeMatch = filterGradeNum === 'Todos' || gradeStr.includes(filterGradeNum);
    const secMatch = filterSection === 'Todos' || secStr === filterSection;
    return gradeMatch && secMatch;
  });

  function checkConflict(newItem: {
    day: string;
    start: string;
    end: string;
    docente_id: string;
    seccion_id: string;
  }, excludeId?: string): string {
    const diaSemana = DAY_TO_NUMBER[newItem.day] || 1;

    // Verificar conflicto de docente por ID, no por string
    const docenteConflict = schedule.find(s => {
      if (excludeId && s.id === excludeId) return false;

      // Buscar la asignación que corresponde a este horario
      const asignacionActual = asignacionesData.find(a =>
        a.docente_id === newItem.docente_id &&
        a.id === s.asignacion_id
      );

      if (!asignacionActual) return false;

      return s.dia_semana === diaSemana &&
        ((newItem.start >= s.hora_inicio && newItem.start < s.hora_fin) ||
         (newItem.end > s.hora_inicio && newItem.end <= s.hora_fin));
    });

    if (docenteConflict) {
      const docente = docentes.find(d => d.id === newItem.docente_id);
      return `⚠ ${docente?.nombres} ya tiene clase el ${newItem.day} ${docenteConflict.hora_inicio}–${docenteConflict.hora_fin}`;
    }

    // Verificar conflicto de sección por ID, no por string
    const seccionConflict = schedule.find(s => {
      if (excludeId && s.id === excludeId) return false;

      // Buscar la asignación que corresponde a este horario
      const asignacionEnConflicto = asignacionesData.find(a =>
        a.seccion_id === newItem.seccion_id &&
        a.id === s.asignacion_id
      );

      if (!asignacionEnConflicto) return false;

      return s.dia_semana === diaSemana &&
        ((newItem.start >= s.hora_inicio && newItem.start < s.hora_fin) ||
         (newItem.end > s.hora_inicio && newItem.end <= s.hora_fin));
    });

    if (seccionConflict) {
      const seccion = secciones.find(s => s.id === newItem.seccion_id);
      return `⚠ La sección ${seccion?.grado.nombre} ${seccion?.nombre} ya tiene clase el ${newItem.day} ${seccionConflict.hora_inicio}–${seccionConflict.hora_fin}`;
    }

    return '';
  }

  async function handleAddOrEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!periodoActivo) {
      setResolveError('No hay período académico activo');
      return;
    }

    const excludeId = modal.mode === 'edit' ? modal.editingId : undefined;
    const conflict = checkConflict({
      day: form.day,
      start: form.start,
      end: form.end,
      docente_id: form.docente_id,
      seccion_id: form.seccion_id,
    }, excludeId);

    if (conflict) {
      setConflictWarn(conflict);
      return;
    }

    setResolving(true);
    setResolveError('');

    try {
      if (modal.mode === 'edit' && modal.editingId) {
        // ACTUALIZAR
        await horariosApi.actualizar(modal.editingId, {
          dia_semana: DAY_TO_NUMBER[form.day] || 1,
          hora_inicio: form.start,
          hora_fin: form.end,
          aula: form.room || null,
        });

        // Refetch
        const horarios = await horariosApi.listar({ periodoId: periodoActivo.id });
        const enriched: ScheduleItem[] = horarios.map((h, idx) => ({
          ...h,
          color: COLOR_LIST[idx % COLOR_LIST.length],
          room: h.aula || 'Aula',
        }));
        setSchedule(enriched);
        setModal({ open: false, mode: 'create' });
        setConflictWarn('');
      } else {
        // CREAR
        let asignacion_id: string;

        // Buscar o crear asignación
        const existingAsignaciones = await asignacionesApi.listar({ periodoId: periodoActivo.id });
        const existing = existingAsignaciones.find(
          a => a.docente_id === form.docente_id &&
            a.curso_id === form.course_id &&
            a.seccion_id === form.seccion_id
        );

        if (existing) {
          asignacion_id = existing.id;
        } else {
          const newAsignacion = await asignacionesApi.crear({
            docente_id: form.docente_id,
            curso_id: form.course_id,
            seccion_id: form.seccion_id,
            periodo_id: periodoActivo.id,
          });
          asignacion_id = newAsignacion.id;
        }

        // Crear horario
        await horariosApi.crear({
          asignacion_id,
          dia_semana: DAY_TO_NUMBER[form.day] || 1,
          hora_inicio: form.start,
          hora_fin: form.end,
          aula: form.room || null,
        });

        // Refetch
        const horarios = await horariosApi.listar({ periodoId: periodoActivo.id });
        const enriched: ScheduleItem[] = horarios.map((h, idx) => ({
          ...h,
          color: COLOR_LIST[idx % COLOR_LIST.length],
          room: h.aula || 'Aula',
        }));
        setSchedule(enriched);
        setModal({ open: false, mode: 'create' });
        setConflictWarn('');
      }
    } catch (err) {
      let errorMsg = `Error al ${modal.mode === 'edit' ? 'actualizar' : 'crear'} el bloque`;

      if (err instanceof Error) {
        // Extraer mensaje de error de la BD si está disponible
        if (err.message.includes('cruce')) {
          errorMsg = err.message;
        } else if (err.message.includes('not found')) {
          errorMsg = 'Asignación no encontrada. Verifica que exista la combinación docente-curso-sección.';
        } else {
          errorMsg = err.message;
        }
      }

      setResolveError(errorMsg);
    } finally {
      setResolving(false);
    }
  }

  function openCreateModal() {
    setModal({ open: true, mode: 'create' });
    setForm({
      day: 'Lunes',
      start: '08:00',
      end: '09:00',
      course_id: cursos[0]?.id || '',
      docente_id: docentes[0]?.id || '',
      grado_id: grados[0]?.id || '',
      seccion_id: '',
      room: 'Aula 301',
    });
    setConflictWarn('');
    setResolveError('');
  }

  function openEditModal(item: ScheduleItem) {
    setModal({ open: true, mode: 'edit', editingId: item.id });

    // Buscar la asignación asociada a este horario
    const asignacion = asignacionesData.find(a => a.id === item.asignacion_id);

    let courseId = '';
    let docenteId = '';
    let gradoId = '';
    let seccionId = '';

    if (asignacion) {
      courseId = asignacion.curso_id;
      docenteId = asignacion.docente_id;
      seccionId = asignacion.seccion_id;

      // Buscar el grado a partir de la sección
      const seccionData = secciones.find(s => s.id === seccionId);
      if (seccionData) {
        gradoId = seccionData.grado_id;
      }
    }

    setForm({
      day: NUMBER_TO_DAY[item.dia_semana] || 'Lunes',
      start: item.hora_inicio,
      end: item.hora_fin,
      course_id: courseId,
      docente_id: docenteId,
      grado_id: gradoId,
      seccion_id: seccionId,
      room: item.aula || '',
    });
    setConflictWarn('');
    setResolveError('');
  }

  function closeModal() {
    setModal({ open: false, mode: 'create' });
    setConflictWarn('');
    setResolveError('');
  }

  async function removeItem(id: string) {
    try {
      await horariosApi.eliminar(id);
      setSchedule(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Error deleting horario:', err);
    }
  }

  const byDay = DAYS.map(day => ({
    day,
    items: filtered.filter(s => {
      const dayNum = DAY_TO_NUMBER[day] || 0;
      return s.dia_semana === dayNum;
    }).sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
  }));

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl mx-auto flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!periodoActivo) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
          ⚠ No hay período académico activo. Crea uno primero.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Horarios Escolares</h1>
          <p className="text-sm text-slate-500 mt-0.5">{schedule.length} bloques · {periodoActivo.nombre} {periodoActivo.anio}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <select
              value={filterGradeNum}
              onChange={e => { setFilterGradeNum(e.target.value); setFilterSection('Todos'); }}
              className="appearance-none bg-white border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="Todos">Todos los grados</option>
              {grados.map(g => <option key={g.id} value={g.nombre}>{g.nombre}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
          </div>

          {filterGradeNum !== 'Todos' && sectionsForFilterGrade.length > 0 && (
            <div className="relative">
              <select
                value={filterSection}
                onChange={e => setFilterSection(e.target.value)}
                className="appearance-none bg-white border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value="Todos">Todas las secciones</option>
                {sectionsForFilterGrade.map(s => <option key={s} value={s}>Sección {s}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
            </div>
          )}

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
          >
            <PlusCircle className="size-4" /> Agregar bloque
          </button>
        </div>
      </div>

      {filterGradeNum !== 'Todos' && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Filtrando:</span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 text-white rounded-full text-xs font-medium">
            {filterGradeNum} {filterSection !== 'Todos' ? `— Sección ${filterSection}` : ''}
            <button onClick={() => { setFilterGradeNum('Todos'); setFilterSection('Todos'); }}>
              <X className="size-3" />
            </button>
          </span>
          <span className="text-xs text-slate-400">{filtered.length} bloque{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-5 divide-x divide-slate-100">
          {byDay.map(({ day, items }) => (
            <div key={day} className="min-h-[400px]">
              <div className="bg-slate-50 border-b border-slate-100 px-3 py-2.5 text-center">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">{day}</p>
                <p className="text-xs text-slate-400">{items.length} clases</p>
              </div>
              <div className="p-2 space-y-2">
                {items.length === 0 ? (
                  <div className="flex items-center justify-center h-24">
                    <p className="text-xs text-slate-300">Sin clases</p>
                  </div>
                ) : items.map(item => {
                  const c = COLOR_MAP[item.color as keyof typeof COLOR_MAP] || COLOR_MAP.blue;
                  return (
                    <div key={item.id} className={`relative group rounded-xl p-2.5 border ${c.light} ${c.border} overflow-hidden`}>
                      <p className={`text-xs font-semibold ${c.text} leading-tight truncate`}>{item.curso}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{item.seccion}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{item.hora_inicio}–{item.hora_fin}</p>
                      <p className="text-[10px] text-slate-400 truncate">{item.room}</p>
                      <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 flex gap-1 transition-all">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-0.5 rounded-md bg-white/80 text-blue-500 hover:text-blue-700"
                        >
                          <Edit2 className="size-3" />
                        </button>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-0.5 rounded-md bg-white/80 text-red-500 hover:text-red-700"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="text-sm font-semibold text-slate-700">Listado completo de bloques</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">Día</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Horario</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Curso</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Grado/Sec.</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 hidden md:table-cell">Docente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 hidden lg:table-cell">Aula</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(item => {
                const c = COLOR_MAP[item.color as keyof typeof COLOR_MAP] || COLOR_MAP.blue;
                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-700">{DAYS[item.dia_semana - 1] || `Día ${item.dia_semana}`}</td>
                    <td className="px-4 py-3 text-slate-600">{item.hora_inicio}–{item.hora_fin}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`size-2 rounded-full ${c.dot}`} />
                        <span className="font-medium text-slate-800">{item.curso}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${c.light} ${c.text} ${c.border}`}>{item.seccion}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden md:table-cell text-sm">{item.docente}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs hidden lg:table-cell">{item.aula || '—'}</td>
                    <td className="px-4 py-3 text-right flex gap-1 justify-end">
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-1.5 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="size-3.5" />
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                        title="Eliminar"
                      >
                        <X className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-800">
                {modal.mode === 'edit' ? 'Editar bloque' : 'Agregar bloque'}
              </h3>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="size-4 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleAddOrEdit} className="p-6 space-y-4">
              {conflictWarn && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                  <AlertTriangle className="size-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{conflictWarn}</p>
                </div>
              )}
              {resolveError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                  <AlertTriangle className="size-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{resolveError}</p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Día</label>
                  <select
                    value={form.day}
                    onChange={e => { setForm(p => ({ ...p, day: e.target.value })); setConflictWarn(''); setResolveError(''); }}
                    className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  >
                    {DAYS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Inicio</label>
                  <select
                    value={form.start}
                    onChange={e => { setForm(p => ({ ...p, start: e.target.value })); setConflictWarn(''); }}
                    className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  >
                    {HOURS.map(h => <option key={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Fin</label>
                  <select
                    value={form.end}
                    onChange={e => { setForm(p => ({ ...p, end: e.target.value })); setConflictWarn(''); }}
                    className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  >
                    {HOURS.map(h => <option key={h}>{h}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Docente</label>
                  <select
                    value={form.docente_id}
                    onChange={e => { setForm(p => ({ ...p, docente_id: e.target.value })); setConflictWarn(''); setResolveError(''); }}
                    className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    disabled={modal.mode === 'edit'}
                  >
                    <option value="">Seleccionar docente</option>
                    {docentes.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.nombres} {d.apellido_paterno}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Curso</label>
                  <select
                    value={form.course_id}
                    onChange={e => { setForm(p => ({ ...p, course_id: e.target.value })); setConflictWarn(''); setResolveError(''); }}
                    className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    disabled={modal.mode === 'edit'}
                  >
                    <option value="">Seleccionar curso</option>
                    {cursos.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Grado</label>
                  <select
                    value={form.grado_id}
                    onChange={e => { setForm(p => ({ ...p, grado_id: e.target.value, seccion_id: '' })); setConflictWarn(''); setResolveError(''); }}
                    className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    disabled={modal.mode === 'edit'}
                  >
                    <option value="">Seleccionar grado</option>
                    {grados.map(g => (
                      <option key={g.id} value={g.id}>{g.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Sección</label>
                  <select
                    value={form.seccion_id}
                    onChange={e => { setForm(p => ({ ...p, seccion_id: e.target.value })); setConflictWarn(''); setResolveError(''); }}
                    className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    disabled={modal.mode === 'edit' || !form.grado_id}
                  >
                    <option value="">Seleccionar sección</option>
                    {sectionsForSelect.map(s => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Aula</label>
                  <input
                    value={form.room}
                    onChange={e => setForm(p => ({ ...p, room: e.target.value }))}
                    maxLength={20}
                    placeholder="Ej. Aula 301"
                    className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={resolving || !form.docente_id || !form.course_id || !form.seccion_id}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                >
                  {resolving
                    ? <><Loader2 className="size-4 animate-spin" /> Procesando…</>
                    : modal.mode === 'edit' ? 'Actualizar' : 'Agregar'
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
