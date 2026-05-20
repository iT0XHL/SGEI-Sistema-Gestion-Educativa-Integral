// ============================================================
//  lib/courseColors.ts — Paleta de colores compartida para cursos.
//  Importada por AlumnoCursos y AlumnoCursoDetalle para garantizar
//  que el color de cada curso sea consistente entre las dos vistas.
// ============================================================

export type CourseColorKey =
  | 'blue' | 'emerald' | 'amber' | 'purple' | 'red'
  | 'pink' | 'indigo'  | 'teal'  | 'orange';

export interface CourseColor {
  key:    CourseColorKey;
  bg:     string;
  light:  string;
  text:   string;
  border: string;
  dot:    string;
}

export const COURSE_COLORS: CourseColor[] = [
  { key: 'blue',    bg: 'bg-blue-600',    light: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    dot: 'bg-blue-500'    },
  { key: 'emerald', bg: 'bg-emerald-600', light: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  { key: 'amber',   bg: 'bg-amber-500',   light: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500'   },
  { key: 'purple',  bg: 'bg-purple-600',  light: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200',  dot: 'bg-purple-500'  },
  { key: 'red',     bg: 'bg-red-500',     light: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     dot: 'bg-red-500'     },
  { key: 'pink',    bg: 'bg-pink-500',    light: 'bg-pink-50',    text: 'text-pink-700',    border: 'border-pink-200',    dot: 'bg-pink-500'    },
  { key: 'indigo',  bg: 'bg-indigo-600',  light: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200',  dot: 'bg-indigo-500'  },
  { key: 'teal',    bg: 'bg-teal-600',    light: 'bg-teal-50',    text: 'text-teal-700',    border: 'border-teal-200',    dot: 'bg-teal-500'    },
  { key: 'orange',  bg: 'bg-orange-500',  light: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200',  dot: 'bg-orange-500'  },
];

/** Devuelve el color asignado a un curso por su posición original en la lista. */
export function getCourseColor(index: number): CourseColor {
  return COURSE_COLORS[index % COURSE_COLORS.length];
}

export function literalColor(literal: string): string {
  switch (literal) {
    case 'AD': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    case 'A':  return 'text-blue-700 bg-blue-50 border-blue-200';
    case 'B':  return 'text-amber-700 bg-amber-50 border-amber-200';
    case 'C':  return 'text-red-700 bg-red-50 border-red-200';
    default:   return 'text-slate-500 bg-slate-50 border-slate-200';
  }
}

export function gradeToLiteral(grade: number): string {
  if (grade >= 18) return 'AD';
  if (grade >= 14) return 'A';
  if (grade >= 11) return 'B';
  return 'C';
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}
