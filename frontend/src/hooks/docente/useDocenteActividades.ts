// ============================================================
//  hooks/docente/useDocenteActividades.ts
//  React Query hooks para actividades y entregas (portal Docente).
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { actividadesApi } from '../../lib/api/actividades.api';
import type {
  CreateActividadPayload,
  UpdateActividadPayload,
  CalificarEntregaPayload,
} from '../../types/actividad';

/** Lista actividades del docente (filtrables por sección/curso). */
export function useDocenteActividades(params: { seccionId?: string; cursoId?: string; tipo?: string } = {}) {
  return useQuery({
    queryKey: ['actividades', 'docente', params.seccionId, params.cursoId, params.tipo],
    queryFn: () => actividadesApi.listar(params),
    staleTime: 1000 * 60 * 3,
  });
}

/** Entregas de una actividad específica. */
export function useEntregasActividad(actividadId: string) {
  return useQuery({
    queryKey: ['entregas', actividadId],
    queryFn: () => actividadesApi.listarEntregas(actividadId),
    enabled: Boolean(actividadId),
    staleTime: 1000 * 60 * 2,
  });
}

/** Crea una actividad (sin o con adjunto). */
export function useCrearActividad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateActividadPayload) => actividadesApi.crear(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['actividades'] });
    },
  });
}

/** Crea una actividad con adjunto subido a Storage. */
export function useCrearActividadConArchivo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: Parameters<typeof actividadesApi.crearConArchivo>[0]) =>
      actividadesApi.crearConArchivo(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['actividades'] });
    },
  });
}

/** Actualiza una actividad. */
export function useActualizarActividad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateActividadPayload }) =>
      actividadesApi.actualizar(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['actividades'] });
    },
  });
}

/** Elimina una actividad. */
export function useEliminarActividad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => actividadesApi.eliminar(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['actividades'] });
    },
  });
}

/** Docente califica una entrega. */
export function useCalificarEntrega() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      actividadId,
      entregaId,
      payload,
    }: {
      actividadId: string;
      entregaId: string;
      payload: CalificarEntregaPayload;
    }) => actividadesApi.calificar(actividadId, entregaId, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['entregas', vars.actividadId] });
    },
  });
}
