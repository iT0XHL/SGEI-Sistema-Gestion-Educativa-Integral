import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  horariosApi, asignacionesApi, horarioPublicacionesApi, descansosApi, jornadaApi,
  type HorarioRow,
} from '../../lib/api/horarios.api';

/** Bloques de horario "borrador" (vivos), filtrados por sección o docente. */
export function useHorarioBloques(periodoId: string | undefined, filtros: { seccionId?: string; docenteId?: string } = {}) {
  return useQuery({
    queryKey: ['horarios', 'bloques', periodoId, filtros.seccionId, filtros.docenteId],
    queryFn: () => horariosApi.listar({ periodoId, ...filtros }),
    enabled: Boolean(periodoId),
    staleTime: 1000 * 30,
  });
}

function invalidarHorarios(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['horarios'] });
}

export function useCrearBloque() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { asignacion_id: string; dia_semana: number; hora_inicio: string; hora_fin: string; aula?: string | null }) =>
      horariosApi.crear(payload),
    onSuccess: () => invalidarHorarios(qc),
  });
}

export function useActualizarBloque() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { dia_semana?: number; hora_inicio?: string; hora_fin?: string; aula?: string | null } }) =>
      horariosApi.actualizar(id, payload),
    onSuccess: () => invalidarHorarios(qc),
  });
}

export function useEliminarBloque() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => horariosApi.eliminar(id),
    onSuccess: () => invalidarHorarios(qc),
  });
}

export function useCrearAsignacionSiNoExiste() {
  return useMutation({
    mutationFn: (payload: { docente_id: string; curso_id: string; seccion_id: string; periodo_id: string }) =>
      asignacionesApi.crear(payload),
  });
}

/** Docentes con su estado de publicación de horario ("por Docente"). */
export function usePublicacionesDocentes(periodoId: string | undefined, page: number, limit = 20) {
  return useQuery({
    queryKey: ['horarios', 'publicaciones', 'docentes', periodoId, page, limit],
    queryFn: () => horarioPublicacionesApi.listarDocentes({ periodoId, page, limit }),
    enabled: Boolean(periodoId),
    staleTime: 1000 * 15,
  });
}

/** Secciones (Grado+Sección+Nivel = "Aula") con su estado de publicación ("por Aula"). */
export function usePublicacionesSecciones(periodoId: string | undefined, page: number, limit = 20) {
  return useQuery({
    queryKey: ['horarios', 'publicaciones', 'secciones', periodoId, page, limit],
    queryFn: () => horarioPublicacionesApi.listarSecciones({ periodoId, page, limit }),
    enabled: Boolean(periodoId),
    staleTime: 1000 * 15,
  });
}

export function usePublicarDocente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ docenteId, periodoId }: { docenteId: string; periodoId: string }) =>
      horarioPublicacionesApi.publicarDocente(docenteId, periodoId),
    onSuccess: () => invalidarHorarios(qc),
  });
}

export function usePublicarSeccion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ seccionId, periodoId }: { seccionId: string; periodoId: string }) =>
      horarioPublicacionesApi.publicarSeccion(seccionId, periodoId),
    onSuccess: () => invalidarHorarios(qc),
  });
}

export function useDespublicarDocente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ docenteId, periodoId }: { docenteId: string; periodoId: string }) =>
      horarioPublicacionesApi.despublicarDocente(docenteId, periodoId),
    onSuccess: () => invalidarHorarios(qc),
  });
}

export function useDespublicarSeccion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ seccionId, periodoId }: { seccionId: string; periodoId: string }) =>
      horarioPublicacionesApi.despublicarSeccion(seccionId, periodoId),
    onSuccess: () => invalidarHorarios(qc),
  });
}

/** Descarga el PDF del horario (por docente, sección, completo, o masivo "docentes"/"secciones"). */
export function useDescargarHorarioPdf() {
  return useMutation({
    mutationFn: async (params: { tipo: 'docente' | 'seccion' | 'completo' | 'docentes' | 'secciones'; id?: string; periodoId?: string; nombreArchivo: string }) => {
      const blob = await horariosApi.descargarPdf(params);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = params.nombreArchivo;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  });
}

/** Recreo/Refrigerio en vivo (sin flujo de publicación) de uno o más niveles. */
export function useDescansos(periodoId: string | undefined, nivelIds: string[]) {
  return useQuery({
    queryKey: ['horarios', 'descansos', periodoId, [...nivelIds].sort().join(',')],
    queryFn: () => descansosApi.listar({ periodoId: periodoId as string, nivelIds }),
    enabled: Boolean(periodoId) && nivelIds.length > 0,
    staleTime: 1000 * 30,
  });
}

export function useUpsertDescanso() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { nivel_id: string; periodo_id: string; tipo: 'RECREO' | 'REFRIGERIO'; hora_inicio: string; hora_fin: string }) =>
      descansosApi.upsert(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['horarios', 'descansos'] }),
  });
}

/** Jornada escolar (hora de inicio + duración de la hora escolar) de un nivel. */
export function useJornadaConfig(periodoId: string | undefined, nivelId: string | undefined) {
  return useQuery({
    queryKey: ['horarios', 'jornada', periodoId, nivelId],
    queryFn: () => jornadaApi.obtener({ periodoId: periodoId as string, nivelId: nivelId as string }),
    enabled: Boolean(periodoId) && Boolean(nivelId),
    staleTime: 1000 * 30,
  });
}

/** Jornada escolar de varios niveles a la vez (vista combinada por Docente). */
export function useJornadasDeNiveles(periodoId: string | undefined, nivelIds: string[]) {
  return useQueries({
    queries: nivelIds.map((nivelId) => ({
      queryKey: ['horarios', 'jornada', periodoId, nivelId],
      queryFn: () => jornadaApi.obtener({ periodoId: periodoId as string, nivelId }),
      enabled: Boolean(periodoId),
      staleTime: 1000 * 30,
    })),
    combine: (results) => ({
      data: results.map((r) => r.data).filter((d): d is NonNullable<typeof d> => d != null),
      isLoading: results.some((r) => r.isLoading),
    }),
  });
}

export function useUpsertJornadaConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { nivel_id: string; periodo_id: string; hora_inicio_jornada: string; duracion_hora_min: number; total_horas_dia: number }) =>
      jornadaApi.actualizar(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['horarios', 'jornada'] }),
  });
}

export type { HorarioRow };
