import { useState, useEffect } from 'react';
import { Save, Lock, Eye, AlertCircle, CheckCircle2, ChevronDown, Info } from 'lucide-react';
// gradeToLiteral: calcula la escala literal (AD/A/B/C) a partir del promedio; retorna '—' solo si la nota es null
import { STUDENTS_3A, COMPETENCIES, GRADE_ENTRIES, literalColor, gradeToLiteral } from '../../data/mockData';

const AREAS = ['Matemática', 'Comunicación', 'Ciencias Sociales', 'C. y Tecnología', 'Inglés'];
const GRADES = ['1°', '2°', '3°', '4°', '5°'];
const SECTIONS = ['A', 'B', 'C'];
const BIMESTRES = ['Bimestre I', 'Bimestre II', 'Bimestre III', 'Bimestre IV'];
const AREA_COURSE_MAP: Record<string, string> = {
  'Matemática': 'c1', 'Comunicación': 'c2', 'Ciencias Sociales': 'c3', 'C. y Tecnología': 'c4', 'Inglés': 'c5',
};

// ─────────────────────────────────────────────────────────────────────────────
// 🔑 Corrección #6 — Resolución de bimestre_id y docente_id para el INSERT/UPSERT
// ─────────────────────────────────────────────────────────────────────────────

// 🔑 docente_id obtenido de la sesión autenticada — NUNCA hardcodeado en producción.
// En producción: const { user } = useAuth(); const docente_id = user.id;
const MOCK_DOCENTE_ID = 'doc-uuid-ana-garcia-vega'; // Simula user.id del JWT

// Mapeo mock de bimestres a UUIDs — en producción viene de:
// GET /api/bimestres?nombre={nombre}&periodo_activo=true
const BIMESTRE_UUID_MAP: Record<string, string> = {
  'Bimestre I':   'bim-uuid-2025-i',
  'Bimestre II':  'bim-uuid-2025-ii',
  'Bimestre III': 'bim-uuid-2025-iii',
  'Bimestre IV':  'bim-uuid-2025-iv',
};

async function resolveBimestreUUID(nombre: string): Promise<string> {
  // Simula latencia de red — reemplazar con fetch real cuando el backend esté disponible
  await new Promise(r => setTimeout(r, 400));
  // En producción: GET /api/bimestres?nombre={encodeURIComponent(nombre)}&periodo_activo=true
  const id = BIMESTRE_UUID_MAP[nombre];
  if (!id) throw new Error(`Bimestre "${nombre}" no encontrado en el período activo`);
  return id;
}

export default function DocenteNotas() {
  const [area, setArea] = useState('Matemática');
  const [grade, setGrade] = useState('3°');
  const [section, setSection] = useState('A');
  const [bimestre, setBimestre] = useState('Bimestre II');
  const [locked, setLocked] = useState(false);
  const [preview, setPreview] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // 🔑 bimestre_id resuelto desde la API — no se usa el string legible como identificador
  const [bimestreId, setBimestreId] = useState<string | null>(null);
  const [bimestreResolving, setBimestreResolving] = useState(false);

  const courseId = AREA_COURSE_MAP[area] || 'c1';

  // ── Corrección Módulo 6 — Competencias con carga simulada (mock-first, API-ready)
  const [comps, setComps] = useState<string[]>([]);
  const [compsLoading, setCompsLoading] = useState(false);

  useEffect(() => {
    setCompsLoading(true);
    // Mock: simula llamada GET /api/competencias?curso_id=${courseId}
    // En producción: const res = await fetch(`/api/competencias?curso_id=${courseId}`);
    const timer = setTimeout(() => {
      const loaded = COMPETENCIES[courseId] || [];
      setComps(loaded);
      // Re-inicializar cellGrades con los datos del mock al cambiar curso
      setCellGrades(
        Object.fromEntries(
          STUDENTS_3A.map(s => [
            s.id,
            Object.fromEntries(loaded.map((_, i) => {
              const key = `comp${i + 1}`;
              const val = GRADE_ENTRIES[s.id]?.[key];
              return [key, val !== null && val !== undefined ? val.toString() : ''];
            }))
          ])
        )
      );
      setCompsLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [courseId]);

  // Initialize grade state (starts empty; se llena desde el useEffect de comps)
  const [cellGrades, setCellGrades] = useState<Record<string, Record<string, string>>>({});

  const [errors, setErrors] = useState<Record<string, Record<string, string>>>({});

  // 🔑 Resolver bimestre_id cada vez que cambia el selector de bimestre
  useEffect(() => {
    setBimestreId(null);
    setBimestreResolving(true);
    resolveBimestreUUID(bimestre)
      .then(id => {
        setBimestreId(id);   // 🔑 UUID real listo para usar en el payload
        setBimestreResolving(false);
      })
      .catch(() => {
        setBimestreId(null);
        setBimestreResolving(false);
      });
  }, [bimestre]);

  function handleGradeChange(studentId: string, compKey: string, value: string) {
    if (locked) return;
    setSaved(false);
    const num = parseFloat(value);
    const err = value !== '' && (isNaN(num) || num < 0 || num > 20) ? 'Fuera de rango' : '';
    setCellGrades(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [compKey]: value }
    }));
    setErrors(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [compKey]: err }
    }));
  }

  function computeAvg(studentId: string): number | null {
    const valid = comps.map((_, i) => {
      const raw = cellGrades[studentId]?.[`comp${i + 1}`] ?? '';
      const v = parseFloat(raw);
      return (!isNaN(v) && v >= 0 && v <= 20) ? v : null;
    }).filter((v): v is number => v !== null);

    if (valid.length === 0) return null;
    return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10;
  }

  const totalFilled = STUDENTS_3A.filter(s => {
    return comps.every((_, i) => {
      const v = cellGrades[s.id]?.[`comp${i+1}`];
      return v !== '' && v !== undefined;
    });
  }).length;

  const hasErrors = Object.values(errors).some(r => Object.values(r).some(e => e !== ''));

  function handleSave() {
    if (hasErrors || locked || !bimestreId) return;
    setSaving(true);
    setTimeout(() => {
      // Payload correcto para UPSERT a academic_schema.nota (con UUIDs reales de FK)
      // const payload = STUDENTS_3A.flatMap(s =>
      //   comps.map((_, i) => {
      //     const key = `comp${i + 1}`;
      //     return {
      //       alumno_id: s.id,
      //       competencia_id: key,
      //       bimestre_id: bimestreId,     // 🔑 UUID real resuelto desde GET /api/bimestres
      //       docente_id: MOCK_DOCENTE_ID, // 🔑 UUID del docente autenticado (user.id del JWT)
      //       nota_vigesimal: parseFloat(cellGrades[s.id]?.[key] || '0'),
      //     };
      //   })
      // );
      // await fetch('/api/notas', { method: 'POST', body: JSON.stringify(payload) });
      void MOCK_DOCENTE_ID; // usado en el payload real
      setSaving(false);
      setSaved(true);
    }, 1000);
  }

  function handleLock() {
    if (!saved) return;
    setLocked(true);
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ingreso de Notas</h1>
          <p className="text-sm text-slate-500 mt-0.5">Calificaciones finales por competencia — CNEB</p>
        </div>
        {locked && (
          <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-medium">
            <Lock className="size-4" /> Calificaciones cerradas
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Área', value: area, setter: setArea, options: AREAS },
            { label: 'Grado', value: grade, setter: setGrade, options: GRADES },
            { label: 'Sección', value: section, setter: setSection, options: SECTIONS },
            { label: 'Bimestre', value: bimestre, setter: setBimestre, options: BIMESTRES },
          ].map(f => (
            <div key={f.label}>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{f.label}</label>
              <div className="relative">
                <select
                  value={f.value}
                  onChange={e => { f.setter(e.target.value); setSaved(false); }}
                  disabled={locked}
                  className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {f.options.map(o => <option key={o}>{o}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
              </div>
              {/* 🔑 Indicador de resolución de bimestre_id */}
              {f.label === 'Bimestre' && (
                <p className={`text-[10px] mt-1 ${bimestreResolving ? 'text-amber-500' : bimestreId ? 'text-emerald-600' : 'text-red-500'}`}>
                  {bimestreResolving
                    ? '⟳ Resolviendo bimestre_id…'
                    : bimestreId
                      ? `✓ bimestre_id listo`
                      : '✗ No se pudo resolver el bimestre'}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">Notas ingresadas</span>
          <span className="text-sm font-bold text-slate-800">{totalFilled}/{STUDENTS_3A.length} estudiantes completos</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${totalFilled === STUDENTS_3A.length ? 'bg-emerald-500' : 'bg-indigo-500'}`}
            style={{ width: `${(totalFilled / STUDENTS_3A.length) * 100}%` }}
          />
        </div>
        <div className="flex items-center gap-1.5 mt-2">
          <Info className="size-3.5 text-slate-400" />
          <p className="text-xs text-slate-500">
            Celda <span className="inline-block w-3 h-3 rounded-sm bg-emerald-200 align-middle" /> = nota ingresada · 
            <span className="inline-block w-3 h-3 rounded-sm bg-slate-100 ml-1 align-middle" /> = pendiente
          </p>
        </div>
      </div>

      {hasErrors && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
          <AlertCircle className="size-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">Hay notas fuera del rango válido (0–20). Corrígelas antes de guardar.</p>
        </div>
      )}

      {/* Grade table */}
      {compsLoading ? (
        <div className="space-y-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Cargando competencias…</p>
          {[1, 2, 3].map(i => (
            <div key={i} className="h-10 bg-slate-100 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {area} · {grade}° Secundaria {section} · {bimestre} {locked ? '(CERRADO)' : ''}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider sticky left-0 bg-white min-w-[180px]">
                  Estudiante
                </th>
                {comps.map((comp, i) => (
                  <th key={i} className="text-center px-2 py-3 text-xs font-semibold text-slate-500 min-w-[100px]">
                    <div className="max-w-[90px] leading-tight" title={comp}>C{i + 1}</div>
                    <div className="text-[10px] font-normal text-slate-400 truncate max-w-[90px] mt-0.5" title={comp}>{comp.slice(0, 20)}…</div>
                  </th>
                ))}
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-700 uppercase">Prom.</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-700 uppercase">Escala</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {STUDENTS_3A.map((student, idx) => {
                const studentAvg = computeAvg(student.id);
                // 🔄 Corrección #10 — calcLiteral() usa escalaLiteral del estado (no hardcodeada)
                const lit = gradeToLiteral(studentAvg);
                return (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 sticky left-0 bg-white">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 w-5">{idx + 1}</span>
                        <div className="flex size-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold shrink-0">{student.initials}</div>
                        <span className="font-medium text-slate-800 whitespace-nowrap">{student.name}</span>
                      </div>
                    </td>
                    {comps.map((_, i) => {
                      const key = `comp${i + 1}`;
                      const val = cellGrades[student.id]?.[key] ?? '';
                      const err = errors[student.id]?.[key];
                      const filled = val !== '' && !err;
                      return (
                        <td key={i} className="text-center px-2 py-2">
                          <input
                            type="number"
                            min="0"
                            max="20"
                            value={val}
                            onChange={e => handleGradeChange(student.id, key, e.target.value)}
                            disabled={locked}
                            title={err || undefined}
                            className={`w-14 text-center text-sm border rounded-xl py-1.5 transition-all focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed
                              ${err
                                ? 'border-red-400 bg-red-50 text-red-700 focus:ring-red-400'
                                : filled
                                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800 focus:ring-emerald-400'
                                  : 'border-slate-200 bg-slate-50 text-slate-700 focus:ring-indigo-400'
                              }`}
                            placeholder="—"
                          />
                          {err && <p className="text-[10px] text-red-500 mt-0.5">{err}</p>}
                        </td>
                      );
                    })}
                    <td className="text-center px-4 py-3">
                      <span className="text-base font-bold text-slate-800">
                        {studentAvg !== null ? studentAvg.toFixed(1) : '—'}
                      </span>
                    </td>
                    <td className="text-center px-4 py-3">
                      {studentAvg !== null ? (
                        <span className={`inline-flex items-center justify-center w-8 h-6 rounded-lg text-xs font-bold border ${literalColor(lit)}`}>
                          {lit}
                        </span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center gap-3 justify-between">
          <button
            onClick={() => setPreview(p => !p)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Eye className="size-4" />
            {preview ? 'Ocultar' : 'Vista previa'} de libreta
          </button>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={hasErrors || locked || saving || !bimestreId || bimestreResolving}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              {saving ? (
                <><svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Guardando…</>
              ) : saved ? (
                <><CheckCircle2 className="size-4" />Guardado</>
              ) : bimestreResolving ? (
                <><svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Resolviendo…</>
              ) : (
                <><Save className="size-4" />Guardar notas</>
              )}
            </button>

            {saved && !locked && (
              <button
                onClick={handleLock}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                <Lock className="size-4" /> Cerrar calificaciones
              </button>
            )}
          </div>
        </div>
      </div>
      )}
      {locked && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <Lock className="size-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Calificaciones cerradas</p>
            <p className="text-sm text-amber-700 mt-0.5">
              Las notas del {bimestre} han sido cerradas. Para realizar correcciones, solicita autorización al Administrador.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}