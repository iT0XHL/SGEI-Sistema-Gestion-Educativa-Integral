import { CheckCircle2, AlertTriangle, Circle } from 'lucide-react';

interface EstadoPublicacionBadgeProps {
  publicado: boolean;
  fechaPublicacion: string | null;
  /** true si hay bloques vivos distintos a los del último snapshot publicado. */
  cambiosSinPublicar?: boolean;
}

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function EstadoPublicacionBadge({ publicado, fechaPublicacion, cambiosSinPublicar }: EstadoPublicacionBadgeProps) {
  if (!publicado) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-medium">
        <Circle className="size-3" /> Sin publicar
      </span>
    );
  }

  if (cambiosSinPublicar) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 text-orange-700 border border-orange-200 rounded-full text-xs font-medium">
        <AlertTriangle className="size-3" /> Cambios sin publicar
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-medium">
      <CheckCircle2 className="size-3" /> Publicado {fechaPublicacion ? formatFecha(fechaPublicacion) : ''}
    </span>
  );
}
