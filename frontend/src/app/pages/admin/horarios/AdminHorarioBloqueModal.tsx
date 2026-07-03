import { useEffect, useMemo, useState } from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import { asignacionesApi } from '@/lib/api/horarios.api';
import type {
  DocenteRow, CursoRow, SeccionRow, GradoRow, PeriodoRow, AsignacionRow, HorarioRow,
} from '@/lib/api/horarios.api';
import { useCrearBloque, useActualizarBloque } from '@/hooks/admin/useHorariosAdmin';
import { HOURS, DAYS, DAY_TO_NUMBER, NUMBER_TO_DAY } from '@/app/components/horarios/horarioConstants';

interface AdminHorarioBloqueModalProps {
  mode: 'create' | 'edit';
  editing?: HorarioRow;
  periodoActivo: PeriodoRow;
  docentes: DocenteRow[];
  cursos: CursoRow[];
  secciones: SeccionRow[];
  grados: GradoRow[];
  asignaciones: AsignacionRow[];
  initialDocenteId?: string;
  initialSeccionId?: string;
  onClose: () => void;
  onSaved: () => void;
}

export function AdminHorarioBloqueModal({
  mode, editing, periodoActivo, docentes, cursos, secciones, grados, asignaciones,
  initialDocenteId, initialSeccionId, onClose, onSaved,
}: AdminHorarioBloqueModalProps) {
  const crearBloque = useCrearBloque();
  const actualizarBloque = useActualizarBloque();

  const seccionInicial = mode === 'edit' && editing ? secciones.find((s) => s.id === editing.seccion_id) : undefined;

  const [form, setForm] = useState(() => ({
    day: mode === 'edit' && editing ? (NUMBER_TO_DAY[editing.dia_semana] ?? 'Lunes') : 'Lunes',
    start: mode === 'edit' && editing ? editing.hora_inicio : '08:00',
    end: mode === 'edit' && editing ? editing.hora_fin : '09:00',
    course_id: mode === 'edit' && editing ? (cursos.find((c) => c.nombre === editing.curso)?.id ?? '') : (cursos[0]?.id ?? ''),
    docente_id: mode === 'edit' && editing ? (editing.docente_id ?? '') : (initialDocenteId ?? docentes[0]?.id ?? ''),
    grado_id: mode === 'edit' && editing ? (seccionInicial?.grado_id ?? '') : (secciones.find((s) => s.id === initialSeccionId)?.grado_id ?? grados[0]?.id ?? ''),
    seccion_id: mode === 'edit' && editing ? (editing.seccion_id ?? '') : (initialSeccionId ?? ''),
    room: mode === 'edit' && editing ? (editing.aula ?? '') : 'Aula 301',
  }));

  const [error, setError] = useState('');

  useEffect(() => {
    if (form.end <= form.start) {
      const validEnd = HOURS.find((h) => h > form.start);
      if (validEnd) setForm((p) => ({ ...p, end: validEnd }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.start]);

  const docentesDelCurso = useMemo(() => {
    if (!form.course_id) return docentes;
    const ids = new Set(asignaciones.filter((a) => a.curso_id === form.course_id).map((a) => a.docente_id));
    return docentes.filter((d) => ids.has(d.id));
  }, [form.course_id, asignaciones, docentes]);

  // Al elegir un docente, el desplegable de Curso solo debe mostrar los
  // cursos que ese docente ya dicta (según sus asignaciones vigentes).
  const cursosDelDocente = useMemo(() => {
    if (!form.docente_id) return cursos;
    const ids = new Set(asignaciones.filter((a) => a.docente_id === form.docente_id).map((a) => a.curso_id));
    return cursos.filter((c) => ids.has(c.id));
  }, [form.docente_id, asignaciones, cursos]);

  useEffect(() => {
    if (mode !== 'create') return;
    if (form.course_id && !cursosDelDocente.some((c) => c.id === form.course_id)) {
      setForm((p) => ({ ...p, course_id: cursosDelDocente[0]?.id ?? '' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.docente_id, cursosDelDocente]);

  const sectionsForSelect = form.grado_id
    ? secciones.filter((s) => s.grado_id === form.grado_id && s.periodo_id === periodoActivo.id)
    : [];

  const endHours = HOURS.filter((h) => h > form.start);
  const isPending = crearBloque.isPending || actualizarBloque.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    try {
      if (mode === 'edit' && editing) {
        await actualizarBloque.mutateAsync({
          id: editing.id,
          payload: {
            dia_semana: DAY_TO_NUMBER[form.day] ?? 1,
            hora_inicio: form.start,
            hora_fin: form.end,
            aula: form.room || null,
          },
        });
      } else {
        let asignacionId: string;
        // Se relee en caliente (no se confía en la prop `asignaciones`, que
        // solo se carga una vez en el shell): evita crear una asignación
        // duplicada si el modal se reabre antes de que el padre refresque.
        const asignacionesActuales = await asignacionesApi.listar({ periodoId: periodoActivo.id });
        const existente = asignacionesActuales.find(
          (a) => a.docente_id === form.docente_id && a.curso_id === form.course_id && a.seccion_id === form.seccion_id,
        );
        if (existente) {
          asignacionId = existente.id;
        } else {
          const nueva = await asignacionesApi.crear({
            docente_id: form.docente_id,
            curso_id: form.course_id,
            seccion_id: form.seccion_id,
            periodo_id: periodoActivo.id,
          });
          asignacionId = nueva.id;
        }

        await crearBloque.mutateAsync({
          asignacion_id: asignacionId,
          dia_semana: DAY_TO_NUMBER[form.day] ?? 1,
          hora_inicio: form.start,
          hora_fin: form.end,
          aula: form.room || null,
        });
      }
      onSaved();
    } catch (err) {
      // El backend es la única fuente de verdad de los cruces (trigger +
      // constraint EXCLUDE) — no se valida nada en el cliente.
      setError(err instanceof ApiError ? err.message : 'Error al guardar el bloque de horario.');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-800">
            {mode === 'edit' ? 'Editar bloque' : 'Agregar bloque'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100">
            <X className="size-4 text-slate-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertTriangle className="size-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Día</label>
              <select
                value={form.day}
                onChange={(e) => { setForm((p) => ({ ...p, day: e.target.value })); setError(''); }}
                className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                {DAYS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Inicio</label>
              <select
                value={form.start}
                onChange={(e) => { setForm((p) => ({ ...p, start: e.target.value })); setError(''); }}
                className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                {HOURS.slice(0, -1).map((h) => <option key={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fin</label>
              <select
                value={form.end}
                onChange={(e) => { setForm((p) => ({ ...p, end: e.target.value })); setError(''); }}
                className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                {endHours.map((h) => <option key={h}>{h}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Docente</label>
              <select
                value={form.docente_id}
                onChange={(e) => { setForm((p) => ({ ...p, docente_id: e.target.value })); setError(''); }}
                className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
                disabled={mode === 'edit'}
              >
                <option value="">Seleccionar docente</option>
                {docentesDelCurso.map((d) => (
                  <option key={d.id} value={d.id}>{d.nombres} {d.apellido_paterno}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Curso</label>
              <select
                value={form.course_id}
                onChange={(e) => { setForm((p) => ({ ...p, course_id: e.target.value })); setError(''); }}
                className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
                disabled={mode === 'edit'}
              >
                <option value="">Seleccionar curso</option>
                {cursosDelDocente.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Grado</label>
              <select
                value={form.grado_id}
                onChange={(e) => { setForm((p) => ({ ...p, grado_id: e.target.value, seccion_id: '' })); setError(''); }}
                className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
                disabled={mode === 'edit'}
              >
                <option value="">Seleccionar grado</option>
                {grados.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Sección</label>
              <select
                value={form.seccion_id}
                onChange={(e) => { setForm((p) => ({ ...p, seccion_id: e.target.value })); setError(''); }}
                className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
                disabled={mode === 'edit' || !form.grado_id}
              >
                <option value="">Seleccionar sección</option>
                {sectionsForSelect.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Aula</label>
              <input
                value={form.room}
                onChange={(e) => setForm((p) => ({ ...p, room: e.target.value }))}
                maxLength={20}
                placeholder="Ej. Aula 301"
                className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || !form.docente_id || !form.course_id || !form.seccion_id}
              className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              {isPending
                ? <><Loader2 className="size-4 animate-spin" /> Procesando…</>
                : mode === 'edit' ? 'Actualizar' : 'Agregar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
