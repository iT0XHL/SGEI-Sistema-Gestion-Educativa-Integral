import { useEffect, useState } from 'react';
import { Loader2, Users, Layers, Coffee } from 'lucide-react';
import {
  asignacionesApi,
  cargarDocentes, cargarCursos, cargarSecciones, cargarGrados, cargarNiveles,
  obtenerPeriodoActivo,
  type DocenteRow, type CursoRow, type SeccionRow, type GradoRow,
  type PeriodoRow, type AsignacionRow, type NivelRow,
} from '@/lib/api/horarios.api';
import { AdminHorariosPorDocente } from './horarios/AdminHorariosPorDocente';
import { AdminHorariosPorSeccion } from './horarios/AdminHorariosPorSeccion';
import { AdminHorarioDescansos } from './horarios/AdminHorarioDescansos';

type Tab = 'docente' | 'seccion' | 'descansos';

export default function AdminHorarios() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('docente');

  const [docentes, setDocentes] = useState<DocenteRow[]>([]);
  const [cursos, setCursos] = useState<CursoRow[]>([]);
  const [secciones, setSecciones] = useState<SeccionRow[]>([]);
  const [grados, setGrados] = useState<GradoRow[]>([]);
  const [niveles, setNiveles] = useState<NivelRow[]>([]);
  const [periodoActivo, setPeriodoActivo] = useState<PeriodoRow | null>(null);
  const [asignaciones, setAsignaciones] = useState<AsignacionRow[]>([]);

  useEffect(() => {
    async function loadMasterData() {
      try {
        setLoading(true);
        const [docsData, cursosData, seccionesData, gradosData, nivelesData, periodoAct] = await Promise.all([
          cargarDocentes(),
          cargarCursos(),
          cargarSecciones(),
          cargarGrados(),
          cargarNiveles(),
          obtenerPeriodoActivo(),
        ]);
        setDocentes(docsData);
        setCursos(cursosData);
        setSecciones(seccionesData);
        setGrados(gradosData);
        setNiveles(nivelesData);
        setPeriodoActivo(periodoAct);

        if (periodoAct) {
          const asignacionesData = await asignacionesApi.listar({ periodoId: periodoAct.id });
          setAsignaciones(asignacionesData);
        }
      } catch (err) {
        console.error('Error loading master data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadMasterData();
  }, []);

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl mx-auto flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!periodoActivo) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
          ⚠ No hay período académico activo. Crea uno primero.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Horarios Escolares</h1>
        <p className="text-sm text-slate-500 mt-0.5">{periodoActivo.nombre} {periodoActivo.anio}</p>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setTab('docente')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'docente' ? 'border-slate-800 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users className="size-4" /> Horarios por Docente
        </button>
        <button
          onClick={() => setTab('seccion')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'seccion' ? 'border-slate-800 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Layers className="size-4" /> Horarios por Grado y Sección
        </button>
        <button
          onClick={() => setTab('descansos')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'descansos' ? 'border-slate-800 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Coffee className="size-4" /> Recreo y Refrigerio
        </button>
      </div>

      {tab === 'docente' && (
        <AdminHorariosPorDocente
          periodoActivo={periodoActivo}
          docentes={docentes}
          cursos={cursos}
          secciones={secciones}
          grados={grados}
          asignaciones={asignaciones}
        />
      )}
      {tab === 'seccion' && (
        <AdminHorariosPorSeccion
          periodoActivo={periodoActivo}
          docentes={docentes}
          cursos={cursos}
          secciones={secciones}
          grados={grados}
          asignaciones={asignaciones}
        />
      )}
      {tab === 'descansos' && (
        <AdminHorarioDescansos periodoActivo={periodoActivo} niveles={niveles} />
      )}
    </div>
  );
}
