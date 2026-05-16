// ============================================================
// SGEI — Sistema de Gestión Educativa Integral
// Mock Data — Production-realistic Peruvian school data
// ============================================================

export type Role = 'Alumno' | 'Docente' | 'Admin' | 'Secretaria';

export const USERS = {
  Alumno:     { id: 'u1', name: 'Carlos Mendoza Ramos',   role: 'Alumno'     as Role, initials: 'CM', email: 'carlos.mendoza@sgei.edu.pe',   grade: '3°', section: 'A', level: 'Secundaria', year: '2025', hasDebt: false },
  Docente:    { id: 'u2', name: 'Prof. Ana García Vega',  role: 'Docente'    as Role, initials: 'AG', email: 'ana.garcia@sgei.edu.pe',         subject: 'Matemática' },
  Admin:      { id: 'u3', name: 'Dir. Roberto Vega León', role: 'Admin'      as Role, initials: 'RV', email: 'director@sgei.edu.pe' },
  Secretaria: { id: 'u4', name: 'Lucía Torres Paredes',   role: 'Secretaria' as Role, initials: 'LT', email: 'secretaria@sgei.edu.pe' },
};

export const NOTIFICATIONS = [
  { id: 'n1', type: 'warning', message: 'Fecha límite de pago: 30 de mayo 2025', time: 'hace 1 hora',   read: false },
  { id: 'n2', type: 'info',    message: 'Nueva tarea publicada: Matemáticas — Sistemas de ecuaciones', time: 'hace 3 horas', read: false },
  { id: 'n3', type: 'success', message: 'Nota registrada: Comunicación — Ensayo argumentativo', time: 'ayer', read: true },
  { id: 'n4', type: 'info',    message: 'Reunión de padres de familia: 20 de mayo, 3:00 PM', time: 'hace 2 días', read: true },
  { id: 'n5', type: 'warning', message: 'Subir voucher de pago de mayo antes del día 10', time: 'hace 3 días', read: true },
];

export type CourseColor = 'blue' | 'emerald' | 'amber' | 'purple' | 'red' | 'pink' | 'indigo' | 'teal' | 'orange';

export interface Course {
  id: string; name: string; teacher: string; teacherId: string;
  grade: string; section: string; level: string;
  color: CourseColor; schedule: string; nextActivity: string;
  pendingReviews: number; totalStudents: number;
  description: string;
}

export const COURSES: Course[] = [
  { id: 'c1', name: 'Matemática',           teacher: 'Prof. Ana García',      teacherId: 't1', grade: '3°', section: 'A', level: 'Secundaria', color: 'blue',    schedule: 'Lun, Mié, Vie  08:00–09:00', nextActivity: 'Sistemas de ecuaciones',  pendingReviews: 5, totalStudents: 28, description: 'Álgebra, aritmética y razonamiento matemático según CNEB' },
  { id: 'c2', name: 'Comunicación',         teacher: 'Prof. José Ramos',      teacherId: 't2', grade: '3°', section: 'A', level: 'Secundaria', color: 'emerald', schedule: 'Mar, Jue       08:00–09:45', nextActivity: 'Comprensión lectora',     pendingReviews: 3, totalStudents: 28, description: 'Lectura, escritura y comunicación oral' },
  { id: 'c3', name: 'Ciencias Sociales',    teacher: 'Prof. María Lupaca',    teacherId: 't3', grade: '3°', section: 'A', level: 'Secundaria', color: 'amber',   schedule: 'Lun, Jue       10:00–11:00', nextActivity: 'La Colonia en el Perú',   pendingReviews: 7, totalStudents: 28, description: 'Historia, geografía y economía' },
  { id: 'c4', name: 'Ciencia y Tecnología', teacher: 'Prof. Luis Quispe',     teacherId: 't4', grade: '3°', section: 'A', level: 'Secundaria', color: 'purple',  schedule: 'Mar, Vie       11:00–12:00', nextActivity: 'Leyes de Newton',         pendingReviews: 4, totalStudents: 28, description: 'Biología, física, química y método científico' },
  { id: 'c5', name: 'Inglés',               teacher: 'Prof. Sandra Flores',   teacherId: 't5', grade: '3°', section: 'A', level: 'Secundaria', color: 'indigo',  schedule: 'Lun, Mié       13:00–14:00', nextActivity: 'Simple Past Tense',       pendingReviews: 2, totalStudents: 28, description: 'Inglés comunicativo nivel A2-B1' },
  { id: 'c6', name: 'Ed. Física',           teacher: 'Prof. Marco Benítez',   teacherId: 't6', grade: '3°', section: 'A', level: 'Secundaria', color: 'red',     schedule: 'Mié, Vie       14:00–15:00', nextActivity: 'Atletismo — velocidad',   pendingReviews: 1, totalStudents: 28, description: 'Actividad física, deporte y salud' },
  { id: 'c7', name: 'Arte y Cultura',       teacher: 'Prof. Carmen Huanca',   teacherId: 't7', grade: '3°', section: 'A', level: 'Secundaria', color: 'pink',    schedule: 'Jue            15:00–16:00', nextActivity: 'Pintura expresionista',   pendingReviews: 0, totalStudents: 28, description: 'Expresión artística, música y danza' },
  { id: 'c8', name: 'Ed. para el Trabajo',  teacher: 'Prof. Ricardo Mamani',  teacherId: 't8', grade: '3°', section: 'A', level: 'Secundaria', color: 'teal',    schedule: 'Mar            15:00–16:00', nextActivity: 'Emprendimiento digital',  pendingReviews: 2, totalStudents: 28, description: 'Habilidades técnicas y emprendimiento' },
];

export const COLOR_MAP: Record<CourseColor, { bg: string; light: string; text: string; border: string; dot: string }> = {
  blue:    { bg: 'bg-blue-600',    light: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    dot: 'bg-blue-500'    },
  emerald: { bg: 'bg-emerald-600', light: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  amber:   { bg: 'bg-amber-500',   light: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500'   },
  purple:  { bg: 'bg-purple-600',  light: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200',  dot: 'bg-purple-500'  },
  red:     { bg: 'bg-red-500',     light: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     dot: 'bg-red-500'     },
  pink:    { bg: 'bg-pink-500',    light: 'bg-pink-50',    text: 'text-pink-700',    border: 'border-pink-200',    dot: 'bg-pink-500'    },
  indigo:  { bg: 'bg-indigo-600',  light: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200',  dot: 'bg-indigo-500'  },
  teal:    { bg: 'bg-teal-600',    light: 'bg-teal-50',    text: 'text-teal-700',    border: 'border-teal-200',    dot: 'bg-teal-500'    },
  orange:  { bg: 'bg-orange-500',  light: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200',  dot: 'bg-orange-500'  },
};

export const STUDENTS_3A = [
  { id: 's1',  name: 'Adriana Castillo Puma',      initials: 'AC', present: 23, late: 1, absent: 1, total: 25 },
  { id: 's2',  name: 'Benjamín Cruz Torres',       initials: 'BC', present: 24, late: 0, absent: 1, total: 25 },
  { id: 's3',  name: 'Carlos Mendoza Ramos',       initials: 'CM', present: 22, late: 2, absent: 1, total: 25 },
  { id: 's4',  name: 'Diana Flores Ccari',         initials: 'DF', present: 20, late: 3, absent: 2, total: 25 },
  { id: 's5',  name: 'Eduardo Quispe Lima',        initials: 'EQ', present: 25, late: 0, absent: 0, total: 25 },
  { id: 's6',  name: 'Fernanda Mamani Condori',    initials: 'FM', present: 21, late: 2, absent: 2, total: 25 },
  { id: 's7',  name: 'Gabriel Herrera Apaza',      initials: 'GH', present: 18, late: 4, absent: 3, total: 25 },
  { id: 's8',  name: 'Hilda Lazo Vilca',           initials: 'HL', present: 24, late: 1, absent: 0, total: 25 },
  { id: 's9',  name: 'Iván Paredes Salas',         initials: 'IP', present: 22, late: 1, absent: 2, total: 25 },
  { id: 's10', name: 'Juliana Ramos Pacori',       initials: 'JR', present: 23, late: 0, absent: 2, total: 25 },
  { id: 's11', name: 'Kevin Salinas Huanca',       initials: 'KS', present: 19, late: 3, absent: 3, total: 25 },
  { id: 's12', name: 'Luciana Vargas Cano',        initials: 'LV', present: 25, late: 0, absent: 0, total: 25 },
];

export const COMPETENCIES: Record<string, string[]> = {
  'c1': ['Resuelve problemas de cantidad', 'Resuelve problemas de regularidad, equivalencia y cambio', 'Resuelve problemas de gestión de datos', 'Resuelve problemas de forma, movimiento y localización'],
  'c2': ['Se comunica oralmente en su lengua materna', 'Lee diversos tipos de textos escritos', 'Escribe diversos tipos de textos'],
  'c3': ['Construye interpretaciones históricas', 'Gestiona responsablemente el espacio y ambiente', 'Gestiona responsablemente los recursos económicos'],
  'c4': ['Indaga mediante métodos científicos', 'Explica el mundo físico', 'Diseña y construye soluciones tecnológicas', 'Evalúa y comunica el quehacer científico'],
  'c5': ['Se comunica en inglés oralmente', 'Lee textos en inglés', 'Escribe textos en inglés'],
  'c6': ['Se desenvuelve de manera autónoma motrizmente', 'Asume una vida saludable', 'Interactúa a través de sus habilidades sociomotrices'],
  'c7': ['Aprecia de manera crítica manifestaciones artísticas', 'Crea proyectos desde los lenguajes artísticos'],
  'c8': ['Gestiona proyectos de emprendimiento económico y social'],
};

export const STUDENT_GRADES_B2: Record<string, number[]> = {
  'c1': [16, 15, 14, 17],
  'c2': [15, 14, 16],
  'c3': [13, 14, 15],
  'c4': [16, 15, 14, 13],
  'c5': [14, 15, 14],
  'c6': [17, 16, 18],
  'c7': [15, 16],
  'c8': [14],
};

export const STUDENT_GRADES_B1: Record<string, number[]> = {
  'c1': [14, 13, 12, 15],
  'c2': [14, 13, 15],
  'c3': [12, 13, 14],
  'c4': [15, 14, 13, 12],
  'c5': [13, 14, 13],
  'c6': [16, 15, 17],
  'c7': [14, 15],
  'c8': [13],
};

export const PAYMENTS = [
  { id: 'p1', month: 'Enero',    year: 2025, amount: 350, status: 'paid' as const,    paidDate: '05/01/2025', voucher: null },
  { id: 'p2', month: 'Febrero',  year: 2025, amount: 350, status: 'paid' as const,    paidDate: '03/02/2025', voucher: null },
  { id: 'p3', month: 'Marzo',    year: 2025, amount: 350, status: 'paid' as const,    paidDate: '07/03/2025', voucher: null },
  { id: 'p4', month: 'Abril',    year: 2025, amount: 350, status: 'paid' as const,    paidDate: '04/04/2025', voucher: null },
  { id: 'p5', month: 'Mayo',     year: 2025, amount: 350, status: 'pending' as const, paidDate: null,         voucher: null },
  { id: 'p6', month: 'Junio',    year: 2025, amount: 350, status: 'pending' as const, paidDate: null,         voucher: null },
  { id: 'p7', month: 'Julio',    year: 2025, amount: 350, status: 'pending' as const, paidDate: null,         voucher: null },
  { id: 'p8', month: 'Agosto',   year: 2025, amount: 350, status: 'pending' as const, paidDate: null,         voucher: null },
  { id: 'p9', month: 'Setiembre',year: 2025, amount: 350, status: 'pending' as const, paidDate: null,         voucher: null },
  { id: 'p10',month: 'Octubre',  year: 2025, amount: 350, status: 'pending' as const, paidDate: null,         voucher: null },
  { id: 'p11',month: 'Noviembre',year: 2025, amount: 350, status: 'pending' as const, paidDate: null,         voucher: null },
  { id: 'p12',month: 'Diciembre',year: 2025, amount: 350, status: 'pending' as const, paidDate: null,         voucher: null },
];

export const PENDING_VOUCHERS = [
  { id: 'v1', studentName: 'Valentina Torres Lima',   grade: '3° A', month: 'Mayo 2025',   amount: 350, uploadDate: '03/05/2025', status: 'pending' as const, initials: 'VT' },
  { id: 'v2', studentName: 'Fernando Quispe Apaza',   grade: '2° B', month: 'Mayo 2025',   amount: 350, uploadDate: '02/05/2025', status: 'pending' as const, initials: 'FQ' },
  { id: 'v3', studentName: 'Margarita Loza Ccopa',    grade: '1° A', month: 'Abril 2025',  amount: 350, uploadDate: '28/04/2025', status: 'pending' as const, initials: 'ML' },
  { id: 'v4', studentName: 'Rodrigo Mamani Flores',   grade: '4° A', month: 'Mayo 2025',   amount: 350, uploadDate: '01/05/2025', status: 'pending' as const, initials: 'RM' },
  { id: 'v5', studentName: 'Patricia Huanca Valero',  grade: '5° B', month: 'Mayo 2025',   amount: 350, uploadDate: '04/05/2025', status: 'pending' as const, initials: 'PH' },
];

export const ALL_PAYMENTS_SEC = [
  { id: 'sp1', studentName: 'Carlos Mendoza Ramos',    grade: '3° A', total: 4200, paid: 1400, pending: 2800, estadoDb: 'Pendiente' as const, fechaVencimiento: '2026-12-31', tienePagosParciales: true  },
  { id: 'sp2', studentName: 'Valentina Torres Lima',   grade: '3° A', total: 4200, paid: 1050, pending: 3150, estadoDb: 'Pendiente' as const, fechaVencimiento: '2026-12-31', tienePagosParciales: true  },
  { id: 'sp3', studentName: 'Eduardo Quispe Lima',     grade: '3° A', total: 4200, paid: 4200, pending: 0,    estadoDb: 'Pagado'    as const, fechaVencimiento: '2025-12-31', tienePagosParciales: false },
  { id: 'sp4', studentName: 'Fernanda Mamani Condori', grade: '3° A', total: 4200, paid: 0,    pending: 4200, estadoDb: 'Pendiente' as const, fechaVencimiento: '2025-04-30', tienePagosParciales: false },
  { id: 'sp5', studentName: 'Gabriel Herrera Apaza',  grade: '3° A', total: 4200, paid: 700,  pending: 3500, estadoDb: 'Pendiente' as const, fechaVencimiento: '2025-04-30', tienePagosParciales: false },
  { id: 'sp6', studentName: 'Hilda Lazo Vilca',        grade: '2° B', total: 4200, paid: 4200, pending: 0,    estadoDb: 'Pagado'    as const, fechaVencimiento: '2025-12-31', tienePagosParciales: false },
  { id: 'sp7', studentName: 'Iván Paredes Salas',      grade: '2° B', total: 4200, paid: 2100, pending: 2100, estadoDb: 'Pendiente' as const, fechaVencimiento: '2026-12-31', tienePagosParciales: true  },
  { id: 'sp8', studentName: 'Juliana Ramos Pacori',    grade: '1° A', total: 4200, paid: 3500, pending: 700,  estadoDb: 'Pendiente' as const, fechaVencimiento: '2026-12-31', tienePagosParciales: true  },
];

export const TEACHER_ACCOUNTS = [
  { id: 'ta1', nombres: 'Ana',    apellidoPaterno: 'García',  apellidoMaterno: 'Vega',    name: 'Ana García Vega',      dni: '45231678', role: 'Docente',    subject: 'Matemática',        email: 'ana.garcia@sgei.edu.pe',    status: 'active' as const,   created: '01/03/2025' },
  { id: 'ta2', nombres: 'José',   apellidoPaterno: 'Ramos',   apellidoMaterno: 'Ccopa',   name: 'José Ramos Ccopa',     dni: '45231679', role: 'Docente',    subject: 'Comunicación',      email: 'jose.ramos@sgei.edu.pe',    status: 'active' as const,   created: '01/03/2025' },
  { id: 'ta3', nombres: 'María',  apellidoPaterno: 'Lupaca',  apellidoMaterno: 'Ferro',   name: 'María Lupaca Ferro',   dni: '45231680', role: 'Docente',    subject: 'Ciencias Sociales', email: 'maria.lupaca@sgei.edu.pe',  status: 'active' as const,   created: '01/03/2025' },
  { id: 'ta4', nombres: 'Luis',   apellidoPaterno: 'Quispe',  apellidoMaterno: 'Apaza',   name: 'Luis Quispe Apaza',    dni: '45231681', role: 'Docente',    subject: 'C. y Tecnología',   email: 'luis.quispe@sgei.edu.pe',   status: 'active' as const,   created: '01/03/2025' },
  { id: 'ta5', nombres: 'Sandra', apellidoPaterno: 'Flores',  apellidoMaterno: 'Lima',    name: 'Sandra Flores Lima',   dni: '45231682', role: 'Docente',    subject: 'Inglés',            email: 'sandra.flores@sgei.edu.pe', status: 'active' as const,   created: '01/03/2025' },
  { id: 'ta6', nombres: 'Lucía',  apellidoPaterno: 'Torres',  apellidoMaterno: 'Paredes', name: 'Lucía Torres Paredes', dni: '45231683', role: 'Secretaría', subject: '—',                 email: 'secretaria@sgei.edu.pe',    status: 'active' as const,   created: '01/03/2025' },
  { id: 'ta7', nombres: 'Marco',  apellidoPaterno: 'Benítez', apellidoMaterno: 'Soto',    name: 'Marco Benítez Soto',   dni: '45231684', role: 'Docente',    subject: 'Ed. Física',        email: 'marco.benitez@sgei.edu.pe', status: 'inactive' as const, created: '15/03/2025' },
];

export const SCHEDULE = [
  { id: 'h1',  day: 'Lunes',     start: '08:00', end: '09:00', course: 'Matemática',           grade: '3° A', teacher: 'Prof. Ana García',    room: 'Aula 301', color: 'blue'    },
  { id: 'h2',  day: 'Lunes',     start: '09:00', end: '10:00', course: 'Comunicación',         grade: '2° B', teacher: 'Prof. José Ramos',    room: 'Aula 202', color: 'emerald' },
  { id: 'h3',  day: 'Lunes',     start: '10:00', end: '11:00', course: 'Ciencias Sociales',    grade: '3° A', teacher: 'Prof. María Lupaca',  room: 'Aula 301', color: 'amber'   },
  { id: 'h4',  day: 'Martes',    start: '08:00', end: '09:45', course: 'Comunicación',         grade: '3° A', teacher: 'Prof. José Ramos',    room: 'Aula 301', color: 'emerald' },
  { id: 'h5',  day: 'Martes',    start: '11:00', end: '12:00', course: 'C. y Tecnología',      grade: '3° A', teacher: 'Prof. Luis Quispe',   room: 'Lab. Cien.',color: 'purple'  },
  { id: 'h6',  day: 'Miércoles', start: '08:00', end: '09:00', course: 'Matemática',           grade: '3° A', teacher: 'Prof. Ana García',    room: 'Aula 301', color: 'blue'    },
  { id: 'h7',  day: 'Miércoles', start: '13:00', end: '14:00', course: 'Inglés',               grade: '3° A', teacher: 'Prof. Sandra Flores', room: 'Aula 101', color: 'indigo'  },
  { id: 'h8',  day: 'Jueves',    start: '08:00', end: '09:00', course: 'Matemática',           grade: '2° A', teacher: 'Prof. Ana García',    room: 'Aula 201', color: 'blue'    },
  { id: 'h9',  day: 'Jueves',    start: '10:00', end: '11:00', course: 'Ciencias Sociales',    grade: '3° A', teacher: 'Prof. María Lupaca',  room: 'Aula 301', color: 'amber'   },
  { id: 'h10', day: 'Viernes',   start: '08:00', end: '09:00', course: 'Matemática',           grade: '3° A', teacher: 'Prof. Ana García',    room: 'Aula 301', color: 'blue'    },
  { id: 'h11', day: 'Viernes',   start: '11:00', end: '12:00', course: 'C. y Tecnología',      grade: '3° A', teacher: 'Prof. Luis Quispe',   room: 'Lab. Cien.',color: 'purple'  },
  { id: 'h12', day: 'Viernes',   start: '14:00', end: '15:00', course: 'Ed. Física',           grade: '3° A', teacher: 'Prof. Marco Benítez', room: 'Polideportivo', color: 'red' },
];

export const TEACHER_ATTENDANCE = [
  { id: 'tatt1', name: 'Ana García Vega',    initials: 'AG', subject: 'Matemática',        status: 'present' as const },
  { id: 'tatt2', name: 'José Ramos Ccopa',   initials: 'JR', subject: 'Comunicación',      status: 'present' as const },
  { id: 'tatt3', name: 'María Lupaca Ferro', initials: 'ML', subject: 'Ciencias Sociales', status: 'late'    as const },
  { id: 'tatt4', name: 'Luis Quispe Apaza',  initials: 'LQ', subject: 'C. y Tecnología',   status: 'absent'  as const },
  { id: 'tatt5', name: 'Sandra Flores Lima', initials: 'SF', subject: 'Inglés',            status: 'present' as const },
  { id: 'tatt6', name: 'Marco Benítez Soto', initials: 'MB', subject: 'Ed. Física',        status: 'present' as const },
  { id: 'tatt7', name: 'Carmen Huanca Rios', initials: 'CH', subject: 'Arte y Cultura',    status: null      as null },
  { id: 'tatt8', name: 'Ricardo Mamani Paz', initials: 'RM', subject: 'Ed. para el Trabajo',status: null     as null },
];

export const GRADE_ENTRIES: Record<string, Record<string, number | null>> = {
  s1:  { comp1: 16, comp2: 15, comp3: 14, comp4: 17 },
  s2:  { comp1: 18, comp2: 17, comp3: 16, comp4: 18 },
  s3:  { comp1: 14, comp2: 13, comp3: 15, comp4: 14 },
  s4:  { comp1: 12, comp2: 11, comp3: 13, comp4: 12 },
  s5:  { comp1: 20, comp2: 19, comp3: 18, comp4: 20 },
  s6:  { comp1: 13, comp2: 14, comp3: 12, comp4: 15 },
  s7:  { comp1: 10, comp2: 11, comp3: 9,  comp4: 10 },
  s8:  { comp1: 17, comp2: 16, comp3: 17, comp4: 16 },
  s9:  { comp1: null, comp2: null, comp3: null, comp4: null },
  s10: { comp1: 15, comp2: 14, comp3: 16, comp4: 14 },
  s11: { comp1: 11, comp2: 10, comp3: 12, comp4: 11 },
  s12: { comp1: 19, comp2: 18, comp3: 19, comp4: 20 },
};

export const MATERIALS = [
  { id: 'm1', title: 'Guía de Álgebra — Capítulo 3',               type: 'PDF',    date: '28/04/2025', size: '2.4 MB', courseId: 'c1' },
  { id: 'm2', title: 'Ejercicios de Factorización',                 type: 'PDF',    date: '22/04/2025', size: '1.1 MB', courseId: 'c1' },
  { id: 'm3', title: 'Video: Ecuaciones cuadráticas (Khan Academy)', type: 'enlace', date: '18/04/2025', size: null,     courseId: 'c1' },
  { id: 'm4', title: 'Formulario de Geometría analítica',           type: 'PDF',    date: '10/04/2025', size: '890 KB', courseId: 'c1' },
];

export const ACTIVITIES = [
  { id: 'act1', title: 'Práctica: Sistemas de ecuaciones 2×2', courseId: 'c1', dueDate: '12/05/2025', maxScore: 20, status: 'pending' as const,    score: null,  instructions: 'Resolver los 10 sistemas de ecuaciones propuestos en la hoja adjunta. Mostrar procedimiento completo.' },
  { id: 'act2', title: 'Tarea: Problemas de aplicación',       courseId: 'c1', dueDate: '05/05/2025', maxScore: 20, status: 'graded' as const,     score: 16,    instructions: 'Resolver 5 problemas de aplicación de álgebra en contextos reales.' },
  { id: 'act3', title: 'Práctica calificada N° 2',             courseId: 'c1', dueDate: '28/04/2025', maxScore: 20, status: 'graded' as const,     score: 15,    instructions: 'Práctica de clase sobre factorización y simplificación.' },
  { id: 'act4', title: 'Proyecto: Maqueta geométrica',         courseId: 'c1', dueDate: '20/05/2025', maxScore: 20, status: 'submitted' as const,  score: null,  instructions: 'Construir una maqueta 3D que represente sólidos geométricos con sus medidas.' },
];

export function gradeToLiteral(grade: number | null): string {
  if (grade === null) return '—';
  if (grade >= 18) return 'AD';
  if (grade >= 14) return 'A';
  if (grade >= 11) return 'B';
  return 'C';
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

export function avg(grades: (number | null)[]): string {
  const valid = grades.filter(g => g !== null) as number[];
  if (valid.length === 0) return '—';
  return (valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1);
}