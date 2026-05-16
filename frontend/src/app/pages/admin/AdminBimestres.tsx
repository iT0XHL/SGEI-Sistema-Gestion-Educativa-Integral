import { useState } from 'react';
import { BookMarked, CheckCircle2, AlertTriangle, Lock } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '../../components/ui/alert-dialog';

interface Bimestre {
  id: string;
  numero: number;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  cerrado: boolean;
}

// Período activo simulado (viene de AdminPeriodo)
const PERIODO_ACTIVO = { nombre: 'Año Escolar 2025', activo: true };

const MOCK_BIMESTRES: Bimestre[] = [
  { id: 'b1', numero: 1, nombre: 'Bimestre I',   fecha_inicio: '2025-03-10', fecha_fin: '2025-05-16', cerrado: true },
  { id: 'b2', numero: 2, nombre: 'Bimestre II',  fecha_inicio: '2025-05-19', fecha_fin: '2025-07-25', cerrado: false },
  { id: 'b3', numero: 3, nombre: 'Bimestre III', fecha_inicio: '2025-08-11', fecha_fin: '2025-10-17', cerrado: false },
  { id: 'b4', numero: 4, nombre: 'Bimestre IV',  fecha_inicio: '2025-10-20', fecha_fin: '2025-12-19', cerrado: false },
];

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}`;
}

export default function AdminBimestres() {
  const [items, setItems] = useState<Bimestre[]>(MOCK_BIMESTRES);

  function handleCerrar(id: string) {
    setItems(prev => prev.map(b => b.id === id ? { ...b, cerrado: true } : b));
    // En producción: await fetch(`/api/bimestres/${id}/cerrar`, { method: 'PATCH' });
  }

  const cerradosCount = items.filter(b => b.cerrado).length;

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <p className="text-sm text-slate-500 mb-1">Panel de administración</p>
        <h1 className="text-2xl font-bold text-slate-900">Bimestres</h1>
        <p className="text-sm text-slate-500 mt-0.5">Gestiona los bimestres del período académico activo</p>
      </div>

      {/* Banner período activo */}
      {PERIODO_ACTIVO.activo ? (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
          <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">Período activo: {PERIODO_ACTIVO.nombre}</p>
            <p className="text-xs text-emerald-600 mt-0.5">{cerradosCount} de {items.length} bimestres cerrados</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          <AlertTriangle className="size-5 text-amber-600 shrink-0" />
          <p className="text-sm font-medium text-amber-800">
            No hay período académico activo. Crea y activa un período primero en <strong>Período Académico</strong>.
          </p>
        </div>
      )}

      {/* Resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {items.map(b => (
          <div key={b.id} className={`rounded-2xl border p-4 text-center ${b.cerrado ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
            <p className={`text-lg font-bold ${b.cerrado ? 'text-red-700' : 'text-emerald-700'}`}>{b.nombre}</p>
            <p className={`text-xs font-medium mt-0.5 ${b.cerrado ? 'text-red-600' : 'text-emerald-600'}`}>
              {b.cerrado ? '🔒 Cerrado' : '✓ Abierto'}
            </p>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
          <BookMarked className="size-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-700">Bimestres del período activo</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">N°</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nombre</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Fecha inicio</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Fecha fin</th>
                <th className="text-center px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="text-right px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.map(b => (
                <tr key={b.id} className={`hover:bg-slate-50 transition-colors ${b.cerrado ? 'opacity-70' : ''}`}>
                  <td className="px-4 py-3.5 font-semibold text-slate-700">{b.numero}</td>
                  <td className="px-4 py-3.5 text-slate-800">
                    <div className="flex items-center gap-2">
                      {b.cerrado && <Lock className="size-3.5 text-red-500 shrink-0" />}
                      {b.nombre}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 hidden md:table-cell">{formatDate(b.fecha_inicio)}</td>
                  <td className="px-4 py-3.5 text-slate-500 hidden md:table-cell">{formatDate(b.fecha_fin)}</td>
                  <td className="px-4 py-3.5 text-center">
                    {b.cerrado ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        <Lock className="size-3" /> Cerrado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                        <CheckCircle2 className="size-3" /> Abierto
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    {!b.cerrado && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="px-3 py-1.5 rounded-xl text-xs font-medium bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-colors">
                            Cerrar bimestre
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Cerrar {b.nombre}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción es <strong>irreversible</strong>. Al cerrar el bimestre, todas las notas registradas quedarán bloqueadas automáticamente por el sistema y <strong>no podrán modificarse</strong>.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-600 hover:bg-red-700 text-white"
                              onClick={() => handleCerrar(b.id)}
                            >
                              Sí, cerrar bimestre
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
