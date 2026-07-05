import { useState } from 'react';
import { PlusCircle, ChevronRight, Loader2, Download, Upload } from 'lucide-react';
import type { DocenteRow, CursoRow, SeccionRow, GradoRow, PeriodoRow, AsignacionRow, HorarioRow } from '@/lib/api/horarios.api';
import {
  usePublicacionesDocentes, useHorarioBloques, usePublicarDocente,
  useEliminarBloque, useDescargarHorarioPdf, useDescansos, useJornadasDeNiveles,
} from '@/hooks/admin/useHorariosAdmin';
import { HorarioSemanalGrid } from '@/app/components/horarios/HorarioSemanalGrid';
import { generarFranjas, mergeFranjas } from '@/app/components/horarios/horarioSlots';
import { EstadoPublicacionBadge } from '@/app/components/horarios/EstadoPublicacionBadge';
import { AdminHorarioBloqueModal } from './AdminHorarioBloqueModal';

interface AdminHorariosPorDocenteProps {
  periodoActivo: PeriodoRow;
  docentes: DocenteRow[];
  cursos: CursoRow[];
  secciones: SeccionRow[];
  grados: GradoRow[];
  asignaciones: AsignacionRow[];
}

interface ModalState {
  open: boolean;
  mode: 'create' | 'edit';
  editing?: HorarioRow;
}

export function AdminHorariosPorDocente({ periodoActivo, docentes, cursos, secciones, grados, asignaciones }: AdminHorariosPorDocenteProps) {
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ open: false, mode: 'create' });

  const { data: lista, isLoading } = usePublicacionesDocentes(periodoActivo.id, page, 10);
  const { data: bloques = [], refetch: refetchBloques } = useHorarioBloques(periodoActivo.id, { docenteId: selectedId ?? undefined });
  const publicar = usePublicarDocente();
  const eliminarBloque = useEliminarBloque();
  const descargarPdf = useDescargarHorarioPdf();

  const seleccionado = lista?.items.find((d) => d.id === selectedId);
  // Un docente puede enseñar en más de un nivel: se toman los niveles
  // distintos entre sus asignaciones vigentes.
  const nivelIdsDelDocente = [
    ...new Set(
      asignaciones
        .filter((a) => a.docente_id === selectedId)
        .map((a) => secciones.find((s) => s.id === a.seccion_id)?.grado.nivel.id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const { data: descansos = [] } = useDescansos(periodoActivo.id, nivelIdsDelDocente);
  const { data: jornadas } = useJornadasDeNiveles(periodoActivo.id, nivelIdsDelDocente);
  const franjas = mergeFranjas(
    jornadas.map((j) => generarFranjas(j.hora_inicio_jornada, j.duracion_hora_min, descansos.filter((d) => d.nivel_id === j.nivel_id), j.total_horas_dia)),
  );

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Docentes</h2>
          <div className="flex items-center gap-3">
            {lista && <span className="text-xs text-slate-400">{lista.meta.total} docente{lista.meta.total !== 1 ? 's' : ''}</span>}
            <button
              onClick={() => descargarPdf.mutate({ tipo: 'docentes', periodoId: periodoActivo.id, nombreArchivo: 'horarios_docentes.pdf' })}
              disabled={descargarPdf.isPending}
              title="Un PDF con una hoja por cada docente"
              className="flex items-center gap-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
            >
              <Download className="size-3" /> Exportar todos
            </button>
          </div>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="size-6 animate-spin text-slate-400" /></div>
        ) : (
          <div className="divide-y divide-slate-50">
            {lista?.items.map((d) => (
              <div key={d.id} className={`flex items-center justify-between px-5 py-3 gap-3 ${selectedId === d.id ? 'bg-blue-50/50' : ''}`}>
                <button
                  onClick={() => setSelectedId(d.id)}
                  className="flex items-center gap-2 text-left flex-1 min-w-0"
                >
                  <ChevronRight className={`size-4 shrink-0 text-slate-400 transition-transform ${selectedId === d.id ? 'rotate-90' : ''}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{d.nombres} {d.apellido_paterno} {d.apellido_materno}</p>
                    <p className="text-xs text-slate-400">{d.total_bloques} bloque{d.total_bloques !== 1 ? 's' : ''}</p>
                  </div>
                </button>
                <div className="flex items-center gap-2 shrink-0">
                  <EstadoPublicacionBadge publicado={d.publicado} fechaPublicacion={d.fecha_publicacion} />
                  <button
                    onClick={() => publicar.mutate({ docenteId: d.id, periodoId: periodoActivo.id })}
                    disabled={publicar.isPending || d.total_bloques === 0}
                    className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    title={d.total_bloques === 0 ? 'Sin bloques para publicar' : undefined}
                  >
                    <Upload className="size-3" /> {d.publicado ? 'Actualizar' : 'Mostrar a Docente'}
                  </button>
                </div>
              </div>
            ))}
            {lista?.items.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-slate-400">No hay docentes con asignaciones en este período.</p>
            )}
          </div>
        )}
        {lista && lista.meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
            >
              Anterior
            </button>
            <span className="text-xs text-slate-500">Página {lista.meta.page} de {lista.meta.totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(lista.meta.totalPages, p + 1))}
              disabled={page >= lista.meta.totalPages}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>

      {seleccionado && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-semibold text-slate-700">
              Horario borrador — {seleccionado.nombres} {seleccionado.apellido_paterno}
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => descargarPdf.mutate({ tipo: 'docente', id: seleccionado.id, periodoId: periodoActivo.id, nombreArchivo: `horario_${seleccionado.nombres}_${seleccionado.apellido_paterno}.pdf`.replace(/\s+/g, '_') })}
                className="flex items-center gap-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              >
                <Download className="size-3" /> Exportar PDF
              </button>
              <button
                onClick={() => setModal({ open: true, mode: 'create' })}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              >
                <PlusCircle className="size-3" /> Agregar bloque
              </button>
            </div>
          </div>

          <HorarioSemanalGrid
            bloques={bloques}
            mode="edit"
            mostrarEtiqueta="seccion"
            franjas={franjas}
            onEdit={(b) => setModal({ open: true, mode: 'edit', editing: bloques.find((h) => h.id === b.id) })}
            onDelete={(b) => { if (b.id) eliminarBloque.mutate(b.id); }}
          />
        </div>
      )}

      {modal.open && (
        <AdminHorarioBloqueModal
          mode={modal.mode}
          editing={modal.editing}
          periodoActivo={periodoActivo}
          docentes={docentes}
          cursos={cursos}
          secciones={secciones}
          grados={grados}
          asignaciones={asignaciones}
          initialDocenteId={selectedId ?? undefined}
          onClose={() => setModal({ open: false, mode: 'create' })}
          onSaved={() => { setModal({ open: false, mode: 'create' }); refetchBloques(); }}
        />
      )}
    </div>
  );
}
