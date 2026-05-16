Eres un desarrollador frontend senior especializado en React/TypeScript. 
Debes corregir 6 bugs de TIPOS DE DATOS donde el frontend envía valores 
que no coinciden con los ENUMs, CHECKs o tipos exactos que espera PostgreSQL. 
Ningún cambio requiere modificar la base de datos — todos son ajustes de 
transformación y mapeo en el frontend.

El proyecto usa React + TypeScript + Tailwind. Los archivos clave son:
- src/app/pages/secretaria/SecretariaAlumnos.tsx
- src/app/data/mockData.ts
- src/app/pages/docente/DocenteNotas.tsx
- src/app/pages/secretaria/SecretariaVouchers.tsx
- src/app/pages/alumno/AlumnoPagos.tsx
- src/app/components/layout/AppShell.tsx  (o donde se gestione el rol del usuario)
- src/app/pages/secretaria/SecretariaPagos.tsx

═══════════════════════════════════════════════════════════════════
CORRECCIÓN #8 — SecretariaAlumnos (Campo Sexo)
Archivo: src/app/pages/secretaria/SecretariaAlumnos.tsx
═══════════════════════════════════════════════════════════════════

PROBLEMA:
El formulario captura sexo como 'Masculino' o 'Femenino' (strings completos).
La columna PostgreSQL es: sexo CHAR(1) NOT NULL CHECK (sexo IN ('M', 'F')).
Si se inserta 'Masculino' directamente, PostgreSQL lanza error de longitud o 
de CHECK constraint.

SOLUCIÓN — en la función handleCreate(), antes del INSERT, transformar:

```typescript
// 🔄 Transformar antes de enviar a la DB
const sexoDb = form.sexo === 'Masculino' ? 'M' : 'F';

// El payload correcto es:
const payload = {
  ...otrosCampos,
  sexo: sexoDb,  // 'M' o 'F' — nunca 'Masculino'/'Femenino'
};
```

IMPORTANTE: Esta transformación va SOLO en el payload del INSERT. 
El selector del formulario puede seguir mostrando 'Masculino'/'Femenino' 
al usuario — eso es correcto para la UX. Solo la variable enviada a la DB cambia.

═══════════════════════════════════════════════════════════════════
CORRECCIÓN #9 — mockData.ts + AlumnoCursoDetalle / DocenteTareas
Archivo principal: src/app/data/mockData.ts
═══════════════════════════════════════════════════════════════════

PROBLEMA:
El mockData usa type: 'link' para materiales. 
El ENUM de PostgreSQL academic_schema.tipo_material tiene los valores:
'PDF' | 'enlace' | 'video' | 'imagen' | 'otro'
El valor 'link' no existe en el ENUM → error de tipo en INSERT.
Además, 'pdf' (minúsculas) tampoco es válido → debe ser 'PDF'.

SOLUCIÓN — en mockData.ts, hacer un reemplazo global:

1. Buscar todas las ocurrencias de   type: 'link'   →  reemplazar por   type: 'enlace'
2. Buscar todas las ocurrencias de   type: 'pdf'    →  reemplazar por   type: 'PDF'

Además, en los componentes que usen ese campo como key para mostrar íconos 
o estilos (AlumnoCursoDetalle.tsx, DocenteTareas.tsx), actualizar el mapeo:

```typescript
// ANTES (roto):
const ICON_MAP = { link: <LinkIcon />, pdf: <FileIcon /> };

// DESPUÉS (correcto):
const ICON_MAP = { enlace: <LinkIcon />, PDF: <FileIcon />, ... };
```

Busca en los archivos cualquier switch/case o objeto de mapeo que use 'link' 
o 'pdf' como key y actualízalos a 'enlace' y 'PDF'.

═══════════════════════════════════════════════════════════════════
CORRECCIÓN #10 — DocenteNotas (gradeToLiteral hardcodeado)
Archivo: src/app/pages/docente/DocenteNotas.tsx  
         src/app/data/mockData.ts
═══════════════════════════════════════════════════════════════════

PROBLEMA:
La función gradeToLiteral() usa rangos fijos hardcodeados:
  ≥18 → 'AD', ≥14 → 'A', ≥11 → 'B', <11 → 'C'
La DB configura estos rangos en academic_schema.config_escala_literal por período.
Si el admin cambia los rangos en la DB, el front mostrará literales incorrectos.

SOLUCIÓN:

Paso 1 — Eliminar (o marcar como deprecada) la función gradeToLiteral() de mockData.ts.

Paso 2 — En DocenteNotas.tsx, agregar estado para la escala:
```typescript
const [escalaLiteral, setEscalaLiteral] = useState<EscalaItem[]>([]);

// EscalaItem shape:
interface EscalaItem {
  nota_min: number;
  nota_max: number;
  literal: string; // 'AD' | 'A' | 'B' | 'C'
}
```

Paso 3 — Al montar el componente, cargar la escala desde la API:
```typescript
useEffect(() => {
  // En producción: GET /api/config-escala?periodo_activo=true
  // Mock temporal hasta que el backend esté disponible:
  setEscalaLiteral([
    { nota_min: 18, nota_max: 20, literal: 'AD' },
    { nota_min: 14, nota_max: 17, literal: 'A'  },
    { nota_min: 11, nota_max: 13, literal: 'B'  },
    { nota_min:  0, nota_max: 10, literal: 'C'  },
  ]);
}, []);
```

Paso 4 — Reemplazar toda llamada a gradeToLiteral(n) por una función 
que use el estado `escalaLiteral`:
```typescript
function calcLiteral(nota: number): string {
  const item = escalaLiteral.find(e => nota >= e.nota_min && nota <= e.nota_max);
  return item?.literal ?? '—';
}
```

Paso 5 — En toda la UI donde se muestre el literal de nota, 
usar calcLiteral(nota) en lugar de gradeToLiteral(nota).

═══════════════════════════════════════════════════════════════════
CORRECCIÓN #11 — SecretariaVouchers / AlumnoPagos (Estado del voucher)
Archivos: src/app/store/voucherStore.ts
          src/app/pages/secretaria/SecretariaVouchers.tsx
          src/app/pages/alumno/AlumnoPagos.tsx
═══════════════════════════════════════════════════════════════════

PROBLEMA:
El voucherStore usa los estados: 'submitted' | 'approved' | 'rejected'
El ENUM de PostgreSQL financial_schema.estado_revision_boleta tiene:
'En_Revision' | 'Aprobada' | 'Rechazada'
Si se envían los valores del front directamente, PostgreSQL rechaza el INSERT/UPDATE.

SOLUCIÓN — Crear una capa de mapeo bidireccional en el servicio de API:

En un nuevo archivo src/app/utils/voucherStatusMapper.ts (o en voucherStore.ts):

```typescript
// Mapeo Front → DB (para enviar a la API)
export const toDbStatus = (frontStatus: string): string => {
  const map: Record<string, string> = {
    'submitted': 'En_Revision',
    'approved':  'Aprobada',
    'rejected':  'Rechazada',
  };
  return map[frontStatus] ?? frontStatus;
};

// Mapeo DB → Front (para recibir de la API)
export const toFrontStatus = (dbStatus: string): string => {
  const map: Record<string, string> = {
    'En_Revision': 'submitted',
    'Aprobada':    'approved',
    'Rechazada':   'rejected',
  };
  return map[dbStatus] ?? dbStatus;
};
```

Usar toDbStatus() al enviar el estado en cualquier PATCH/POST a la API.
Usar toFrontStatus() al leer el estado desde la respuesta de la API.
La UI puede seguir usando 'submitted'/'approved'/'rejected' internamente.

═══════════════════════════════════════════════════════════════════
CORRECCIÓN #12 — Login / AppShell (Capitalización de roles)
Archivo: src/app/components/layout/AppShell.tsx
         src/app/pages/Login.tsx (o donde se lea el JWT/sesión)
═══════════════════════════════════════════════════════════════════

PROBLEMA:
El front usa roles en minúsculas: 'alumno' | 'docente' | 'admin' | 'secretaria'
El ENUM de PostgreSQL auth_schema.rol_usuario tiene: 'Admin' | 'Secretaria' | 'Docente' | 'Alumno' (PascalCase)
Los filtros RLS y la lógica de rutas fallan al comparar sin normalizar.

SOLUCIÓN — Al leer el rol desde el JWT o sesión, normalizar inmediatamente:

```typescript
// En el punto donde se lee el rol (login, useAuth, AppShell):
function normalizeRole(rawRole: string): string {
  const roleMap: Record<string, string> = {
    'admin':      'Admin',
    'secretaria': 'Secretaria',
    'docente':    'Docente',
    'alumno':     'Alumno',
  };
  return roleMap[rawRole.toLowerCase()] ?? rawRole;
}

// Ejemplo de uso:
const role = normalizeRole(session.user.role); // 'admin' → 'Admin'
```

Actualizar el tipo Role en TypeScript para que use PascalCase:
```typescript
// ANTES:
type Role = 'alumno' | 'docente' | 'admin' | 'secretaria';

// DESPUÉS:
type Role = 'Alumno' | 'Docente' | 'Admin' | 'Secretaria';
```

Actualizar todas las comparaciones en el código:
  role === 'admin'      →  role === 'Admin'
  role === 'docente'    →  role === 'Docente'
  role === 'alumno'     →  role === 'Alumno'
  role === 'secretaria' →  role === 'Secretaria'

═══════════════════════════════════════════════════════════════════
CORRECCIÓN #13 — SecretariaPagos (Estados 'partial' y 'overdue')
Archivo: src/app/pages/secretaria/SecretariaPagos.tsx
═══════════════════════════════════════════════════════════════════

PROBLEMA:
El front usa status: 'paid' | 'partial' | 'overdue'
El ENUM financial_schema.estado_pago tiene: 'Pendiente' | 'En_Revision' | 'Pagado' | 'Rechazado'
Los valores 'partial' y 'overdue' no existen en la DB → NO deben enviarse en ningún INSERT/UPDATE.

SOLUCIÓN — Derivar 'partial' y 'overdue' en el frontend a partir de los datos reales:

```typescript
// Función helper — calcular estado de presentación desde datos de la API
function calcPaymentDisplayStatus(
  estadoDb: string,
  fechaVencimiento: string,
  tienePagosParciales: boolean
): 'paid' | 'partial' | 'overdue' | 'pending' {
  if (estadoDb === 'Pagado') return 'paid';
  
  const isPending = estadoDb === 'Pendiente' || estadoDb === 'En_Revision';
  if (isPending && new Date(fechaVencimiento) < new Date()) return 'overdue';
  if (isPending && tienePagosParciales) return 'partial';
  return 'pending';
}
```

IMPORTANTE: 
- 'partial' y 'overdue' son SOLO para la UI — nunca se envían a la DB.
- Al hacer PATCH del estado de un pago, usar solo: 'Pendiente' | 'En_Revision' | 'Pagado' | 'Rechazado'
- En el mock actual, reemplazar cualquier status: 'partial' u status: 'overdue' 
  en mockData.ts por el estado DB correspondiente más la lógica de fecha.

═══════════════════════════════════════════════════════════════════
INSTRUCCIONES GENERALES
═══════════════════════════════════════════════════════════════════

1. NO modificar DDL ni estructura de base de datos. Solo frontend.
2. Las correcciones #8, #9, #11, #12 son simples transformaciones de string — 
   no requieren nuevas llamadas a la API.
3. La corrección #10 sí requiere un useEffect con llamada a API (o mock temporal).
4. La corrección #13 es lógica derivada — no requiere llamada a API adicional.
5. Agregar comentarios con el formato:
   // 🔄 Corrección #N — [descripción breve]
6. Prioridad de implementación: #8 → #9 → #11 → #12 → #13 → #10