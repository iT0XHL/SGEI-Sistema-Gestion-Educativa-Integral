import { useState } from 'react';
import { PlusCircle, Eye, EyeOff, X, Search, Copy, CheckCircle2, GraduationCap, Users, AlertTriangle, Loader2, ChevronDown } from 'lucide-react';
import { DatePicker } from '../../components/DatePicker';

type Nivel = 'Primaria' | 'Secundaria';
type Sexo = 'Masculino' | 'Femenino';

interface Alumno {
  id: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  name: string;           // display: nombres + apePat + apeMat
  fechaNacimiento: string;
  grade: string;
  section: string;
  nivel: Nivel;
  sexo: Sexo;
  dni: string;
  username: string;
  password: string;
  createdAt: string;
}

const GRADOS_PRIMARIA = ['1°', '2°', '3°', '4°', '5°', '6°'];
const GRADOS_SECUNDARIA = ['1°', '2°', '3°', '4°', '5°'];
const SECCIONES = ['A', 'B', 'C', 'D', 'E', 'F'];

// Orden canónico para ordenar grados
const GRADE_ORDER = ['1°', '2°', '3°', '4°', '5°', '6°'];

const INITIAL_STUDENTS: Alumno[] = [
  { id: 'al1',  nombres: 'Carlos',    apellidoPaterno: 'Mendoza',  apellidoMaterno: 'Ramos',   name: 'Carlos Mendoza Ramos',    fechaNacimiento: '2010-04-12', grade: '3°', section: 'A', nivel: 'Secundaria', sexo: 'Masculino', dni: '72345678', username: 'carlos.mendoza',   password: 'Sgei2025!', createdAt: '01/03/2025' },
  { id: 'al2',  nombres: 'Valentina', apellidoPaterno: 'Torres',   apellidoMaterno: 'Lima',    name: 'Valentina Torres Lima',   fechaNacimiento: '2010-07-20', grade: '3°', section: 'A', nivel: 'Secundaria', sexo: 'Femenino',  dni: '72345679', username: 'valentina.torres', password: 'Sgei2025!', createdAt: '01/03/2025' },
  { id: 'al3',  nombres: 'Eduardo',   apellidoPaterno: 'Quispe',   apellidoMaterno: 'Lima',    name: 'Eduardo Quispe Lima',     fechaNacimiento: '2010-01-05', grade: '3°', section: 'A', nivel: 'Secundaria', sexo: 'Masculino', dni: '72345680', username: 'eduardo.quispe',   password: 'Sgei2025!', createdAt: '01/03/2025' },
  { id: 'al4',  nombres: 'Fernanda',  apellidoPaterno: 'Mamani',   apellidoMaterno: 'Condori', name: 'Fernanda Mamani Condori', fechaNacimiento: '2010-09-30', grade: '3°', section: 'A', nivel: 'Secundaria', sexo: 'Femenino',  dni: '72345681', username: 'fernanda.mamani',  password: 'Sgei2025!', createdAt: '01/03/2025' },
  { id: 'al5',  nombres: 'Gabriel',   apellidoPaterno: 'Herrera',  apellidoMaterno: 'Apaza',   name: 'Gabriel Herrera Apaza',   fechaNacimiento: '2010-11-14', grade: '3°', section: 'A', nivel: 'Secundaria', sexo: 'Masculino', dni: '72345682', username: 'gabriel.herrera',  password: 'Sgei2025!', createdAt: '01/03/2025' },
  { id: 'al6',  nombres: 'Luciana',   apellidoPaterno: 'Vargas',   apellidoMaterno: 'Cano',    name: 'Luciana Vargas Cano',     fechaNacimiento: '2011-02-28', grade: '2°', section: 'B', nivel: 'Secundaria', sexo: 'Femenino',  dni: '72345683', username: 'luciana.vargas',   password: 'Sgei2025!', createdAt: '01/03/2025' },
  { id: 'al7',  nombres: 'Iván',      apellidoPaterno: 'Paredes',  apellidoMaterno: 'Salas',   name: 'Iván Paredes Salas',      fechaNacimiento: '2011-06-10', grade: '2°', section: 'B', nivel: 'Secundaria', sexo: 'Masculino', dni: '72345684', username: 'ivan.paredes',     password: 'Sgei2025!', createdAt: '01/03/2025' },
  { id: 'al8',  nombres: 'Rodrigo',   apellidoPaterno: 'Mamani',   apellidoMaterno: 'Flores',  name: 'Rodrigo Mamani Flores',   fechaNacimiento: '2009-08-22', grade: '4°', section: 'A', nivel: 'Secundaria', sexo: 'Masculino', dni: '72345685', username: 'rodrigo.mamani',   password: 'Sgei2025!', createdAt: '01/03/2025' },
  { id: 'al9',  nombres: 'Margarita', apellidoPaterno: 'Loza',     apellidoMaterno: 'Ccopa',   name: 'Margarita Loza Ccopa',    fechaNacimiento: '2016-03-17', grade: '1°', section: 'A', nivel: 'Primaria',   sexo: 'Femenino',  dni: '72345686', username: 'margarita.loza',   password: 'Sgei2025!', createdAt: '01/03/2025' },
  { id: 'al10', nombres: 'Patricia',  apellidoPaterno: 'Huanca',   apellidoMaterno: 'Valero',  name: 'Patricia Huanca Valero',  fechaNacimiento: '2008-12-01', grade: '5°', section: 'B', nivel: 'Secundaria', sexo: 'Femenino',  dni: '72345687', username: 'patricia.huanca',  password: 'Sgei2025!', createdAt: '01/03/2025' },
];

function generateUsername(name: string): string {
  const parts = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(' ');
  return `${parts[0]}.${parts[1] ?? ''}`.replace(/[^a-z.]/g, '');
}

function generatePassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function SecretariaAlumnos() {
  const [students, setStudents] = useState<Alumno[]>(INITIAL_STUDENTS);
  const [search, setSearch] = useState('');
  const [filterNivel, setFilterNivel] = useState<'all' | Nivel>('all');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [modal, setModal] = useState(false);
  const [newCredentials, setNewCredentials] = useState<Alumno | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    firstName: '',
    apePat: '',
    apeMat: '',
    dni: '',
    fechaNacimiento: '',
    sexo: 'Masculino' as Sexo,
    nivel: 'Secundaria' as Nivel,
    grade: '1°',
    section: 'A',
  });

  const grados = form.nivel === 'Primaria' ? GRADOS_PRIMARIA : GRADOS_SECUNDARIA;
  const fullName = [form.firstName, form.apePat, form.apeMat].filter(Boolean).join(' ');
  const dniError = form.dni.length > 0 && form.dni.length !== 8 ? 'El DNI debe tener exactamente 8 dígitos.' : '';

  // ── Derivar grados y secciones disponibles para los filtros ──────────────
  const baseForFilters = students.filter(s =>
    filterNivel === 'all' || s.nivel === filterNivel
  );
  const availableGrades = Array.from(new Set(baseForFilters.map(s => s.grade)))
    .sort((a, b) => GRADE_ORDER.indexOf(a) - GRADE_ORDER.indexOf(b));
  const availableSections = Array.from(
    new Set(
      baseForFilters
        .filter(s => !filterGrade || s.grade === filterGrade)
        .map(s => s.section)
    )
  ).sort();

  // ───────────────────────────────────────────────────────────────────────────
  // 🔑 Corrección #4 — Resolución de seccion_id y periodo_id antes del INSERT
  // En producción: GET /api/secciones?grado={grado}&seccion={seccion}&periodo_activo=true
  // ─────────────────────────────────────────────────────────────────────────────
  async function resolveSeccionUUIDs(
    grade: string,
    section: string
  ): Promise<{ seccion_id: string; periodo_id: string }> {
    // Simula latencia de red — reemplazar con fetch real cuando el backend esté disponible
    await new Promise(r => setTimeout(r, 700));
    if (!grade || !section) throw new Error('Parámetros inválidos');
    // Mock response: en producción esto viene de la DB con UUIDs reales
    return {
      seccion_id: `sec-uuid-${grade.replace('°', '')}-${section}`.toLowerCase(),
      periodo_id: 'per-uuid-2025-activo',
    };
  }

  const [resolviendo, setResolviendo] = useState(false);
  const [seccError, setSeccError] = useState('');
  const [submitAttempted, setSubmitAttempted] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitAttempted(true);
    if (!form.firstName.trim() || !form.apePat.trim()) return;
    if (!/^[0-9]{8}$/.test(form.dni)) return;   // Corrección 1.1 — regex estricta
    if (!form.fechaNacimiento) return;

    setResolviendo(true);
    setSeccError('');

    try {
      // 🔑 Resolviendo seccion_id y periodo_id desde grado + sección
      const { seccion_id, periodo_id } = await resolveSeccionUUIDs(form.grade, form.section);

      const username = generateUsername(fullName);
      const password = generatePassword();
      const alumno: Alumno = {
        id: `al${Date.now()}`,
        nombres: form.firstName,
        apellidoPaterno: form.apePat,
        apellidoMaterno: form.apeMat,
        name: fullName,
        fechaNacimiento: form.fechaNacimiento,
        grade: form.grade,
        section: form.section,
        nivel: form.nivel,
        sexo: form.sexo,
        dni: form.dni,
        username,
        password,
        createdAt: new Date().toLocaleDateString('es-PE'),
      };

      // 🔄 Corrección #8 — Transformar sexo CHAR(1) antes del INSERT
      // PostgreSQL: sexo CHAR(1) CHECK (sexo IN ('M', 'F')) — nunca 'Masculino'/'Femenino'
      const sexoDb = form.sexo === 'Masculino' ? 'M' : 'F';

      // Payload correcto para INSERT — incluye UUIDs de FK reales
      // const payload = {
      //   nombres: alumno.nombres, apellido_paterno: alumno.apellidoPaterno,
      //   apellido_materno: alumno.apellidoMaterno, dni: alumno.dni,
      //   fecha_nacimiento: alumno.fechaNacimiento,
      //   sexo: sexoDb,     // 🔄 Corrección #8: 'M' o 'F' — nunca 'Masculino'/'Femenino'
      //   seccion_id,       // 🔑 UUID real de academic_schema.seccion
      //   periodo_id,       // 🔑 UUID real del período activo
      // };
      // await fetch('/api/alumnos', { method: 'POST', body: JSON.stringify(payload) });
      void seccion_id; void periodo_id; void sexoDb; // usados en el payload real

      setStudents(prev => [alumno, ...prev]);
      setNewCredentials(alumno);
      setForm({ firstName: '', apePat: '', apeMat: '', dni: '', fechaNacimiento: '', sexo: 'Masculino', nivel: 'Secundaria', grade: '1°', section: 'A' });
      setSubmitAttempted(false);
      setModal(false);
    } catch {
      setSeccError(`No se encontró la sección ${form.grade} — ${form.section} para el período activo.`);
    } finally {
      setResolviendo(false);
    }
  }

  function copyCredentials() {
    if (!newCredentials) return;
    navigator.clipboard.writeText(
      `Usuario: ${newCredentials.username}\nContraseña: ${newCredentials.password}`
    ).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDeleteStudent(id: string) {
    setStudents(prev => prev.filter(s => s.id !== id));
  }

  const priCount = students.filter(s => s.nivel === 'Primaria').length;
  const secCount = students.filter(s => s.nivel === 'Secundaria').length;

  const filtered = students.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
                        s.username.toLowerCase().includes(search.toLowerCase()) ||
                        s.grade.includes(search) ||
                        s.section.toLowerCase().includes(search.toLowerCase()) ||
                        s.dni.includes(search);
    const matchNivel   = filterNivel === 'all' || s.nivel === filterNivel;
    const matchGrade   = !filterGrade   || s.grade   === filterGrade;
    const matchSection = !filterSection || s.section === filterSection;
    return matchSearch && matchNivel && matchGrade && matchSection;
  });

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestión de Alumnos</h1>
          <p className="text-sm text-slate-500 mt-0.5">{students.length} alumnos registrados · Año 2025</p>
        </div>
        <button
          onClick={() => { setModal(true); setSeccError(''); setSubmitAttempted(false); }}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm self-start sm:self-auto"
        >
          <PlusCircle className="size-4" /> Agregar alumno
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="flex size-9 items-center justify-center rounded-xl bg-teal-50 mb-2">
            <Users className="size-5 text-teal-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{students.length}</p>
          <p className="text-sm text-slate-500 mt-0.5">Total alumnos</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50 mb-2">
            <GraduationCap className="size-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{secCount}</p>
          <p className="text-sm text-slate-500 mt-0.5">Secundaria</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="flex size-9 items-center justify-center rounded-xl bg-purple-50 mb-2">
            <GraduationCap className="size-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{priCount}</p>
          <p className="text-sm text-slate-500 mt-0.5">Primaria</p>
        </div>
      </div>

      {/* New credentials banner */}
      {newCredentials && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800 mb-1">
                ⚠ Credenciales generadas para <span className="text-amber-900">{newCredentials.name}</span> — Muéstralas UNA SOLA VEZ
              </p>
              <div className="bg-white rounded-xl border border-amber-200 p-4 space-y-2 font-mono text-sm">
                <p className="text-slate-700">
                  <span className="text-slate-500">Usuario:</span> {newCredentials.username}
                </p>
                <p className="text-slate-700 flex items-center gap-2">
                  <span className="text-slate-500">Contraseña:</span>
                  {showPass ? newCredentials.password : '••••••••••'}
                  <button onClick={() => setShowPass(p => !p)} className="text-slate-400 hover:text-slate-600">
                    {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </p>
                <p className="text-slate-500 text-xs">
                  Grado: {newCredentials.grade} · Sec. {newCredentials.section} · {newCredentials.nivel}
                </p>
              </div>
            </div>
            <button onClick={() => setNewCredentials(null)} className="p-1.5 rounded-lg hover:bg-amber-100 shrink-0">
              <X className="size-4 text-amber-700" />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={copyCredentials}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-medium transition-colors"
            >
              {copied ? <CheckCircle2 className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? '¡Copiado!' : 'Copiar credenciales'}
            </button>
            <p className="text-xs text-amber-600">Entrégalas al alumno o apoderado de forma segura.</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        {/* Nivel toggle */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {(['all', 'Primaria', 'Secundaria'] as const).map(n => (
            <button
              key={n}
              onClick={() => { setFilterNivel(n); setFilterGrade(''); setFilterSection(''); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filterNivel === n ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {n === 'all' ? 'Todos' : n}
            </button>
          ))}
        </div>

        {/* Búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="search"
            placeholder="Buscar alumno, grado, sección…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </div>

        {/* Filtro Grado */}
        <div className="relative">
          <select
            value={filterGrade}
            onChange={e => { setFilterGrade(e.target.value); setFilterSection(''); }}
            className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400 min-w-[120px]"
          >
            <option value="">Todos los grados</option>
            {availableGrades.map(g => (
              <option key={g} value={g}>{g} Grado</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
        </div>

        {/* Filtro Sección (depende del grado) */}
        <div className="relative">
          <select
            value={filterSection}
            onChange={e => setFilterSection(e.target.value)}
            disabled={availableSections.length === 0}
            className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400 min-w-[130px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Todas las secciones</option>
            {availableSections.map(sec => (
              <option key={sec} value={sec}>Sección {sec}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[520px]">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Alumno</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">DNI</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sexo</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Grado</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sección</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nivel</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Usuario</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Creado</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-8 items-center justify-center rounded-full bg-teal-100 text-teal-700 text-xs font-semibold shrink-0">
                        {s.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <span className="font-semibold text-slate-800">{s.name}</span>
                    </div>
                  </td>
                  <td className="text-center px-4 py-3.5">
                    <span className="font-mono text-xs text-slate-600">{s.dni || '—'}</span>
                  </td>
                  <td className="text-center px-4 py-3.5">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${
                      s.sexo === 'Masculino'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-pink-50 text-pink-700 border-pink-200'
                    }`}>
                      {s.sexo === 'Masculino' ? 'M' : 'F'}
                    </span>
                  </td>
                  <td className="text-center px-4 py-3.5">
                    <span className="font-semibold text-slate-700">{s.grade}</span>
                  </td>
                  <td className="text-center px-4 py-3.5">
                    <span className="inline-flex items-center justify-center size-7 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold">{s.section}</span>
                  </td>
                  <td className="text-center px-4 py-3.5">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${
                      s.nivel === 'Secundaria'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-purple-50 text-purple-700 border-purple-200'
                    }`}>
                      {s.nivel}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg">{s.username}</span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-400 text-xs hidden lg:table-cell">{s.createdAt}</td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      onClick={() => handleDeleteStudent(s.id)}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center py-12 text-center">
              <Users className="size-10 text-slate-200 mb-3" />
              <p className="text-slate-500">No se encontraron alumnos</p>
            </div>
          )}
        </div>
      </div>

      {/* Add student modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-800">Agregar nuevo alumno</h3>
              <button onClick={() => setModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="size-4 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">

              {/* Name fields */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre(s)</label>
                <input
                  required
                  value={form.firstName}
                  onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                  placeholder="Ej. Ana Lucía"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Apellido paterno</label>
                  <input
                    required
                    value={form.apePat}
                    onChange={e => setForm(f => ({ ...f, apePat: e.target.value }))}
                    placeholder="Ej. Pérez"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Apellido materno</label>
                  <input
                    value={form.apeMat}
                    onChange={e => setForm(f => ({ ...f, apeMat: e.target.value }))}
                    placeholder="Ej. Torres"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>
              </div>

              {/* Preview full name */}
              {fullName && (
                <div className="bg-teal-50 border border-teal-200 rounded-xl px-3 py-2">
                  <span className="text-xs text-teal-600">Nombre completo: </span>
                  <span className="text-xs font-semibold text-teal-800">{fullName}</span>
                </div>
              )}

              {/* DNI */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  DNI <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.dni}
                  onChange={e => setForm(f => ({ ...f, dni: e.target.value.replace(/\D/g, '').slice(0, 8) }))}
                  onPaste={e => {
                    e.preventDefault();
                    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 8);
                    setForm(f => ({ ...f, dni: pasted }));
                  }}
                  placeholder="8 dígitos"
                  maxLength={8}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono focus:outline-none focus:ring-2 transition-all ${
                    dniError
                      ? 'border-red-400 bg-red-50 text-red-700 focus:ring-red-400'
                      : form.dni.length === 8
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-800 focus:ring-emerald-400'
                        : 'border-slate-200 bg-slate-50 focus:ring-teal-400'
                  }`}
                />
                {dniError && (
                  <p className="flex items-center gap-1 mt-1 text-xs text-red-600">
                    <svg className="size-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {dniError}
                  </p>
                )}
                {submitAttempted && form.dni.length === 0 && (
                  <p className="flex items-center gap-1 mt-1 text-xs text-red-600">
                    <svg className="size-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    El DNI es obligatorio
                  </p>
                )}
                {form.dni.length === 8 && !dniError && (
                  <p className="flex items-center gap-1 mt-1 text-xs text-emerald-600">
                    <svg className="size-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    DNI válido
                  </p>
                )}
              </div>

              {/* Fecha de nacimiento */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Fecha de nacimiento <span className="text-red-500">*</span>
                </label>
                <DatePicker
                  value={form.fechaNacimiento}
                  onChange={v => setForm(f => ({ ...f, fechaNacimiento: v }))}
                  max={new Date().toISOString().split('T')[0]}
                  placeholder="DD/MM/AAAA"
                  color="teal"
                  hasError={false}
                />
                {!form.fechaNacimiento && (
                  <p className="mt-1 text-xs text-slate-400">Campo obligatorio</p>
                )}
              </div>

              {/* Sexo */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Sexo</label>
                <div className="flex gap-2">
                  {(['Masculino', 'Femenino'] as Sexo[]).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, sexo: s }))}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                        form.sexo === s
                          ? s === 'Masculino'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-pink-600 text-white border-pink-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nivel */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nivel educativo</label>
                <div className="flex gap-2">
                  {(['Primaria', 'Secundaria'] as Nivel[]).map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, nivel: n, grade: '1°' }))}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                        form.nivel === n
                          ? n === 'Primaria'
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-teal-600 text-white border-teal-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grade + Section */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Grado</label>
                  <select
                    value={form.grade}
                    onChange={e => setForm(f => ({ ...f, grade: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-400"
                  >
                    {grados.map(g => <option key={g} value={g}>{g} Grado</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Sección</label>
                  <select
                    value={form.section}
                    onChange={e => setForm(f => ({ ...f, section: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-400"
                  >
                    {SECCIONES.map(s => <option key={s} value={s}>Sección {s}</option>)}
                  </select>
                </div>
              </div>

              {/* Error de resolución de sección */}
              {seccError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                  <AlertTriangle className="size-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{seccError}</p>
                </div>
              )}

              <div className="bg-teal-50 border border-teal-200 rounded-xl p-3">
                <p className="text-xs text-teal-700">
                  El usuario se generará del nombre completo y la contraseña se mostrará <strong>una sola vez</strong>.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setModal(false); setSeccError(''); }}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={resolviendo}
                  className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                >
                  {resolviendo ? (
                    <><Loader2 className="size-4 animate-spin" /> Verificando sección…</>
                  ) : 'Crear usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}