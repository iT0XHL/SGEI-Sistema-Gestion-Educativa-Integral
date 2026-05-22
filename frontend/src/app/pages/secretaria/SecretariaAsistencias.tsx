import { useState, useEffect, useMemo } from 'react';
import {
  Plus, Edit2, Trash2, Calendar, User, Loader2, AlertTriangle, Filter,
} from 'lucide-react';
import { asistenciaDocentesApi, getEstadoLabel, getEstadoColor, cargarDocentes } from '../../lib/api/asistencias.api';
import type { AsistenciaDocenteRow, DocenteRow } from '../../lib/api/asistencias.api';

interface FormData {
  docente_id: string;
  fecha: string;
  estado: 'P' | 'F' | 'T' | 'J';
  justificacion: string;
}

export default function SecretariaAsistencias() {
  const [asistencias, setAsistencias] = useState<AsistenciaDocenteRow[]>([]);
  const [docentes, setDocentes] = useState<DocenteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  // Filtros
  const [filterDocente, setFilterDocente] = useState('');
  const [filterEstado, setFilterEstado] = useState<'P' | 'F' | 'T' | 'J' | ''>('');
  const [filterFechaInicio, setFilterFechaInicio] = useState('');
  const [filterFechaFin, setFilterFechaFin] = useState('');

  // Modal de crear/editar
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>({
    docente_id: '',
    fecha: new Date().toISOString().split('T')[0],
    estado: 'P',
    justificacion: '',
  });

  // Cargar datos iniciales
  useEffect(() => {
    async function loadData() {
      try {
        const [docRes, asisRes] = await Promise.all([
          cargarDocentes(),
          asistenciaDocentesApi.listar({ limit: 100 }),
        ]);
        setDocentes(docRes);
        setAsistencias(asisRes.items || []);
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : 'Error al cargar datos');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filtrar asistencias
  const filtered = useMemo(() => {
    let result = asistencias;
    if (filterDocente) {
      result = result.filter(a => a.docente_id === filterDocente);
    }
    if (filterEstado) {
      result = result.filter(a => a.estado === filterEstado);
    }
    if (filterFechaInicio) {
      result = result.filter(a => a.fecha >= filterFechaInicio);
    }
    if (filterFechaFin) {
      result = result.filter(a => a.fecha <= filterFechaFin);
    }
    return result.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [asistencias, filterDocente, filterEstado, filterFechaInicio, filterFechaFin]);

  function resetForm() {
    setForm({
      docente_id: '',
      fecha: new Date().toISOString().split('T')[0],
      estado: 'P',
      justificacion: '',
    });
  }

  function openCreateModal() {
    setModalMode('create');
    resetForm();
    setShowModal(true);
  }

  function openEditModal(asistencia: AsistenciaDocenteRow) {
    setModalMode('edit');
    setEditingId(asistencia.id);
    setForm({
      docente_id: asistencia.docente_id,
      fecha: asistencia.fecha,
      estado: asistencia.estado,
      justificacion: asistencia.justificacion || '',
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveError('');
    setSaveSuccess('');

    if (!form.docente_id || !form.fecha || !form.estado) {
      setSaveError('Por favor completa los campos requeridos');
      return;
    }

    setSaving(true);
    try {
      if (modalMode === 'create') {
        await asistenciaDocentesApi.crear({
          docente_id: form.docente_id,
          fecha: form.fecha,
          estado: form.estado,
          justificacion: form.justificacion || null,
        });
        setSaveSuccess('Asistencia registrada correctamente');
      } else if (editingId) {
        await asistenciaDocentesApi.actualizar(editingId, {
          estado: form.estado,
          justificacion: form.justificacion || null,
        });
        setSaveSuccess('Asistencia actualizada correctamente');
      }

      // Recargar datos
      const updated = await asistenciaDocentesApi.listar({ limit: 100 });
      setAsistencias(updated.items || []);
      setShowModal(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta asistencia?')) return;
    try {
      await asistenciaDocentesApi.eliminar(id);
      setSaveSuccess('Asistencia eliminada');
      const updated = await asistenciaDocentesApi.listar({ limit: 100 });
      setAsistencias(updated.items || []);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Error al eliminar');
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Asistencia Docente</h1>
          <p className="text-slate-600 mt-1">Registra y gestiona la asistencia del personal docente</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition"
        >
          <Plus className="w-5 h-5" />
          Registrar Asistencia
        </button>
      </div>

      {fetchError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-red-800 text-sm">{fetchError}</div>
        </div>
      )}

      {saveError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-red-800 text-sm">{saveError}</div>
        </div>
      )}

      {saveSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 text-sm">
          {saveSuccess}
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-5 h-5 text-slate-600" />
          <h3 className="font-semibold text-slate-900">Filtros</h3>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <select
            value={filterDocente}
            onChange={(e) => setFilterDocente(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todos los docentes</option>
            {docentes.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombres} {d.apellido_paterno}
              </option>
            ))}
          </select>

          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value as any)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todos los estados</option>
            <option value="P">Presente</option>
            <option value="F">Falta</option>
            <option value="T">Tardanza</option>
            <option value="J">Justificado</option>
          </select>

          <input
            type="date"
            value={filterFechaInicio}
            onChange={(e) => setFilterFechaInicio(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Desde"
          />

          <input
            type="date"
            value={filterFechaFin}
            onChange={(e) => setFilterFechaFin(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Hasta"
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left font-semibold text-slate-900">Docente</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-900">DNI</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-900">Fecha</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-900">Estado</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-900">Justificación</th>
              <th className="px-6 py-3 text-right font-semibold text-slate-900">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  No hay asistencias registradas
                </td>
              </tr>
            ) : (
              filtered.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-3">
                    <div className="font-medium text-slate-900">
                      {a.docente?.nombres} {a.docente?.apellido_paterno}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-slate-600">{a.docente?.dni}</td>
                  <td className="px-6 py-3 text-slate-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(a.fecha).toLocaleDateString('es-PE')}
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getEstadoColor(a.estado)}`}>
                      {getEstadoLabel(a.estado)}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-slate-600 text-xs">{a.justificacion || '—'}</td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEditModal(a)}
                        className="p-2 hover:bg-blue-100 text-blue-600 rounded transition"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="p-2 hover:bg-red-100 text-red-600 rounded transition"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-bold mb-4">
              {modalMode === 'create' ? 'Registrar Asistencia' : 'Editar Asistencia'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">
                  Docente *
                </label>
                <select
                  value={form.docente_id}
                  onChange={(e) => setForm({ ...form, docente_id: e.target.value })}
                  disabled={modalMode === 'edit'}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                >
                  <option value="">Seleccionar docente</option>
                  {docentes.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nombres} {d.apellido_paterno} {d.apellido_materno}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">
                  Fecha *
                </label>
                <input
                  type="date"
                  value={form.fecha}
                  onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                  disabled={modalMode === 'edit'}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">
                  Estado *
                </label>
                <select
                  value={form.estado}
                  onChange={(e) => setForm({ ...form, estado: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="P">Presente</option>
                  <option value="F">Falta</option>
                  <option value="T">Tardanza</option>
                  <option value="J">Justificado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">
                  Justificación
                </label>
                <textarea
                  value={form.justificacion}
                  onChange={(e) => setForm({ ...form, justificacion: e.target.value })}
                  placeholder="Motivo o descripción..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 text-slate-900 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {modalMode === 'create' ? 'Registrar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
