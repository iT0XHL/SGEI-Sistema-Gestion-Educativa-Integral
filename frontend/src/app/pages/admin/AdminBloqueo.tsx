import { useState, useEffect } from 'react';
import { Lock, Unlock, AlertCircle, Search, X, Loader2 } from 'lucide-react';
import { alumnosAdminApi, type AlumnoResumenDTO } from '../../../lib/api/admin.api';

interface StudentBlock {
  id: string;
  studentName: string;
  grade: string;
  blocked: boolean;
}

function toRow(a: AlumnoResumenDTO): StudentBlock {
  const studentName = `${a.apellido_paterno} ${a.apellido_materno}, ${a.nombres}${a.sufijo_homonimo ?? ''}`.trim();
  const grade = `${a.seccion?.grado?.nivel?.nombre ?? ''} · ${a.seccion?.grado?.nombre ?? ''} "${a.seccion?.nombre ?? ''}"`.trim();
  return { id: a.id, studentName, grade, blocked: a.bloqueo_manual };
}

export default function AdminBloqueo() {
  const [search, setSearch] = useState('');
  const [students, setStudents] = useState<StudentBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Carga inicial desde la API real ───────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await alumnosAdminApi.listar({ activo: 'true', limit: 200 });
        if (!cancelled) setStudents(res.items.map(toRow));
      } catch {
        if (!cancelled) setErrorMsg('No se pudieron cargar los alumnos.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = students.filter(s =>
    s.studentName.toLowerCase().includes(search.toLowerCase()) ||
    s.grade.toLowerCase().includes(search.toLowerCase())
  );

  // ── Toggle individual con optimistic update + revert en fallo ─────────────
  async function toggleBlock(id: string) {
    const previousStudents = students;
    const student = students.find(s => s.id === id);
    if (!student) return;
    const nuevoEstado = !student.blocked;

    setStudents(prev => prev.map(s => s.id === id ? { ...s, blocked: nuevoEstado } : s));

    try {
      await alumnosAdminApi.setBloqueo(id, nuevoEstado);
    } catch {
      setStudents(previousStudents);
      setErrorMsg('No se pudo actualizar el estado de bloqueo.');
    }
  }

  // ── Bloqueo masivo ────────────────────────────────────────────────────────
  async function setAll(blocked: boolean) {
    const previousStudents = students;
    const targets = students.filter(s => s.blocked !== blocked);
    if (targets.length === 0) return;

    setStudents(prev => prev.map(s => ({ ...s, blocked })));

    try {
      await Promise.all(targets.map(s => alumnosAdminApi.setBloqueo(s.id, blocked)));
    } catch {
      setStudents(previousStudents);
      setErrorMsg(`No se pudo aplicar el ${blocked ? 'bloqueo' : 'desbloqueo'} masivo. Intenta nuevamente.`);
    }
  }

  const blockedCount = students.filter(s => s.blocked).length;
  const unblockedCount = students.length - blockedCount;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bloqueo de Documentos</h1>
          <p className="text-sm text-slate-500 mt-0.5">Control manual de descarga de libretas por alumno</p>
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
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-red-700">{blockedCount}</p>
          <p className="text-sm font-medium text-red-600">Libretas bloqueadas</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-700">{unblockedCount}</p>
          <p className="text-sm font-medium text-emerald-600">Con acceso activo</p>
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
            El bloqueo manual impide la descarga de la libreta del alumno aunque no tenga deuda.
            El desbloqueo requiere confirmación del Director.
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-3">
        <button
          onClick={() => setAll(true)}
          disabled={loading || students.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-sm font-medium transition-colors disabled:opacity-50"
        >
          <Lock className="size-4" /> Bloquear todos
        </button>
        <button
          onClick={() => setAll(false)}
          disabled={loading || students.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-sm font-medium transition-colors disabled:opacity-50"
        >
          <Unlock className="size-4" /> Desbloquear todos
        </button>
      </div>

      {/* Student table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="text-sm font-semibold text-slate-700">Estado por alumno</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-slate-400">
            <Loader2 className="size-5 animate-spin" />
            <span className="text-sm">Cargando alumnos…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">No hay alumnos que coincidan.</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map(student => (
              <div key={student.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex size-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 text-xs font-semibold shrink-0">
                  {student.studentName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{student.studentName}</p>
                  <p className="text-xs text-slate-400 truncate">{student.grade}</p>
                </div>

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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
