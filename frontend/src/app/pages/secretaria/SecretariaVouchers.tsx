import { useState, useEffect } from 'react';
import {
  CheckCircle2, X, Eye, Clock, Receipt, ZoomIn,
  MessageSquare, AlertCircle, Bell
} from 'lucide-react';
import { PENDING_VOUCHERS } from '../../data/mockData';
import { toDbStatus, toFrontStatus } from '../../utils/voucherStatusMapper';

// 🔑 ID simulado del revisor autenticado — en producción viene del JWT
const MOCK_REVISOR_ID = 'sec-uuid-revisor-activo';

type FilterType = 'all' | 'pending' | 'approved' | 'rejected';

interface ExtVoucher {
  id: string;
  paymentId: string | null;
  studentName: string;
  grade: string;
  month: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  observation: string | null;
  uploadDate: string;
  initials: string;
  source: 'mock' | 'student';
}

const STATUS_CFG = {
  pending:  { label: 'Pendiente', icon: Clock,         cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { label: 'Aprobado',  icon: CheckCircle2,  cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Rechazado', icon: AlertCircle,   cls: 'bg-red-50 text-red-700 border-red-200' },
};

function buildMockVouchers(): ExtVoucher[] {
  return PENDING_VOUCHERS.map(v => ({
    id: v.id,
    paymentId: null,
    studentName: v.studentName,
    grade: v.grade,
    month: v.month,
    amount: v.amount,
    status: 'pending' as const,
    observation: null,
    uploadDate: v.uploadDate,
    initials: v.initials,
    source: 'mock' as const,
  }));
}

export default function SecretariaVouchers() {
  const [mockVouchers,    setMockVouchers]    = useState<ExtVoucher[]>(buildMockVouchers);
  const [studentVouchers, setStudentVouchers] = useState<ExtVoucher[]>([]);
  const [filter,          setFilter]          = useState<FilterType>('all');
  const [errorMsg,        setErrorMsg]        = useState<string | null>(null);

  // Observation modal
  const [obsModal,  setObsModal]  = useState<string | null>(null);
  const [obsText,   setObsText]   = useState('');

  // Detail modal
  const [detailModal, setDetailModal] = useState<ExtVoucher | null>(null);

  // Reject-with-obs modal
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectObs,   setRejectObs]   = useState('');

  // ── Corrección 1: cargar vouchers del backend (en producción) ─────────────
  useEffect(() => {
    // En producción: reemplazar con fetch real
    // fetch('/api/boletas')
    //   .then(r => r.json())
    //   .then(data => setStudentVouchers(data.map((e: any) => ({
    //     id:          e.id,
    //     paymentId:   e.pago_id,
    //     studentName: e.alumno_nombre,
    //     grade:       e.grado,
    //     month:       e.mes,
    //     amount:      e.monto,
    //     status:      toFrontStatus(e.estado) as 'pending' | 'approved' | 'rejected',
    //     observation: e.observacion,
    //     uploadDate:  e.fecha_envio,
    //     initials:    e.iniciales,
    //     source:      'student' as const,
    //   }))))
    //   .catch(() => setErrorMsg('No se pudieron cargar los vouchers.'));
    void toFrontStatus; // utilizado al leer respuesta real de la API
    setStudentVouchers([]);
  }, []);

  const allVouchers: ExtVoucher[] = [...studentVouchers, ...mockVouchers];
  const filtered = filter === 'all' ? allVouchers : allVouchers.filter(v => v.status === filter);

  const pendingCount  = allVouchers.filter(v => v.status === 'pending').length;
  const approvedCount = allVouchers.filter(v => v.status === 'approved').length;
  const rejectedCount = allVouchers.filter(v => v.status === 'rejected').length;

  function updateVoucher(id: string, updates: Partial<ExtVoucher>) {
    setMockVouchers(prev    => prev.map(v => v.id === id ? { ...v, ...updates } : v));
    setStudentVouchers(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));
    if (detailModal?.id === id) setDetailModal(prev => prev ? { ...prev, ...updates } : null);
  }

  // ── Corrección 1: aprobar con llamada API + optimistic update ─────────────
  async function handleApprove(voucher: ExtVoucher) {
    const prevMock    = [...mockVouchers];
    const prevStudent = [...studentVouchers];
    updateVoucher(voucher.id, { status: 'approved' });

    try {
      // En producción: descommentar la llamada real
      // const res = await fetch('/api/boletas/revisar', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     boleta_id:    voucher.id,
      //     revisor_id:   MOCK_REVISOR_ID,
      //     nuevo_estado: toDbStatus('approved'), // → 'Aprobada'
      //     observacion:  null,
      //   }),
      // });
      // if (!res.ok) throw new Error('Error al aprobar');
      void toDbStatus; void MOCK_REVISOR_ID;

      // Mock: simular latencia
      await new Promise(r => setTimeout(r, 300));
    } catch {
      // Revertir si la API falla
      setMockVouchers(prevMock);
      setStudentVouchers(prevStudent);
      if (detailModal?.id === voucher.id) setDetailModal(voucher);
      setErrorMsg('No se pudo aprobar el voucher. Intenta nuevamente.');
    }
  }

  // ── Corrección 1: rechazar con llamada API + optimistic update ────────────
  async function handleRejectConfirm(id: string) {
    const obs         = rejectObs.trim() || null;
    const prevMock    = [...mockVouchers];
    const prevStudent = [...studentVouchers];
    const prevDetail  = detailModal ? { ...detailModal } : null;

    updateVoucher(id, { status: 'rejected', observation: obs });
    setRejectModal(null);
    setRejectObs('');

    try {
      // En producción:
      // const res = await fetch('/api/boletas/revisar', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     boleta_id:    id,
      //     revisor_id:   MOCK_REVISOR_ID,
      //     nuevo_estado: toDbStatus('rejected'), // → 'Rechazada'
      //     observacion:  obs,
      //   }),
      // });
      // if (!res.ok) throw new Error('Error al rechazar');

      // Mock
      await new Promise(r => setTimeout(r, 300));
    } catch {
      setMockVouchers(prevMock);
      setStudentVouchers(prevStudent);
      if (prevDetail) setDetailModal(prevDetail);
      setErrorMsg('No se pudo rechazar el voucher. Intenta nuevamente.');
    }
  }

  // ── Corrección 1: guardar observación con llamada API ────────────────────
  async function handleSaveObs(id: string) {
    const obs         = obsText.trim() || null;
    const voucher     = allVouchers.find(v => v.id === id);
    const prevMock    = [...mockVouchers];
    const prevStudent = [...studentVouchers];

    updateVoucher(id, { observation: obs });
    setObsModal(null);
    setObsText('');

    if (voucher?.paymentId) {
      try {
        // En producción:
        // await fetch('/api/boletas/revisar', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({
        //     boleta_id:    id,
        //     revisor_id:   MOCK_REVISOR_ID,
        //     nuevo_estado: toDbStatus(voucher.status === 'approved' ? 'approved' : 'rejected'),
        //     observacion:  obs,
        //   }),
        // });

        await new Promise(r => setTimeout(r, 300));
      } catch {
        setMockVouchers(prevMock);
        setStudentVouchers(prevStudent);
        setErrorMsg('No se pudo guardar la observación. Intenta nuevamente.');
      }
    }
  }

  function openObsModal(voucher: ExtVoucher) {
    setObsModal(voucher.id);
    setObsText(voucher.observation ?? '');
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Validación de Vouchers</h1>
        <p className="text-sm text-slate-500 mt-0.5">Verifica los comprobantes de pago enviados por las familias</p>
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

      {/* Summary filter buttons */}
      <div className="grid grid-cols-3 gap-4">
        <button
          onClick={() => setFilter(filter === 'pending' ? 'all' : 'pending')}
          className={`rounded-2xl p-4 text-center border transition-all ${filter === 'pending' ? 'ring-2 ring-amber-400 border-amber-300' : 'border-amber-200'} bg-amber-50`}
        >
          <p className="text-2xl font-bold text-amber-700">{pendingCount}</p>
          <p className="text-sm font-medium text-amber-600">Pendientes</p>
        </button>
        <button
          onClick={() => setFilter(filter === 'approved' ? 'all' : 'approved')}
          className={`rounded-2xl p-4 text-center border transition-all ${filter === 'approved' ? 'ring-2 ring-emerald-400 border-emerald-300' : 'border-emerald-200'} bg-emerald-50`}
        >
          <p className="text-2xl font-bold text-emerald-700">{approvedCount}</p>
          <p className="text-sm font-medium text-emerald-600">Aprobados</p>
        </button>
        <button
          onClick={() => setFilter(filter === 'rejected' ? 'all' : 'rejected')}
          className={`rounded-2xl p-4 text-center border transition-all ${filter === 'rejected' ? 'ring-2 ring-red-400 border-red-300' : 'border-red-200'} bg-red-50`}
        >
          <p className="text-2xl font-bold text-red-700">{rejectedCount}</p>
          <p className="text-sm font-medium text-red-600">Rechazados</p>
        </button>
      </div>

      {/* Voucher cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(voucher => {
          const st = STATUS_CFG[voucher.status];
          const StatusIcon = st.icon;
          const hasObs = !!voucher.observation;
          return (
            <div
              key={voucher.id}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${
                voucher.status === 'pending'  ? 'border-amber-200' :
                voucher.status === 'approved' ? 'border-emerald-200' :
                'border-red-200'
              }`}
            >
              {/* Voucher image area */}
              <div className="h-32 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center relative">
                <div className="text-center">
                  <Receipt className="size-9 text-slate-400 mx-auto mb-1" />
                  <p className="text-xs text-slate-500 font-medium">Comprobante</p>
                  <p className="text-xs text-slate-400">{voucher.month}</p>
                </div>
                <button
                  onClick={() => setDetailModal(voucher)}
                  className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-white/90 rounded-lg text-xs text-slate-600 hover:bg-white shadow-sm"
                >
                  <ZoomIn className="size-3" /> Ver
                </button>
                {voucher.source === 'student' && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 bg-blue-600 text-white text-[10px] font-semibold rounded-full">
                    Alumno
                  </span>
                )}
              </div>

              <div className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{voucher.studentName}</p>
                    <p className="text-xs text-slate-400">{voucher.grade} · {voucher.month}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border shrink-0 ${st.cls}`}>
                    <StatusIcon className="size-3" /> {st.label}
                  </span>
                </div>

                {/* Amount + date */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">Monto declarado</p>
                    <p className="text-base font-bold text-slate-800">S/ {voucher.amount}.00</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Enviado el</p>
                    <p className="text-xs font-medium text-slate-600">{voucher.uploadDate}</p>
                  </div>
                </div>

                {/* Observation preview */}
                {hasObs && (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    <Bell className="size-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 leading-snug line-clamp-2">{voucher.observation}</p>
                  </div>
                )}

                {/* Action buttons */}
                {voucher.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(voucher)}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors"
                    >
                      <CheckCircle2 className="size-3.5" /> Aprobar
                    </button>
                    <button
                      onClick={() => { setRejectModal(voucher.id); setRejectObs(voucher.observation ?? ''); }}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-medium transition-colors"
                    >
                      <X className="size-3.5" /> Rechazar
                    </button>
                  </div>
                )}

                {voucher.status === 'approved' && (
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">
                    <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                    <p className="text-xs text-emerald-700 font-medium">Pago confirmado</p>
                  </div>
                )}

                {voucher.status === 'rejected' && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-2.5">
                    <AlertCircle className="size-4 text-red-600 shrink-0" />
                    <p className="text-xs text-red-700 font-medium">Rechazado — Alumno notificado</p>
                  </div>
                )}

                {/* Obs button for non-pending */}
                {voucher.status !== 'pending' && (
                  <button
                    onClick={() => openObsModal(voucher)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-medium transition-colors"
                  >
                    <MessageSquare className="size-3.5" />
                    {voucher.observation ? 'Editar observación' : 'Añadir observación'}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full flex flex-col items-center py-16 text-center">
            <CheckCircle2 className="size-10 text-emerald-300 mb-3" />
            <p className="text-slate-600 font-medium">
              {filter === 'pending' ? 'No hay vouchers pendientes' : 'No hay registros en esta categoría'}
            </p>
            <p className="text-sm text-slate-400 mt-1">¡Todo al día!</p>
          </div>
        )}
      </div>

      {/* ── Detail modal ── */}
      {detailModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-800">Detalle del voucher</h3>
              <button onClick={() => setDetailModal(null)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="size-4 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="h-44 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <Receipt className="size-12 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 font-medium">Comprobante de depósito</p>
                  <p className="text-xs text-slate-400">{detailModal.studentName}</p>
                  <p className="text-lg font-bold text-slate-700 mt-1">S/ {detailModal.amount}.00</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                {[
                  ['Alumno', detailModal.studentName],
                  ['Grado',  detailModal.grade],
                  ['Mes',    detailModal.month],
                  ['Monto',  `S/ ${detailModal.amount}.00`],
                  ['Enviado el', detailModal.uploadDate],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-2 border-b border-slate-100 last:border-0">
                    <span className="text-slate-500">{k}</span>
                    <span className="font-semibold text-slate-800">{v}</span>
                  </div>
                ))}
                {detailModal.observation && (
                  <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <p className="text-xs font-semibold text-amber-700 mb-1">Observación:</p>
                    <p className="text-sm text-amber-800">{detailModal.observation}</p>
                  </div>
                )}
              </div>
              {detailModal.status === 'pending' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => { setRejectModal(detailModal.id); setRejectObs(detailModal.observation ?? ''); setDetailModal(null); }}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 text-sm font-medium"
                  >
                    Rechazar
                  </button>
                  <button
                    onClick={() => { handleApprove(detailModal); setDetailModal(null); }}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium"
                  >
                    Confirmar pago
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Observation modal ── */}
      {obsModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-800">Añadir observación</h3>
              <button onClick={() => { setObsModal(null); setObsText(''); }} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="size-4 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600">
                La observación será visible para el alumno en su portal de pagos.
              </p>
              <textarea
                value={obsText}
                onChange={e => setObsText(e.target.value)}
                rows={4}
                placeholder="Ej: El monto no coincide con la cuota mensual. Por favor adjunte el comprobante correcto..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => { setObsModal(null); setObsText(''); }}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleSaveObs(obsModal)}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                >
                  Guardar observación
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject with observation modal ── */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-800">Rechazar voucher</h3>
              <button onClick={() => { setRejectModal(null); setRejectObs(''); }} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="size-4 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600">
                Opcionalmente, añade una observación para que el alumno sepa el motivo del rechazo.
              </p>
              <textarea
                value={rejectObs}
                onChange={e => setRejectObs(e.target.value)}
                rows={3}
                placeholder="Motivo del rechazo (opcional)..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => { setRejectModal(null); setRejectObs(''); }}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleRejectConfirm(rejectModal)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                >
                  Confirmar rechazo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Eye icon fallback ── */}
      {false && <Eye className="hidden" />}
    </div>
  );
}
