import { Loader2, CalendarX2, Download } from 'lucide-react';
import { useSession } from '@/lib/hooks/useSession';
import { ApiError } from '@/lib/api/client';
import { useMiHorarioPublicado, useDescargarMiHorarioPdf } from '@/hooks/docente/useHorarioDocente';
import { HorarioSemanalGrid } from '@/app/components/horarios/HorarioSemanalGrid';
import { generarFranjas, mergeFranjas } from '@/app/components/horarios/horarioSlots';

export default function DocenteHorario() {
  const { session } = useSession();
  const { data, isLoading, error } = useMiHorarioPublicado(session?.entidadId);
  const descargarPdf = useDescargarMiHorarioPdf();

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl mx-auto flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const noPublicado = error instanceof ApiError && error.status === 404;

  if (noPublicado || !data) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 flex flex-col items-center text-center gap-3">
          <CalendarX2 className="size-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-600">Tu horario aún no ha sido publicado por Administración.</p>
          <p className="text-xs text-slate-400">Vuelve a revisar más tarde.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mi Horario</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {data.bloques.length} bloque{data.bloques.length !== 1 ? 's' : ''} · Publicado el{' '}
            {new Date(data.fecha_publicacion).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <button
          onClick={() => descargarPdf.mutate({ docenteId: session!.entidadId, nombreArchivo: 'mi_horario.pdf' })}
          disabled={descargarPdf.isPending}
          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
        >
          <Download className="size-3.5" /> Exportar PDF
        </button>
      </div>
      <HorarioSemanalGrid
        bloques={data.bloques}
        mode="readonly"
        mostrarEtiqueta="seccion"
        franjas={mergeFranjas(
          data.jornadas.map((j) => generarFranjas(j.hora_inicio_jornada, j.duracion_hora_min, data.descansos.filter((d) => d.nivel_id === j.nivel_id), j.total_horas_dia)),
        )}
      />
    </div>
  );
}
