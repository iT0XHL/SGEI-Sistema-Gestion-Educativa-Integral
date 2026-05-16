import { useState } from 'react';
import { Lock, Unlock, AlertCircle, CheckCircle2, Search, X } from 'lucide-react';
import { ALL_PAYMENTS_SEC } from '../../data/mockData';

interface StudentBlock {
  id: string; studentName: string; grade: string;
  total: number; paid: number; pending: number;
  status: 'paid' | 'partial' | 'overdue';
  blocked: boolean;
}

export default function AdminBloqueo() {
  const [search, setSearch] = useState('');
  const [students, setStudents] = useState<StudentBlock[]>(
    ALL_PAYMENTS_SEC.map(s => ({
      ...s,
      blocked: s.status === 'overdue' || (s.status === 'partial' && s.pending > 1050),
    }))
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const filtered = students.filter(s =>
    s.studentName.toLowerCase().includes(search.toLowerCase()) ||
    s.grade.toLowerCase().includes(search.toLowerCase())
  );

  // ── Corrección 3: toggleBlock con optimistic update + revert en fallo ─────
  async function toggleBlock(id: string) {
    const previousStudents = students;
    setStudents(prev => prev.map(s => s.id === id ? { ...s, blocked: !s.blocked } : s));

    const student    = students.find(s => s.id === id);
    const nuevoEstado = !student?.blocked;

    try {
      // En producción: descommentar la llamada real
      // const res = await fetch(`/api/alumnos/${id}`, {
      //   method: 'PATCH',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ bloqueo_manual: nuevoEstado }),
      // });
      // if (!res.ok) throw new Error('Error al actualizar bloqueo');

      // Mock: simular latencia
      await new Promise(r => setTimeout(r, 300));
      void nuevoEstado;
    } catch {
      // Revertir si la API falla
      setStudents(previousStudents);
      setErrorMsg('No se pudo actualizar el estado de bloqueo.');
    }
  }

  // ── Bloqueo masivo con optimistic update ──────────────────────────────────
  async function blockAll() {
    const previousStudents = students;
    setStudents(prev => prev.map(s => s.status !== 'paid' ? { ...s, blocked: true } : s));

    try {
      // En producción: PATCH en lote o iteración
      // await Promise.all(
      //   students
      //     .filter(s => s.status !== 'paid')
      //     .map(s => fetch(`/api/alumnos/${s.id}`, {
      //       method: 'PATCH',
      //       headers: { 'Content-Type': 'application/json' },
      //       body: JSON.stringify({ bloqueo_manual: true }),
      //     }))
      // );

      await new Promise(r => setTimeout(r, 400));
    } catch {
      setStudents(previousStudents);
      setErrorMsg('No se pudo aplicar el bloqueo masivo. Intenta nuevamente.');
    }
  }

  // ── Desbloqueo masivo con optimistic update ───────────────────────────────
  async function unblockAll() {
    const previousStudents = students;
    setStudents(prev => prev.map(s => ({ ...s, blocked: false })));

    try {
      // En producción:
      // await Promise.all(
      //   students.map(s => fetch(`/api/alumnos/${s.id}`, {
      //     method: 'PATCH',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify({ bloqueo_manual: false }),
      //   }))
      // );

      await new Promise(r => setTimeout(r, 400));
    } catch {
      setStudents(previousStudents);
      setErrorMsg('No se pudo aplicar el desbloqueo masivo. Intenta nuevamente.');
    }
  }

  const blockedCount = students.filter(s => s.blocked).length;
  const unblockedCount = students.length - blockedCount;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bloqueo de Documentos</h1>
          <p className="text-sm text-slate-500 mt-0.5">Control de descarga de libretas por estado de pago</p>
        </div>
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="search"
            placeholder="Buscar alumno…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-red-700">{blockedCount}</p>
          <p className="text-sm font-medium text-red-600">Libretas bloqueadas</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-700">{unblockedCount}</p>
          <p className="text-sm font-medium text-emerald-600">Con acceso activo</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-700">{students.filter(s=>s.status!=='paid').length}</p>
          <p className="text-sm font-medium text-amber-600">Con deudas pendientes</p>
        </div>
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

      {/* Info */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-2xl p-4">
        <AlertCircle className="size-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-800">Política de bloqueo</p>
          <p className="text-sm text-blue-700 mt-0.5">
            Los alumnos con estado <strong>Vencido</strong> o deuda mayor a 3 cuotas tienen la descarga de libreta bloqueada automáticamente.
            El desbloqueo manual requiere confirmación del Director.
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-3">
        <button
          onClick={blockAll}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-sm font-medium transition-colors"
        >
          <Lock className="size-4" /> Bloquear todos con deuda
        </button>
        <button
          onClick={unblockAll}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-sm font-medium transition-colors"
        >
          <Unlock className="size-4" /> Desbloquear todos
        </button>
      </div>

      {/* Student table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="text-sm font-semibold text-slate-700">Estado por alumno</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {filtered.map(student => {
            const pctPaid = Math.round(student.paid / student.total * 100);
            return (
              <div key={student.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex size-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 text-xs font-semibold shrink-0">
                  {student.studentName.split(' ').map(n=>n[0]).slice(0,2).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{student.studentName}</p>
                  <p className="text-xs text-slate-400">{student.grade}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-[120px]">
                      <div
                        className={`h-full rounded-full ${
                          pctPaid === 100 ? 'bg-emerald-500' :
                          pctPaid > 50   ? 'bg-amber-400' : 'bg-red-400'
                        }`}
                        style={{ width: `${pctPaid}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500">
                      S/ {student.paid.toLocaleString()} / S/ {student.total.toLocaleString()} ({pctPaid}%)
                    </span>
                  </div>
                </div>

                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                  student.status === 'paid'    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  student.status === 'partial' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  'bg-red-50 text-red-700 border-red-200'
                }`}>
                  {student.status === 'paid' ? 'Al día' : student.status === 'partial' ? 'Parcial' : 'Vencido'}
                </span>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`flex items-center gap-1 text-xs font-medium ${student.blocked ? 'text-red-600' : 'text-emerald-600'}`}>
                    {student.blocked ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}
                    {student.blocked ? 'Bloqueado' : 'Desbloqueado'}
                  </span>
                  <button
                    onClick={() => toggleBlock(student.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border ${
                      student.blocked
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                    }`}
                  >
                    {student.blocked ? 'Desbloquear' : 'Bloquear'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}