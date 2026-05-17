// ============================================================
//  hooks/alumno/useAlumnoActividades.ts
//  React Query hooks para actividades desde el portal Alumno.
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { actividadesApi } from '../../lib/api/actividades.api';
import type { SubmitEntregaPayload } from '../../types/actividad';

/** Lista actividades de la sección del alumno (el backend filtra automáticamente). */
export function useAlumnoActividades(cursoId?: string) {
  return useQuery({
    queryKey: ['actividades', 'alumno', cursoId],
    queryFn: () => actividadesApi.listar({ cursoId }),
    staleTime: 1000 * 60 * 3,
  });
}

/** Detalle de una actividad. */
export function useActividad(actividadId: string) {
  return useQuery({
    queryKey: ['actividades', actividadId],
    queryFn: () => actividadesApi.obtener(actividadId),
    enabled: Boolean(actividadId),
  });
}

/** Propia entrega del alumno para una actividad. */
export function useMiEntrega(actividadId: string) {
  return useQuery({
    queryKey: ['entregas', 'alumno', actividadId],
    queryFn: async () => {
      const entregas = await actividadesApi.listarEntregas(actividadId);
      return entregas[0] ?? null;
    },
    enabled: Boolean(actividadId),
    staleTime: 1000 * 60,
  });
}

/** Alumno entrega sin archivo. */
export function useEntregar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ actividadId, payload }: { actividadId: string; payload: SubmitEntregaPayload }) =>
      actividadesApi.entregar(actividadId, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['entregas', 'alumno', vars.actividadId] });
    },
  });
}

/** Alumno entrega con archivo subido a Storage. */
export function useEntregarConArchivo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      actividadId,
      archivo,
      comentario,
    }: {
      actividadId: string;
      archivo: File;
      comentario?: string;
    }) => actividadesApi.entregarConArchivo(actividadId, archivo, comentario),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['entregas', 'alumno', vars.actividadId] });
    },
  });
}
