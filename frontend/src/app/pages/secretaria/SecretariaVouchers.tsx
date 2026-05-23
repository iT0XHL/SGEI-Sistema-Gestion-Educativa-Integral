// ============================================================
//  SecretariaVouchers.tsx — Validación de vouchers de pago.
//  Conectado 100% al backend. Sin mock data.
//  Roles permitidos: Admin, Secretaria.
// ============================================================
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import {
  CheckCircle2, X, Eye, Clock, Receipt, ZoomIn,
  MessageSquare, AlertCircle, Search, Loader2, ExternalLink,
} from 'lucide-react';
import {
  secretariaApi,
  type BoletaDTO,
  type EstadoRevision,
} from '../../../lib/api/secretaria.api';

// ── Constantes ────────────────────────────────────────────────
const MESES = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

type FilterEstado = 'all' | EstadoRevision;

const STATUS_CFG = {
  En_Revision: { label: 'Pendiente', icon: Clock,        cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  Aprobada:    { label: 'Aprobado',  icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  Rechazada:   { label: 'Rechazado', icon: AlertCircle,  cls: 'bg-red-50 text-red-700 border-red-200' },
} satisfies Record<EstadoRevision, { label: string; icon: React.ElementType; cls: string }>;

// ── Helpers ───────────────────────────────────────────────────
function nombreAlumno(b: BoletaDTO) {
  return `${b.pago.alumno.nombres} ${b.pago.alumno.apellido_paterno}`;
}

function gradoSeccion(b: BoletaDTO) {
  const s = b.pago.alumno.seccion;
  return `${s.grado.nombre} "${s.nombre}"`;
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

// ── Componente principal ──────────────────────────────────────
export default function SecretariaVouchers() {
  const [searchParams] = useSearchParams();
  const initialQ      = searchParams.get('q') ?? '';
  const initialFilter = (searchParams.get('estado') as FilterEstado | null) ?? 'all';

  const [boletas,      setBoletas]      = useState<BoletaDTO[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [fetchError,   setFetchError]   = useState('');
  const [filter,       setFilter]       = useState<FilterEstado>(initialFilter);
  const [search,       setSearch]       = useState(initialQ);
  const [savingId,     setSavingId]     = useState<string | null>(null);
  const [actionError,  setActionError]  = useState('');

  // Modal detalle
  const [detailModal, setDetailModal] = useState<BoletaDTO | null>(null);
  const [loadingUrl,  setLoadingUrl]  = useState(false);
  const [archivoUrl,  setArchivoUrl]  = useState<string | null>(null);

  // Modal rechazar
  const [rejectTarget, setRejectTarget] = useState<BoletaDTO | null>(null);
  const [rejectObs,    setRejectObs]    = useState('');
  const [rejectError,  setRejectError]  = useState('');

  // ── Carga inicial ─────────────────────────────────────────────
  useEffect(() => {
    async function cargar() {
      setLoading(true);
      setFetchError('');
      try {
        const data = await secretariaApi.listarBoletas();
        setBoletas(data);
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : 'No se pudieron cargar los vouchers.');
      } finally {
        setLoading(false);
      }
    }
    cargar();
  }, []);

  // ── Filtrado ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return boletas.filter(b => {
      const matchEstado  = filter === 'all' || b.estado_revision === filter;
      const matchSearch  = !q
        || nombreAlumno(b).toLowerCase().includes(q)
        || b.pago.concepto.nombre.toLowerCase().includes(q)
        || gradoSeccion(b).toLowerCase().includes(q);
      return matchEstado && matchSearch;
    });
  }, [boletas, filter, search]);

  const pendientes = boletas.filter(b => b.estado_revision === 'En_Revision').length;
  const aprobados  = boletas.filter(b => b.estado_revision === 'Aprobada').length;
  const rechazados = boletas.filter(b => b.estado_revision === 'Rechazada').length;

  // ── Actualizar boleta en estado local ─────────────────────────
  function patchBoleta(id: string, patch: Partial<BoletaDTO>) {
    setBoletas(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b));
    if (detailModal?.id === id) setDetailModal(prev => prev ? { ...prev, ...patch } : null);
    if (rejectTarget?.id === id) setRejectTarget(prev => prev ? { ...prev, ...patch } : null);
  }

  // ── Aprobar voucher ──────────────────────────────────────────
  async function handleAprobar(boleta: BoletaDTO) {
    if (savingId) return;
    const prev = { ...boleta };
    patchBoleta(boleta.id, { estado_revision: 'Aprobada' });
    setSavingId(boleta.id);
    setActionError('');
    try {
      const updated = await secretariaApi.revisarBoleta({
        boleta_id:   boleta.id,
        nuevo_estado: 'Aprobada',
      });
      patchBoleta(boleta.id, updated);
      if (detailModal?.id === boleta.id) setDetailModal(null);
    } catch (err) {
      patchBoleta(boleta.id, prev);
      setActionError(err instanceof Error ? err.message : 'Error al aprobar el voucher.');
    } finally {
      setSavingId(null);
    }
  }

  // ── Abrir modal rechazar ──────────────────────────────────────
  function openRejectModal(boleta: BoletaDTO) {
    setRejectTarget(boleta);
    setRejectObs('');
    setRejectError('');
    if (detailModal?.id === boleta.id) setDetailModal(null);
  }

  // ── Confirmar rechazo ─────────────────────────────────────────
  async function handleRechazarConfirm() {
    if (!rejectTarget || savingId) return;
    const obs = rejectObs.trim();
    if (obs.length < 5) {
      setRejectError('El motivo del rechazo debe tener al menos 5 caracteres.');
      return;
    }
    const prev = { ...rejectTarget };
    patchBoleta(rejectTarget.id, { estado_revision: 'Rechazada', observacion_rechazo: obs });
    setSavingId(rejectTarget.id);
    setRejectError('');
    const targetId = rejectTarget.id;
    setRejectTarget(null);
    try {
      const updated = await secretariaApi.revisarBoleta({
        boleta_id:            targetId,
        nuevo_estado:         'Rechazada',
        observacion_rechazo:  obs,
      });
      patchBoleta(targetId, updated);
    } catch (err) {
      patchBoleta(targetId, prev);
      setActionError(err instanceof Error ? err.message : 'Error al rechazar el voucher.');
    } finally {
      setSavingId(null);
    }
  }

  // ── Ver archivo ───────────────────────────────────────────────
  async function handleVerArchivo(boleta: BoletaDTO) {
    setDetailModal(boleta);
    setArchivoUrl(null);
    setLoadingUrl(true);
    try {
      const { url } = await secretariaApi.getArchivoUrl(boleta.id);
      setArchivoUrl(url);
    } catch {
      setArchivoUrl(null);
    } finally {
      setLoadingUrl(false);
    }
  }

  // ── Loading ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-slate-200 rounded" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-200 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-56 bg-slate-200 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500 mb-1">Panel de secretaría</p>
          <h1 className="text-2xl font-bold text-slate-900">Validación de Vouchers</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Verifica los comprobantes de pago enviados por las familias
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="search"
            placeholder="Buscar alumno, concepto…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 w-56"
          />
        </div>
      </div>

      {/* Error de carga */}
      {fetchError && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
          <AlertCircle className="size-5 text-red-600 shrink-0" />
          <p className="text-sm text-red-800 flex-1">{fetchError}</p>
          <button onClick={() => setFetchError('')} className="p-1 rounded-lg hover:bg-red-100">
            <X className="size-4 text-red-500" />
          </button>
        </div>
      )}

      {/* Error de acción (aprobar/rechazar) */}
      {actionError && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
          <AlertCircle className="size-5 text-red-600 shrink-0" />
          <p className="text-sm text-red-800 flex-1">{actionError}</p>
          <button onClick={() => setActionError('')} className="p-1 rounded-lg hover:bg-red-100">
            <X className="size-4 text-red-500" />
          </button>
        </div>
      )}

      {/* Stats + filtros */}
      <div className="grid grid-cols-3 gap-4">
        {([
          { estado: 'En_Revision' as EstadoRevision, count: pendientes,  label: 'Pendientes',  base: 'bg-amber-50 border-amber-200',   active: 'ring-2 ring-amber-400', num: 'text-amber-700',   sub: 'text-amber-600' },
          { estado: 'Aprobada'    as EstadoRevision, count: aprobados,   label: 'Aprobados',   base: 'bg-emerald-50 border-emerald-200', active: 'ring-2 ring-emerald-400', num: 'text-emerald-700', sub: 'text-emerald-600' },
          { estado: 'Rechazada'   as EstadoRevision, count: rechazados,  label: 'Rechazados',  base: 'bg-red-50 border-red-200',        active: 'ring-2 ring-red-400',    num: 'text-red-700',    sub: 'text-red-600' },
        ]).map(s => (
          <button
            key={s.estado}
            onClick={() => setFilter(f => f === s.estado ? 'all' : s.estado)}
            className={`rounded-2xl p-4 text-center border transition-all ${s.base} ${filter === s.estado ? s.active : ''}`}
          >
            <p className={`text-2xl font-bold ${s.num}`}>{s.count}</p>
            <p className={`text-sm font-medium ${s.sub}`}>{s.label}</p>
          </button>
        ))}
      </div>

      {/* Grid de cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(boleta => {
          const st   = STATUS_CFG[boleta.estado_revision];
          const Icon = st.icon;
          const nombre  = nombreAlumno(boleta);
          const grado   = gradoSeccion(boleta);
          const monto   = Number(boleta.pago.monto);
          const isSaving = savingId === boleta.id;

          return (
            <div
              key={boleta.id}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${
                boleta.estado_revision === 'En_Revision' ? 'border-amber-200' :
                boleta.estado_revision === 'Aprobada'    ? 'border-emerald-200' :
                'border-red-200'
              }`}
            >
              {/* Zona imagen / archivo */}
              <div className="h-32 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center relative">
                <div className="text-center">
                  <Receipt className="size-9 text-slate-400 mx-auto mb-1" />
                  <p className="text-xs text-slate-500 font-medium">
                    {boleta.pago.concepto.nombre}
                  </p>
                  <p className="text-xs text-slate-400">
                    {boleta.pago.mes ? MESES[boleta.pago.mes] : '—'}
                  </p>
                </div>
                <button
                  onClick={() => handleVerArchivo(boleta)}
                  className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-white/90 rounded-lg text-xs text-slate-600 hover:bg-white shadow-sm transition-colors"
                >
                  <ZoomIn className="size-3" /> Ver
                </button>
                {boleta.nombre_archivo && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 bg-teal-600 text-white text-[10px] font-semibold rounded-full">
                    Archivo
                  </span>
                )}
              </div>

              <div className="p-4 space-y-3">
                {/* Info alumno + estado */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex size-8 items-center justify-center rounded-full bg-teal-100 text-teal-700 text-xs font-semibold shrink-0">
                      {initials(nombre)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{nombre}</p>
                      <p className="text-xs text-slate-400 truncate">{grado}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border shrink-0 ${st.cls}`}>
                    <Icon className="size-3" /> {st.label}
                  </span>
                </div>

                {/* Monto y fecha */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">Monto</p>
                    <p className="text-base font-bold text-slate-800">S/ {monto.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Enviado</p>
                    <p className="text-xs font-medium text-slate-600">{formatFecha(boleta.fecha_subida)}</p>
                  </div>
                </div>

                {/* Observación (rechazo) */}
                {boleta.observacion_rechazo && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                    <MessageSquare className="size-3.5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700 leading-snug line-clamp-2">
                      {boleta.observacion_rechazo}
                    </p>
                  </div>
                )}

                {/* Banco / operación */}
                {(boleta.banco || boleta.numero_operacion) && (
                  <div className="text-xs text-slate-400 space-y-0.5">
                    {boleta.banco && <p>Banco: <span className="text-slate-600">{boleta.banco}</span></p>}
                    {boleta.numero_operacion && <p>N° op.: <span className="text-slate-600 font-mono">{boleta.numero_operacion}</span></p>}
                  </div>
                )}

                {/* Acciones */}
                {boleta.estado_revision === 'En_Revision' && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleAprobar(boleta)}
                      disabled={isSaving}
                      className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
                    >
                      {isSaving
                        ? <Loader2 className="size-3.5 animate-spin" />
                        : <CheckCircle2 className="size-3.5" />}
                      Aprobar
                    </button>
                    <button
                      onClick={() => openRejectModal(boleta)}
                      disabled={isSaving}
                      className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-medium transition-colors disabled:opacity-40"
                    >
                      <X className="size-3.5" /> Rechazar
                    </button>
                  </div>
                )}

                {boleta.estado_revision === 'Aprobada' && (
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">
                    <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-xs text-emerald-700 font-medium">Pago confirmado</p>
                      {boleta.fecha_revision && (
                        <p className="text-[10px] text-emerald-600">{formatFecha(boleta.fecha_revision)}</p>
                      )}
                    </div>
                  </div>
                )}

                {boleta.estado_revision === 'Rechazada' && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-2.5">
                    <AlertCircle className="size-4 text-red-600 shrink-0" />
                    <div>
                      <p className="text-xs text-red-700 font-medium">Voucher rechazado</p>
                      {boleta.revisor && (
                        <p className="text-[10px] text-red-500">por {boleta.revisor.nombres}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && !loading && (
          <div className="col-span-full flex flex-col items-center py-16 text-center">
            <CheckCircle2 className="size-10 text-emerald-300 mb-3" />
            <p className="text-slate-600 font-medium">
              {search
                ? 'No se encontraron vouchers con esa búsqueda.'
                : filter === 'En_Revision'
                ? 'No hay vouchers pendientes de revisión.'
                : filter === 'all' && boletas.length === 0
                ? 'No hay vouchers registrados aún.'
                : 'No hay registros en esta categoría.'}
            </p>
            {filter !== 'all' && (
              <button
                onClick={() => setFilter('all')}
                className="mt-3 text-sm text-teal-600 hover:underline"
              >
                Ver todos
              </button>
            )}
          </div>
        )}
      </div>

      {/* ══ Modal detalle + archivo ══════════════════════════════ */}
      {detailModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-800">Detalle del voucher</h3>
              <button
                onClick={() => { setDetailModal(null); setArchivoUrl(null); }}
                className="p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="size-4 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Zona del archivo */}
              <div className="h-44 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center relative overflow-hidden">
                {loadingUrl ? (
                  <Loader2 className="size-8 text-slate-400 animate-spin" />
                ) : archivoUrl && !archivoUrl.startsWith('mock/') ? (
                  <div className="text-center space-y-2">
                    <Eye className="size-10 text-teal-500 mx-auto" />
                    <a
                      href={archivoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white text-xs font-medium rounded-xl hover:bg-teal-700"
                    >
                      <ExternalLink className="size-3.5" /> Abrir archivo
                    </a>
                  </div>
                ) : (
                  <div className="text-center">
                    <Receipt className="size-12 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-500 font-medium">Comprobante de pago</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {detailModal.nombre_archivo ?? 'Sin nombre de archivo'}
                    </p>
                    {archivoUrl?.startsWith('mock/') && (
                      <p className="text-xs text-amber-500 mt-1">Archivo simulado (modo dev)</p>
                    )}
                  </div>
                )}
              </div>

              {/* Datos */}
              <div className="space-y-0">
                {[
                  ['Alumno',    nombreAlumno(detailModal)],
                  ['Sección',   gradoSeccion(detailModal)],
                  ['Concepto',  detailModal.pago.concepto.nombre],
                  ['Mes',       detailModal.pago.mes ? MESES[detailModal.pago.mes] : '—'],
                  ['Monto',     `S/ ${Number(detailModal.pago.monto).toFixed(2)}`],
                  ['Enviado el', formatFecha(detailModal.fecha_subida)],
                  ...(detailModal.banco ? [['Banco', detailModal.banco]] : []),
                  ...(detailModal.numero_operacion ? [['N° operación', detailModal.numero_operacion]] : []),
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-2 border-b border-slate-100 last:border-0">
                    <span className="text-sm text-slate-500">{k}</span>
                    <span className="text-sm font-semibold text-slate-800">{v}</span>
                  </div>
                ))}
              </div>

              {detailModal.observacion_rechazo && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-xs font-semibold text-red-700 mb-1">Motivo de rechazo:</p>
                  <p className="text-sm text-red-800">{detailModal.observacion_rechazo}</p>
                </div>
              )}

              {/* Acciones en detalle */}
              {detailModal.estado_revision === 'En_Revision' && (
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => openRejectModal(detailModal)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 text-sm font-medium"
                  >
                    Rechazar
                  </button>
                  <button
                    onClick={() => { handleAprobar(detailModal); setDetailModal(null); setArchivoUrl(null); }}
                    disabled={savingId === detailModal.id}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-50"
                  >
                    {savingId === detailModal.id
                      ? <Loader2 className="size-4 animate-spin mx-auto" />
                      : 'Confirmar pago'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ Modal rechazar ═══════════════════════════════════════ */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-800">Rechazar voucher</h3>
              <button
                onClick={() => { setRejectTarget(null); setRejectObs(''); setRejectError(''); }}
                className="p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="size-4 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
                <p className="text-xs text-slate-500">Alumno</p>
                <p className="text-sm font-semibold text-slate-800">{nombreAlumno(rejectTarget)}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {rejectTarget.pago.concepto.nombre}
                  {rejectTarget.pago.mes ? ` · ${MESES[rejectTarget.pago.mes]}` : ''}
                  {' · '}S/ {Number(rejectTarget.pago.monto).toFixed(2)}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Motivo del rechazo <span className="text-red-500">*</span>
                  <span className="text-slate-400 font-normal ml-1">(mínimo 5 caracteres)</span>
                </label>
                <textarea
                  value={rejectObs}
                  onChange={e => { setRejectObs(e.target.value); setRejectError(''); }}
                  rows={3}
                  placeholder="Ej: El monto no coincide con la cuota mensual de S/ 350.00. Por favor adjunte el comprobante correcto."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                />
                {rejectError && (
                  <p className="text-xs text-red-600 mt-1">{rejectError}</p>
                )}
                <p className={`text-xs mt-1 text-right ${rejectObs.trim().length >= 5 ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {rejectObs.trim().length} / mín. 5 caracteres
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setRejectTarget(null); setRejectObs(''); setRejectError(''); }}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRechazarConfirm}
                  disabled={!!savingId}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                >
                  {savingId ? <Loader2 className="size-4 animate-spin" /> : 'Confirmar rechazo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
