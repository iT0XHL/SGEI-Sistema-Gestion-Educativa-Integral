import { useQuery, useMutation } from '@tanstack/react-query';
import { horarioAlumnoApi, horariosApi } from '../../lib/api/horarios.api';

/** Horario PUBLICADO de la sección del alumno autenticado. 404 = aún no publicado. */
export function useMiHorarioPublicado(alumnoId: string | undefined) {
  return useQuery({
    queryKey: ['horarios', 'publicado', 'alumno', alumnoId],
    queryFn: () => horarioAlumnoApi.obtenerPublicado(alumnoId as string),
    enabled: Boolean(alumnoId),
    staleTime: 1000 * 60,
    retry: false,
  });
}

/** Descarga el PDF del horario PUBLICADO de la sección del alumno autenticado. */
export function useDescargarMiHorarioPdf() {
  return useMutation({
    mutationFn: async (params: { alumnoId: string; nombreArchivo: string }) => {
      const blob = await horariosApi.descargarPdfPublicado({ tipo: 'alumno', id: params.alumnoId });
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
