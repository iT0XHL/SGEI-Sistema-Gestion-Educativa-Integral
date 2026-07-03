import { useQuery, useMutation } from '@tanstack/react-query';
import { horarioDocenteApi, horariosApi } from '../../lib/api/horarios.api';

/** Horario PUBLICADO del docente autenticado. 404 = aún no publicado. */
export function useMiHorarioPublicado(docenteId: string | undefined) {
  return useQuery({
    queryKey: ['horarios', 'publicado', 'docente', docenteId],
    queryFn: () => horarioDocenteApi.obtenerPublicado(docenteId as string),
    enabled: Boolean(docenteId),
    staleTime: 1000 * 60,
    retry: false,
  });
}

/** Descarga el PDF del horario PUBLICADO del docente autenticado. */
export function useDescargarMiHorarioPdf() {
  return useMutation({
    mutationFn: async (params: { docenteId: string; nombreArchivo: string }) => {
      const blob = await horariosApi.descargarPdfPublicado({ tipo: 'docente', id: params.docenteId });
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
