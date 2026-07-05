import { useRef, useState } from 'react';
import { X, ZoomIn, ZoomOut, Download, Loader2 } from 'lucide-react';

interface VoucherLightboxProps {
  url: string;
  nombreArchivo: string | null;
  onClose: () => void;
}

function esPdf(nombreArchivo: string | null, url: string): boolean {
  const objetivo = (nombreArchivo ?? url).toLowerCase();
  return objetivo.includes('.pdf');
}

/** Modal a pantalla completa con zoom (imagen) y descarga vía blob, para no depender de `download` cross-origin. */
export default function VoucherLightbox({ url, nombreArchivo, onClose }: VoucherLightboxProps) {
  const [zoom, setZoom] = useState(1);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const isPdf = esPdf(nombreArchivo, url);

  function handleWheel(e: React.WheelEvent) {
    if (isPdf) return;
    e.preventDefault();
    setZoom(z => Math.min(4, Math.max(1, z + (e.deltaY < 0 ? 0.2 : -0.2))));
  }

  async function handleDescargar() {
    setDownloading(true);
    setDownloadError('');
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('No se pudo descargar el archivo.');
      const blob = await resp.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = nombreArchivo ?? 'voucher';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Error al descargar el archivo.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/90 z-[60] flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-black/40 text-white">
        <p className="text-sm font-medium truncate">{nombreArchivo ?? 'Comprobante de pago'}</p>
        <div className="flex items-center gap-2">
          {!isPdf && (
            <>
              <button
                onClick={() => setZoom(z => Math.max(1, z - 0.2))}
                className="p-2 rounded-lg hover:bg-white/10"
                aria-label="Alejar"
              >
                <ZoomOut className="size-4" />
              </button>
              <button
                onClick={() => setZoom(z => Math.min(4, z + 0.2))}
                className="p-2 rounded-lg hover:bg-white/10"
                aria-label="Acercar"
              >
                <ZoomIn className="size-4" />
              </button>
            </>
          )}
          <button
            onClick={handleDescargar}
            disabled={downloading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-xs font-medium disabled:opacity-60"
          >
            {downloading ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
            Descargar
          </button>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10" aria-label="Cerrar">
            <X className="size-5" />
          </button>
        </div>
      </div>

      {downloadError && (
        <p className="text-center text-xs text-red-300 py-1">{downloadError}</p>
      )}

      <div
        ref={containerRef}
        onWheel={handleWheel}
        className="flex-1 overflow-auto flex items-center justify-center p-4"
      >
        {isPdf ? (
          <iframe src={url} title="Comprobante de pago" className="w-full h-full bg-white rounded-lg" />
        ) : (
          <img
            src={url}
            alt="Comprobante de pago"
            style={{ transform: `scale(${zoom})`, transition: 'transform 0.15s ease-out' }}
            className="max-w-full max-h-full object-contain select-none"
            draggable={false}
          />
        )}
      </div>
    </div>
  );
}
