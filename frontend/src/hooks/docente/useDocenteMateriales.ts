// ============================================================
//  hooks/docente/useDocenteMateriales.ts
//  React Query hooks para materiales educativos (portal Docente).
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { materialesApi } from '../../lib/api/materiales.api';
import type { CreateMaterialUrlPayload, UpdateMaterialPayload } from '../../types/material';

/** Lista los materiales del docente, opcionalmente filtrados por sección/curso. */
export function useDocenteMateriales(params: { seccionId?: string; cursoId?: string } = {}) {
  return useQuery({
    queryKey: ['materiales', 'docente', params.seccionId, params.cursoId],
    queryFn: () => materialesApi.listar(params),
    staleTime: 1000 * 60 * 3,
  });
}

/** Obtiene la URL de acceso al archivo de un material. */
export function useArchivoUrl(materialId: string, enabled = true) {
  return useQuery({
    queryKey: ['materiales', 'archivo', materialId],
    queryFn: () => materialesApi.getArchivoUrl(materialId),
    enabled: Boolean(materialId) && enabled,
    // No cachear URLs firmadas (expiran en 300 s).
    staleTime: 1000 * 200,
    gcTime: 1000 * 300,
  });
}

/** Crea material con URL externa (enlace/video). */
export function useCrearMaterialUrl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateMaterialUrlPayload) => materialesApi.crearConUrl(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['materiales'] });
    },
  });
}

/** Crea material subiendo un archivo a Supabase Storage. */
export function useCrearMaterialArchivo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: Parameters<typeof materialesApi.crearConArchivo>[0]) =>
      materialesApi.crearConArchivo(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['materiales'] });
    },
  });
}

/** Actualiza metadatos de un material. */
export function useActualizarMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateMaterialPayload }) =>
      materialesApi.actualizar(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['materiales'] });
    },
  });
}

/** Elimina un material. */
export function useEliminarMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => materialesApi.eliminar(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['materiales'] });
    },
  });
}
