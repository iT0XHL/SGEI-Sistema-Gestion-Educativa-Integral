import { useState, useEffect, useRef } from 'react';
import {
  Upload, CheckCircle2, Clock, X, CreditCard, DollarSign,
  AlertCircle, Bell, RefreshCw, Paperclip
} from 'lucide-react';
import { useSession } from '../../../lib/hooks/useSession';
import { pagosApi } from '../../../lib/api/pagos.api';
import { boletasApi } from '../../../lib/api/boletas.api';
import { apiClient } from '../../../lib/api/client';
import { BASE_URL } from '../../../lib/api/client';
import VoucherLightbox from '../../components/secretaria/VoucherLightbox';
import type { EstadoPagoRow, EstadoPago } from '../../../types/pago';

// ── Helpers ────────────────────────────────────────────────────────────────────

const MESES: Record<number, string> = {
  1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril',
  5: 'Mayo', 6: 'Junio', 7: 'Julio', 8: 'Agosto',
  9: 'Setiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre',
};

function getNombreMes(row: EstadoPagoRow): string {
  return row.mes ? (MESES[row.mes] ?? `Mes ${row.mes}`) : row.concepto;
}

function getAnio(row: EstadoPagoRow): number {
  return new Date(row.fecha_vencimiento).getFullYear();
}

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function toPaymentStatus(estado: EstadoPago): 'paid' | 'pending' | 'overdue' {
  if (estado === 'Pagado')    return 'paid';
  if (estado === 'Rechazado') return 'overdue';
  return 'pending';
}

function puedeSubirVoucher(row: EstadoPagoRow): boolean {
  return row.estado !== 'Pagado' && row.estado_boleta !== 'En_Revision';
}

function puedeReenviar(row: EstadoPagoRow): boolean {
  return row.estado_boleta === 'Rechazada';
}

// ── UI maps ────────────────────────────────────────────────────────────────────

type PaymentStatus = 'paid' | 'pending' | 'overdue';

const PAY_STATUS: Record<PaymentStatus, { label: string; icon: React.ElementType; cls: string }> = {
  paid:    { label: 'Pagado',    icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pending: { label: 'Pendiente', icon: Clock,        cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  overdue: { label: 'Vencido',   icon: AlertCircle,  cls: 'bg-red-50 text-red-700 border-red-200' },
};

const VOUCHER_STATUS: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  submitted: { label: 'En revisión', cls: 'bg-blue-50 text-blue-700 border-blue-200',          icon: Clock },
  approved:  { label: 'Aprobado',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',  icon: CheckCircle2 },
  rejected:  { label: 'Rechazado',   cls: 'bg-red-50 text-red-700 border-red-200',              icon: AlertCircle },
};

// ── Main component ─────────────────────────────────────────────────────────────

export default function AlumnoPagos() {
  const { session, loading: sessionLoading } = useSession();

  const [pagos,       setPagos]       = useState<EstadoPagoRow[]>([]);
  const [institucion, setInstitucion] = useState<{ nombre: string } | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [errorMsg,    setErrorMsg]    = useState<string | null>(null);

  // Upload modal
  const [uploadModal,  setUploadModal]  = useState<string | null>(null); // pago_id
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading,    setUploading]    = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voucher lightbox
  const [voucherView, setVoucherView] = useState<{
    pagoId: string; url: string; nombreArchivo: string | null;
  } | null>(null);
  const [loadingVoucher, setLoadingVoucher] = useState<string | null>(null);

  // Other modals
  const [reuploadModal, setReuploadModal] = useState<string | null>(null); // pago_id

  // ── Data loading ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (sessionLoading || !session) return;

    let aborted = false;

    async function cargar() {
      try {
        setLoading(true);
        setErrorMsg(null);

        const pagosData = await pagosApi.listar() as EstadoPagoRow[];
        if (aborted) return;

        setPagos(pagosData);

        try {
          const inst = await apiClient.get<{ nombre: string }>('/api/institucion');
          if (!aborted) setInstitucion(inst);
        } catch { /* keep null — hardcoded fallback used in render */ }

      } catch (err) {
        if (!aborted) {
          setErrorMsg(err instanceof Error ? err.message : 'No se pudieron cargar los datos de pagos.');
        }
      } finally {
        if (!aborted) setLoading(false);
      }
    }

    cargar();
    return () => { aborted = true; };
  }, [session, sessionLoading]);

  // ── Upload submit ──────────────────────────────────────────────────────────────

  async function handleUploadSubmit() {
    if (!uploadModal || !selectedFile) return;
    setUploading(true);
    setErrorMsg(null);

    try {
      await boletasApi.subir({ pago_id: uploadModal, archivo: selectedFile });

      const actualizados = await pagosApi.listar() as EstadoPagoRow[];
      setPagos(actualizados);

      setUploadModal(null);
      setSelectedFile(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al subir el comprobante.');
    } finally {
      setUploading(false);
    }
  }

  async function handleVerVoucher(pagoId: string) {
    if (loadingVoucher) return;
    setLoadingVoucher(pagoId);
    setErrorMsg(null);
    try {
      const boletas = await boletasApi.listar({ pagoId });
      const boleta = boletas[0];
      if (!boleta?.url_archivo) throw new Error('No se encontró el comprobante.');
      const url = boleta.url_archivo.startsWith('http')
        ? boleta.url_archivo
        : `${BASE_URL}/api/files/${boleta.url_archivo}`;
      setVoucherView({ pagoId, url, nombreArchivo: boleta.nombre_archivo });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al cargar el comprobante.');
    } finally {
      setLoadingVoucher(null);
    }
  }

  function handleConfirmarReenvio() {
    setUploadModal(reuploadModal);
    setReuploadModal(null);
    setSelectedFile(null);
  }

  // ── Derived metrics ────────────────────────────────────────────────────────────

  const pagados        = pagos.filter(p => p.estado === 'Pagado');
  const pendientes     = pagos.filter(p => p.estado !== 'Pagado');
  const totalPagado    = pagados.reduce((s, p) => s + p.monto, 0);
  const totalPendiente = pendientes.reduce((s, p) => s + p.monto, 0);
  const totalAnual     = pagos.reduce((s, p) => s + p.monto, 0);

  const rechazadosConObs = pagos.filter(
    p => p.estado_boleta === 'Rechazada' && p.observacion_rechazo,
  );

  const sortedPagos = [
    ...pagos.filter(p => p.estado !== 'Pagado'),
    ...pagos.filter(p => p.estado === 'Pagado'),
  ];

  const anio             = pagos.length > 0 ? getAnio(pagos[0]!) : new Date().getFullYear();
  const montoPrimero     = pagos[0]?.monto ?? 350;
  const institucionNombre = institucion?.nombre ?? 'IEP Virgen del Carmen - Las Viñas';

  // ── Skeleton ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6 animate-pulse">
        <div>
          <div className="h-7 w-48 rounded-xl bg-slate-200 mb-1.5" />
          <div className="h-4 w-64 rounded bg-slate-200" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="h-24 rounded-2xl bg-slate-200" />
          <div className="h-24 rounded-2xl bg-slate-200" />
          <div className="h-24 rounded-2xl bg-slate-200" />
        </div>
        <div className="h-16 rounded-2xl bg-slate-200" />
        <div className="h-72 rounded-2xl bg-slate-200" />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Estado de Pagos</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Año escolar {anio} · Mensualidad S/ {montoPrimero.toFixed(2)}
        </p>
      </div>

      {/* ── Error banner ── */}
      {errorMsg && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
          <AlertCircle className="size-5 text-red-600 shrink-0" />
          <p className="text-sm font-medium text-red-800 flex-1">{errorMsg}</p>
          <button onClick={() => setErrorMsg(null)} className="p-1 rounded-lg hover:bg-red-100">
            <X className="size-4 text-red-500" />
          </button>
        </div>
      )}

      {/* ── Rejection notification banner ── */}
      {rechazadosConObs.length > 0 && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
          <Bell className="size-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">
              {rechazadosConObs.length === 1
                ? 'Tienes un voucher rechazado'
                : `Tienes ${rechazadosConObs.length} vouchers rechazados`}
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              Revisa el motivo en cada cuota y vuelve a enviar tu comprobante corregido.
            </p>
          </div>
        </div>
      )}

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-50">
              <CheckCircle2 className="size-4 text-emerald-600" />
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pagado</p>
          </div>
          <p className="text-xl font-bold text-slate-900">S/ {totalPagado.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-0.5">{pagados.length} de {pagos.length} cuotas</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-amber-50">
              <Clock className="size-4 text-amber-600" />
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pendiente</p>
          </div>
          <p className="text-xl font-bold text-slate-900">S/ {totalPendiente.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-0.5">{pendientes.length} cuotas restantes</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-blue-50">
              <DollarSign className="size-4 text-blue-600" />
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total anual</p>
          </div>
          <p className="text-xl font-bold text-slate-900">S/ {totalAnual.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-0.5">{pagos.length} cuotas × S/ {montoPrimero}</p>
        </div>
      </div>

      {/* ── Bank info ── */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
        <CreditCard className="size-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-800">Información bancaria</p>
          <p className="text-sm text-blue-700 mt-0.5">
            Banco de la Nación · CTA: <strong>00 0000 00000000</strong> · A nombre de: {institucionNombre}
          </p>
          <p className="text-xs text-blue-600 mt-1">Sube tu voucher de pago para que Secretaría lo verifique en el sistema.</p>
        </div>
      </div>

      {/* ── Payments list ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="text-sm font-semibold text-slate-700">Historial de pagos {anio}</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {sortedPagos.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-slate-400 text-sm">No hay pagos registrados.</p>
            </div>
          ) : sortedPagos.map(row => {
            const payStatus = toPaymentStatus(row.estado);
            const pst       = PAY_STATUS[payStatus];
            const PayIcon   = pst.icon;

            let voucherKey: string | null = null;
            if      (row.estado_boleta === 'En_Revision') voucherKey = 'submitted';
            else if (row.estado_boleta === 'Aprobada')    voucherKey = 'approved';
            else if (row.estado_boleta === 'Rechazada')   voucherKey = 'rejected';
            const vst   = voucherKey ? VOUCHER_STATUS[voucherKey] : null;
            const VIcon = vst?.icon;

            const isRejected = row.estado_boleta === 'Rechazada';
            const hasVoucher = row.estado_boleta !== null;
            const mesLabel   = `${getNombreMes(row)} ${getAnio(row)}`;

            return (
              <div
                key={row.pago_id}
                className={`px-5 py-4 transition-colors ${
                  isRejected ? 'bg-red-50/40 border-l-2 border-red-400' : 'hover:bg-slate-50'
                }`}
              >
                {/* ── Header: icon · info + badges · amount ── */}
                <div className="flex items-start gap-3">
                  <div className={`flex size-10 items-center justify-center rounded-xl shrink-0 ${
                    isRejected ? 'bg-red-100' : 'bg-slate-100'
                  }`}>
                    <CreditCard className={`size-5 ${isRejected ? 'text-red-500' : 'text-slate-500'}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-800">{mesLabel}</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${pst.cls}`}>
                        <PayIcon className="size-3" /> {pst.label}
                      </span>
                      {vst && VIcon && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${vst.cls}`}>
                          <VIcon className="size-3" /> {vst.label}
                        </span>
                      )}
                    </div>
                    {row.fecha_pago && (
                      <p className="text-xs text-slate-400 mt-0.5">Pagado el {formatFecha(row.fecha_pago)}</p>
                    )}
                    {hasVoucher && !isRejected && (
                      <p className={`text-xs mt-0.5 ${
                        row.estado_boleta === 'Aprobada' ? 'text-emerald-600' : 'text-blue-600'
                      }`}>
                        {row.estado_boleta === 'Aprobada'
                          ? 'Voucher aprobado por Secretaría'
                          : 'Voucher enviado — en revisión'}
                      </p>
                    )}
                  </div>

                  <p className="text-sm font-bold text-slate-800 shrink-0">S/ {row.monto}</p>
                </div>

                {/* ── Rejection detail panel ── */}
                {isRejected && (
                  <div className="mt-3 rounded-xl border border-red-200 bg-white overflow-hidden">
                    <div className="flex items-center gap-2 px-3.5 py-2 bg-red-100/60 border-b border-red-200">
                      <AlertCircle className="size-4 text-red-600 shrink-0" />
                      <p className="text-xs font-semibold text-red-800">Voucher rechazado por Secretaría</p>
                    </div>
                    <div className="px-3.5 py-3">
                      {row.observacion_rechazo ? (
                        <>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-red-400 mb-1">
                            Motivo del rechazo
                          </p>
                          <p className="text-sm text-red-700 leading-relaxed">{row.observacion_rechazo}</p>
                        </>
                      ) : (
                        <p className="text-sm text-slate-500">
                          Secretaría no dejó una observación. Verifica tu comprobante y vuelve a enviarlo.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Actions ── */}
                <div className="flex items-center gap-2 flex-wrap mt-3">
                  {puedeReenviar(row) && (
                    <button
                      onClick={() => setReuploadModal(row.pago_id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-medium transition-colors"
                    >
                      <RefreshCw className="size-3.5" /> Volver a enviar
                    </button>
                  )}

                  {puedeSubirVoucher(row) && !puedeReenviar(row) && (
                    <button
                      onClick={() => { setUploadModal(row.pago_id); setSelectedFile(null); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-medium transition-colors"
                    >
                      <Upload className="size-3.5" /> Subir voucher
                    </button>
                  )}

                  {hasVoucher && (
                    <button
                      onClick={() => handleVerVoucher(row.pago_id)}
                      disabled={loadingVoucher === row.pago_id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-medium transition-colors border border-slate-200 disabled:opacity-50"
                    >
                      {loadingVoucher === row.pago_id ? (
                        <svg className="animate-spin size-3.5" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <svg className="size-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                      {loadingVoucher === row.pago_id ? 'Cargando…' : 'Ver / descargar comprobante'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Upload modal ── */}
      {uploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-800">Subir comprobante de pago</h3>
              <button
                onClick={() => { setUploadModal(null); setSelectedFile(null); }}
                className="p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="size-4 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600">
                Sube tu comprobante bancario. Secretaría lo verificará y actualizará tu estado.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={e => {
                  if (!e.target.files || e.target.files.length === 0) return;
                  setSelectedFile(e.target.files[0]!);
                }}
              />
              {selectedFile ? (
                <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <Paperclip className="size-4 text-slate-500 shrink-0" />
                  <p className="text-sm text-slate-700 flex-1 truncate font-medium">{selectedFile.name}</p>
                  <span className="text-xs text-slate-400 shrink-0">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                  <button onClick={() => setSelectedFile(null)} className="p-1 rounded-lg hover:bg-slate-200">
                    <X className="size-3.5 text-slate-500" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 rounded-2xl p-8 text-center transition-colors"
                >
                  <Upload className="size-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Haz clic para seleccionar</p>
                  <p className="text-xs text-slate-400 mt-2">JPG, PNG, PDF · Máx. 5 MB</p>
                </button>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => { setUploadModal(null); setSelectedFile(null); }}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUploadSubmit}
                  disabled={uploading || !selectedFile}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
                >
                  {uploading ? (
                    <>
                      <svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Enviando…
                    </>
                  ) : (
                    <><Upload className="size-4" />Enviar voucher</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Voucher lightbox ── */}
      {voucherView && (
        <VoucherLightbox
          url={voucherView.url}
          nombreArchivo={voucherView.nombreArchivo}
          onClose={() => setVoucherView(null)}
        />
      )}

      {/* ── Re-upload confirmation modal ── */}
      {reuploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-800">Volver a enviar voucher</h3>
              <button onClick={() => setReuploadModal(null)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="size-4 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600">
                ¿Confirmas que deseas reenviar el voucher? El estado cambiará a <strong>En revisión</strong> nuevamente.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setReuploadModal(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmarReenvio}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                >
                  Confirmar reenvío
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
