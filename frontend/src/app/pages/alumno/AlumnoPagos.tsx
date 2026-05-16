import { useState, useEffect, useRef } from 'react';
import {
  Upload, CheckCircle2, Clock, X, CreditCard, DollarSign,
  AlertCircle, Bell, MessageSquare, RefreshCw, Paperclip
} from 'lucide-react';
import { PAYMENTS } from '../../data/mockData';

// ─────────────────────────────────────────────────────────────────────────────
// 🔑 Corrección #7 — Los pagos se obtienen de la API, no del mock estático.
// En producción: GET /api/pagos?alumno_id={alumno_id_sesion}
// El alumno_id viene del JWT / sesión activa — NUNCA hardcodeado.
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_ALUMNO_ID = 'alm-uuid-carlos-mendoza-ramos';

// ── Tipos locales (antes en voucherStore.ts — eliminado en Corrección 1) ─────
export type VoucherStatus = 'submitted' | 'approved' | 'rejected';

interface VoucherEntry {
  id: string;
  paymentId: string;
  studentName: string;
  grade: string;
  month: string;
  amount: number;
  status: VoucherStatus;
  observation: string | null;
  submittedAt: string;
  initials: string;
}

type ApiPayment = typeof PAYMENTS[number];

async function fetchPagosAlumno(_alumnoId: string): Promise<ApiPayment[]> {
  // En producción:
  // const res = await fetch(`/api/pagos?alumno_id=${_alumnoId}`);
  // if (!res.ok) throw new Error('Error al cargar los pagos');
  // return res.json();
  await new Promise(r => setTimeout(r, 0));
  return PAYMENTS.map(p => ({
    ...p,
    id: `pago-uuid-2025-${p.month.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-')}`,
  }));
}

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

export default function AlumnoPagos() {
  const [payments, setPayments]         = useState<ApiPayment[]>([]);
  const [voucherData, setVoucherData]   = useState<Record<string, VoucherEntry>>({});
  const [errorMsg, setErrorMsg]         = useState<string | null>(null);

  // Upload modal
  const [uploadModal, setUploadModal]   = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading]       = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Observation modal
  const [obsModal, setObsModal] = useState<{ id: string; month: string } | null>(null);

  // Re-upload confirmation modal
  const [reuploadModal, setReuploadModal] = useState<string | null>(null);

  // ── Carga inicial: pagos + vouchers del alumno ────────────────────────────
  useEffect(() => {
    fetchPagosAlumno(MOCK_ALUMNO_ID)
      .then(data => {
        setPayments(data);
        // En producción: cargar vouchers reales del alumno
        // fetch(`/api/boletas?alumno_id=${MOCK_ALUMNO_ID}`)
        //   .then(r => r.json())
        //   .then(vouchers => setVoucherData(
        //     Object.fromEntries(vouchers.map((v: any) => [v.pago_id, {
        //       id: v.id, paymentId: v.pago_id,
        //       studentName: v.alumno_nombre, grade: v.grado,
        //       month: v.mes, amount: v.monto,
        //       status: v.estado === 'En_Revision' ? 'submitted'
        //             : v.estado === 'Aprobada'    ? 'approved'
        //             : 'rejected',
        //       observation: v.observacion,
        //       submittedAt: v.fecha_envio,
        //       initials: v.iniciales,
        //     }]))
        //   ));
      })
      .catch(err => {
        setErrorMsg('No se pudieron cargar los datos de pagos.');
        console.error('Error al cargar pagos:', err);
      });
  }, []);

  const paid    = payments.filter(p => p.status === 'paid');
  const pending = payments.filter(p => p.status !== 'paid');
  const totalPaid    = paid.reduce((s, p) => s + p.amount, 0);
  const totalPending = pending.reduce((s, p) => s + p.amount, 0);

  const rejectedWithObs = Object.values(voucherData).filter(
    v => v.status === 'rejected' && v.observation
  );

  function handleFileChange(files: FileList | null) {
    if (!files || files.length === 0) return;
    setSelectedFile(files[0]);
  }

  // ── Corrección 1: subida real con multipart/form-data ────────────────────
  async function handleUploadSubmit() {
    if (!uploadModal || !selectedFile) return;
    const payment = payments.find(p => p.id === uploadModal);
    if (!payment) return;
    setUploading(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append('pago_id', uploadModal);
      formData.append('archivo', selectedFile); // File del input

      // En producción: descommentar la llamada real
      // const res = await fetch('/api/boletas', { method: 'POST', body: formData });
      // if (!res.ok) throw new Error('Error al subir el voucher');
      // const saved = await res.json();

      // Mock: simular latencia de red
      await new Promise(r => setTimeout(r, 1200));

      const newEntry: VoucherEntry = {
        id: `vc-${uploadModal}`,
        paymentId: uploadModal,
        studentName: 'Carlos Mendoza Ramos',
        grade: '3° A',
        month: `${payment.month} ${payment.year}`,
        amount: payment.amount,
        status: 'submitted',
        observation: null,
        submittedAt: new Date().toLocaleDateString('es-PE'),
        initials: 'CM',
      };
      setVoucherData(prev => ({ ...prev, [uploadModal]: newEntry }));
      setUploadModal(null);
      setSelectedFile(null);
    } catch {
      setErrorMsg('No se pudo subir el voucher. Intenta nuevamente.');
    } finally {
      setUploading(false);
    }
  }

  // ── Reenvío de voucher rechazado ─────────────────────────────────────────
  async function handleReupload(paymentId: string) {
    try {
      // En producción:
      // const res = await fetch(`/api/boletas/${paymentId}/resubmit`, { method: 'POST' });
      // if (!res.ok) throw new Error('Error al reenviar');

      // Mock
      await new Promise(r => setTimeout(r, 600));

      setVoucherData(prev => {
        if (!prev[paymentId]) return prev;
        return {
          ...prev,
          [paymentId]: {
            ...prev[paymentId],
            status: 'submitted',
            observation: null,
            submittedAt: new Date().toLocaleDateString('es-PE'),
          },
        };
      });
      setReuploadModal(null);
    } catch {
      setErrorMsg('No se pudo reenviar el voucher. Intenta nuevamente.');
    }
  }

  const sortedPayments = [
    ...payments.filter(p => p.status !== 'paid'),
    ...payments.filter(p => p.status === 'paid'),
  ];

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Estado de Pagos</h1>
        <p className="text-sm text-slate-500 mt-0.5">Año escolar 2025 · Mensualidad S/ 350.00</p>
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

      {/* Rejection notification banner */}
      {rejectedWithObs.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-red-600 shrink-0" />
            <p className="text-sm font-semibold text-red-800">
              {rejectedWithObs.length === 1
                ? 'Un voucher fue rechazado con observación'
                : `${rejectedWithObs.length} vouchers fueron rechazados con observaciones`}
            </p>
          </div>
          {rejectedWithObs.map(v => (
            <div key={v.paymentId} className="ml-6 bg-white border border-red-200 rounded-xl px-3 py-2">
              <p className="text-xs font-medium text-red-700">{v.month}:</p>
              <p className="text-xs text-red-600 mt-0.5">{v.observation}</p>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-50">
              <CheckCircle2 className="size-4 text-emerald-600" />
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pagado</p>
          </div>
          <p className="text-xl font-bold text-slate-900">S/ {totalPaid.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-0.5">{paid.length} de 12 cuotas</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-amber-50">
              <Clock className="size-4 text-amber-600" />
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pendiente</p>
          </div>
          <p className="text-xl font-bold text-slate-900">S/ {totalPending.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-0.5">{pending.length} cuotas restantes</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-blue-50">
              <DollarSign className="size-4 text-blue-600" />
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total anual</p>
          </div>
          <p className="text-xl font-bold text-slate-900">S/ 4,200</p>
          <p className="text-xs text-slate-400 mt-0.5">12 cuotas × S/ 350</p>
        </div>
      </div>

      {/* Payment info */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
        <CreditCard className="size-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-800">Información bancaria</p>
          <p className="text-sm text-blue-700 mt-0.5">
            Banco de la Nación · CTA: <strong>00 0000 00000000</strong> · A nombre de: I.E. San José de Calasanz
          </p>
          <p className="text-xs text-blue-600 mt-1">Sube tu voucher de pago para que Secretaría lo verifique en el sistema.</p>
        </div>
      </div>

      {/* Payments list */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="text-sm font-semibold text-slate-700">Historial de pagos 2025</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {sortedPayments.map(payment => {
            const pst     = PAY_STATUS[payment.status];
            const PayIcon = pst.icon;
            const voucher = voucherData[payment.id];
            const vst     = voucher ? VOUCHER_STATUS[voucher.status] : null;
            const VIcon   = vst?.icon;
            const isRejected = voucher?.status === 'rejected';

            return (
              <div key={payment.id} className="px-5 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Icon */}
                  <div className={`flex size-10 items-center justify-center rounded-xl shrink-0 ${
                    isRejected ? 'bg-red-100' : 'bg-slate-100'
                  }`}>
                    <CreditCard className={`size-5 ${isRejected ? 'text-red-500' : 'text-slate-500'}`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{payment.month} {payment.year}</p>
                    {payment.paidDate && (
                      <p className="text-xs text-slate-400">Pagado el {payment.paidDate}</p>
                    )}
                    {voucher && (
                      <p className={`text-xs mt-0.5 ${
                        voucher.status === 'approved' ? 'text-emerald-600' :
                        voucher.status === 'rejected' ? 'text-red-600' :
                        'text-blue-600'
                      }`}>
                        {voucher.status === 'approved' ? `Aprobado el ${voucher.submittedAt}` :
                         voucher.status === 'rejected' ? 'Voucher rechazado por Secretaría' :
                         `Voucher enviado el ${voucher.submittedAt} — en revisión`}
                      </p>
                    )}
                  </div>

                  {/* Amount */}
                  <p className="text-sm font-bold text-slate-800">S/ {payment.amount}</p>

                  {/* Payment status badge */}
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${pst.cls}`}>
                    <PayIcon className="size-3" /> {pst.label}
                  </span>

                  {/* Voucher status badge */}
                  {vst && VIcon && (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${vst.cls}`}>
                      <VIcon className="size-3" /> {vst.label}
                    </span>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {payment.status !== 'paid' && !voucher && (
                      <button
                        onClick={() => { setUploadModal(payment.id); setSelectedFile(null); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-medium transition-colors"
                      >
                        <Upload className="size-3.5" /> Subir voucher
                      </button>
                    )}

                    {isRejected && (
                      <button
                        onClick={() => setReuploadModal(payment.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-medium transition-colors"
                      >
                        <RefreshCw className="size-3.5" /> Volver a enviar
                      </button>
                    )}

                    {voucher && (
                      <button
                        onClick={() => setObsModal({ id: payment.id, month: `${payment.month} ${payment.year}` })}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-medium transition-colors border border-slate-200"
                      >
                        <MessageSquare className="size-3.5" />
                        {voucher.observation ? 'Ver observación' : 'Sin observaciones'}
                        {voucher.observation && isRejected && (
                          <span className="size-2 rounded-full bg-red-500 ml-0.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {isRejected && voucher.observation && (
                  <div className="mt-3 ml-13 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                    <Bell className="size-3.5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700">{voucher.observation}</p>
                  </div>
                )}
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
              <button onClick={() => { setUploadModal(null); setSelectedFile(null); }} className="p-1.5 rounded-lg hover:bg-slate-100">
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
                onChange={e => handleFileChange(e.target.files)}
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
                    <><svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Enviando…</>
                  ) : (
                    <><Upload className="size-4" />Enviar voucher</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Observation view modal ── */}
      {obsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-800">Observación — {obsModal.month}</h3>
              <button onClick={() => setObsModal(null)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="size-4 text-slate-500" />
              </button>
            </div>
            <div className="p-6">
              {voucherData[obsModal.id]?.observation ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="size-4 text-amber-600" />
                    <p className="text-sm font-semibold text-amber-800">Observación de Secretaría:</p>
                  </div>
                  <p className="text-sm text-amber-800 leading-relaxed">
                    {voucherData[obsModal.id].observation}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center py-8 text-center">
                  <CheckCircle2 className="size-10 text-emerald-300 mb-3" />
                  <p className="text-slate-600 font-medium">Sin observaciones</p>
                  <p className="text-sm text-slate-400 mt-1">No hay comentarios de Secretaría para este voucher.</p>
                </div>
              )}
              <button
                onClick={() => setObsModal(null)}
                className="mt-4 w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
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
                  onClick={() => handleReupload(reuploadModal)}
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
