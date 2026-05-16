import { useState, useRef } from 'react';
import { useParams, Link } from 'react-router';
import {
  BookOpen, FileText, ClipboardList,
  Download, ExternalLink, Upload, CheckCircle2, Clock, AlertCircle, ChevronLeft,
  RefreshCw, Paperclip, X, GraduationCap
} from 'lucide-react';
import { COURSES, COLOR_MAP, MATERIALS, ACTIVITIES, STUDENT_GRADES_B2, gradeToLiteral } from '../../data/mockData';

type Tab = 'materiales' | 'actividades';

interface UploadState {
  file: File | null;
  status: 'idle' | 'selected' | 'uploading' | 'submitted' | 'error';
}

export default function AlumnoCursoDetalle() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<Tab>('materiales');
  const [uploadStates, setUploadStates] = useState<Record<string, UploadState>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const course = COURSES.find(c => c.id === id);
  if (!course) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertCircle className="size-10 text-slate-300" />
      <p className="text-slate-600">Curso no encontrado</p>
      <Link to="/alumno/cursos" className="text-blue-600 text-sm hover:underline">← Volver a mis cursos</Link>
    </div>
  );

  const c = COLOR_MAP[course.color];
  const materials = MATERIALS.filter(m => m.courseId === course.id);
  const activities = ACTIVITIES.filter(a => a.courseId === course.id);
  const gradesB2 = (STUDENT_GRADES_B2 as Record<string, number[]>)[course.id] || [];
  const avgB2 = gradesB2.length > 0 ? gradesB2.reduce((a, b) => a + b, 0) / gradesB2.length : null;

  function getState(actId: string): UploadState {
    return uploadStates[actId] || { file: null, status: 'idle' };
  }

  function handleFileSelect(actId: string, files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadStates(prev => ({ ...prev, [actId]: { file: files[0], status: 'selected' } }));
  }

  function handleSubmit(actId: string) {
    const st = getState(actId);
    if (!st.file) return;
    setUploadStates(prev => ({ ...prev, [actId]: { ...prev[actId], status: 'uploading' } }));
    setTimeout(() => {
      setUploadStates(prev => ({ ...prev, [actId]: { ...prev[actId], status: 'submitted' } }));
    }, 1400);
  }

  function handleReupload(actId: string) {
    setUploadStates(prev => ({ ...prev, [actId]: { file: null, status: 'idle' } }));
    // Reset file input
    const ref = fileInputRefs.current[actId];
    if (ref) ref.value = '';
  }

  function clearFile(actId: string) {
    setUploadStates(prev => ({ ...prev, [actId]: { file: null, status: 'idle' } }));
    const ref = fileInputRefs.current[actId];
    if (ref) ref.value = '';
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'materiales', label: 'Materiales', icon: FileText },
    { id: 'actividades', label: 'Actividades', icon: ClipboardList },
  ];

  /** Detecta si la actividad es de tipo Examen por el prefijo [Examen] en el título */
  function isExamen(title: string) {
    return title.toLowerCase().startsWith('[examen]');
  }

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-8 space-y-6">
      {/* Breadcrumb + Header */}
      <div>
        <Link to="/alumno/cursos" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4">
          <ChevronLeft className="size-4" /> Mis Cursos
        </Link>

        <div className={`rounded-2xl ${c.bg} p-6 text-white`}>
          <div className="flex items-start gap-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-white/20">
              <BookOpen className="size-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-white">{course.name}</h1>
              <p className="text-sm text-white/80 mt-0.5">{course.teacher}</p>
              <p className="text-xs text-white/60 mt-1.5">{course.schedule} · {course.grade}° {course.level} — Sección {course.section}</p>
            </div>
            <div className="hidden sm:flex flex-col items-end gap-1">
              <p className="text-xs text-white/60">Promedio Bim. II</p>
              <p className="text-3xl font-bold text-white leading-none">{avgB2 !== null ? avgB2.toFixed(1) : '—'}</p>
              {avgB2 !== null && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-white/20 text-white border border-white/30">
                  {gradeToLiteral(avgB2)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto sm:inline-flex">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 sm:flex-none justify-center
              ${activeTab === tab.id
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'}`}
          >
            <tab.icon className="size-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Materiales */}
      {activeTab === 'materiales' && (
        <div className="space-y-3">
          {materials.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <FileText className="size-10 text-slate-200 mb-3" />
              <p className="text-slate-500">No hay materiales publicados aún</p>
            </div>
          ) : materials.map(mat => (
            <div key={mat.id} className="flex items-center gap-4 bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-sm transition-shadow">
              <div className={`flex size-10 items-center justify-center rounded-xl shrink-0 ${
                // 🔄 Corrección #9: 'pdf' → 'PDF', 'link' → 'enlace' (ENUM academic_schema.tipo_material)
                mat.type === 'PDF' ? 'bg-red-50' : 'bg-blue-50'
              }`}>
                {mat.type === 'PDF'
                  ? <FileText className="size-5 text-red-600" />
                  : <ExternalLink className="size-5 text-blue-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{mat.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Publicado el {mat.date}{mat.size ? ` · ${mat.size}` : ''}
                </p>
              </div>
              <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                mat.type === 'PDF'
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  : 'bg-blue-50 hover:bg-blue-100 text-blue-700'
              }`}>
                {mat.type === 'PDF' ? <Download className="size-3.5" /> : <ExternalLink className="size-3.5" />}
                {mat.type === 'PDF' ? 'Descargar' : 'Abrir enlace'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Actividades */}
      {activeTab === 'actividades' && (
        <div className="space-y-3">
          {activities.map(act => {
            const st = getState(act.id);
            const isSubmitted = st.status === 'submitted' || act.status === 'submitted';
            const isGraded = act.status === 'graded';
            const effectiveStatus = isGraded ? 'graded' : isSubmitted ? 'submitted' : 'pending';
            const examen = isExamen(act.title);

            return (
              <div key={act.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Activity type icon */}
                    <div className={`flex size-9 items-center justify-center rounded-xl shrink-0 mt-0.5 ${
                      examen
                        ? 'bg-red-50 border border-red-200'
                        : 'bg-indigo-50 border border-indigo-100'
                    }`}>
                      {examen
                        ? <GraduationCap className="size-4 text-red-600" />
                        : <ClipboardList className="size-4 text-indigo-500" />
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-slate-800">{act.title}</h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                          effectiveStatus === 'pending'   ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          effectiveStatus === 'submitted' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {effectiveStatus === 'pending'   ? <><Clock className="size-3" /> Pendiente</> :
                           effectiveStatus === 'submitted' ? <><CheckCircle2 className="size-3" /> Entregado</> :
                           <><CheckCircle2 className="size-3" /> Calificado</>}
                        </span>
                        {examen && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                            <GraduationCap className="size-3" /> Examen
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Fecha límite: <span className="font-medium">{act.dueDate}</span> · Puntaje máx: {act.maxScore} pts
                      </p>
                    </div>
                  </div>
                  {act.score !== null && (
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-bold text-slate-800">{act.score}</p>
                      <p className="text-xs text-slate-400">/20</p>
                    </div>
                  )}
                </div>

                <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-3 mb-4">
                  {act.instructions}
                </p>

                {/* Upload area — pending or allow re-upload */}
                {(effectiveStatus === 'pending' || (effectiveStatus === 'submitted' && !isGraded)) && (
                  <div className="space-y-3">
                    {/* Hidden file input */}
                    <input
                      ref={el => { fileInputRefs.current[act.id] = el; }}
                      type="file"
                      accept=".pdf,.docx,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      className="hidden"
                      onChange={e => handleFileSelect(act.id, e.target.files)}
                    />

                    {effectiveStatus === 'submitted' ? (
                      /* Already submitted — show re-upload option */
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3">
                        <div className="flex items-center gap-2 flex-1">
                          <CheckCircle2 className="size-4 text-blue-500 shrink-0" />
                          <p className="text-sm text-blue-700 font-medium">
                            {st.file ? st.file.name : 'Tu entrega fue recibida.'}
                          </p>
                        </div>
                        <button
                          onClick={() => handleReupload(act.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-blue-100 border border-blue-300 text-blue-700 rounded-lg text-xs font-medium transition-colors shrink-0"
                        >
                          <RefreshCw className="size-3.5" /> Volver a entregar
                        </button>
                      </div>
                    ) : st.status === 'uploading' ? (
                      <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
                        <svg className="animate-spin size-4 text-blue-600 shrink-0" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        <p className="text-sm text-blue-700">Enviando archivo…</p>
                      </div>
                    ) : st.status === 'selected' && st.file ? (
                      /* File selected, ready to submit */
                      <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <Paperclip className="size-4 text-slate-500 shrink-0" />
                        <p className="text-sm text-slate-700 flex-1 truncate font-medium">{st.file.name}</p>
                        <span className="text-xs text-slate-400 shrink-0">
                          {(st.file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                        <button onClick={() => clearFile(act.id)} className="p-1 rounded-lg hover:bg-slate-200 transition-colors shrink-0">
                          <X className="size-3.5 text-slate-500" />
                        </button>
                      </div>
                    ) : (
                      /* Drop zone */
                      <button
                        onClick={() => fileInputRefs.current[act.id]?.click()}
                        className="w-full border-2 border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 rounded-xl p-5 text-center transition-colors group"
                      >
                        <Upload className="size-6 text-slate-300 group-hover:text-blue-400 mx-auto mb-2 transition-colors" />
                        <p className="text-sm text-slate-500 group-hover:text-blue-600 transition-colors">
                          Haz clic para seleccionar tu archivo
                        </p>
                        <p className="text-xs text-slate-400 mt-1">PDF · DOCX · XLSX · Máx. 10 MB</p>
                      </button>
                    )}

                    {/* Submit button (only when file selected) */}
                    {st.status === 'selected' && st.file && (
                      <button
                        onClick={() => handleSubmit(act.id)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                      >
                        <Upload className="size-4" /> Entregar actividad
                      </button>
                    )}

                    {/* Idle state: show button to trigger file picker */}
                    {st.status === 'idle' && (
                      <button
                        onClick={() => fileInputRefs.current[act.id]?.click()}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                      >
                        <Upload className="size-4" /> Entregar actividad
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}