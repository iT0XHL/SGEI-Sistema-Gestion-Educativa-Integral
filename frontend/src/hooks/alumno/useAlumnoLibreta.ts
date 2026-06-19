import { useQuery, useMutation } from '@tanstack/react-query';
import { libretasApi } from '../../lib/api/libretas.api';

/** Obtiene la libreta del alumno autenticado desde mv_libreta_alumno. */
export function useAlumnoLibreta(alumnoId: string, bimestreId?: string) {
  return useQuery({
    queryKey: ['libreta', 'alumno', alumnoId, bimestreId],
    queryFn:  () => libretasApi.obtener(alumnoId, bimestreId),
    enabled:  Boolean(alumnoId),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Descarga el PDF de la libreta y dispara la apertura en el navegador.
 * Registra un evento READ_SENSITIVE en el backend automáticamente.
 *
 * Uso:
 *   const { mutate: descargar, isPending } = useDescargarLibretaPdf();
 *   descargar({ alumnoId: '...', bimestreId: '...', nombre: 'Juan Perez' });
 */
export function useDescargarLibretaPdf() {
  return useMutation({
    mutationFn: async ({
      alumnoId,
      bimestreId,
      nombre,
    }: {
      alumnoId:    string;
      bimestreId?: string;
      nombre?:     string;
    }) => {
      const blob = await libretasApi.descargarPdf(alumnoId, bimestreId);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `libreta_${(nombre ?? alumnoId).replace(/\s+/g, '_')}.docx`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 150);
    },
  });
}
