// ============================================================
//  hooks/alumno/useAlumnoMateriales.ts
//  React Query hooks para materiales desde el portal Alumno.
//  El backend filtra automáticamente la sección del alumno
//  y solo devuelve materiales con visible=true.
// ============================================================
import { useQuery } from '@tanstack/react-query';
import { materialesApi } from '../../lib/api/materiales.api';

/** Lista materiales visibles de la sección del alumno. */
export function useAlumnoMateriales(cursoId?: string) {
  return useQuery({
    queryKey: ['materiales', 'alumno', cursoId],
    queryFn: () => materialesApi.listar({ cursoId }),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Obtiene la URL temporal de acceso al archivo de un material.
 * Activar solo cuando el alumno quiera descargar/abrir el archivo.
 */
export function useArchivoMaterialAlumno(materialId: string, enabled = false) {
  return useQuery({
    queryKey: ['materiales', 'archivo', 'alumno', materialId],
    queryFn: () => materialesApi.getArchivoUrl(materialId),
    enabled: Boolean(materialId) && enabled,
    // URL firmada expira en 300 s → no cachear más tiempo.
    staleTime: 1000 * 200,
    gcTime: 1000 * 300,
  });
}
