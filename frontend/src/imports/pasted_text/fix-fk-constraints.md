Debes corregir 4 bugs críticos relacionados con 
Foreign Keys no resueltas en el proyecto. En todos los casos, el frontend envía strings 
legibles por humanos (nombres, letras, IDs mock) en lugar de los UUIDs reales que 
requiere la base de datos. Esto causa errores de constraint violation en cada INSERT.

A continuación se describen las 4 correcciones que debes implementar:

═══════════════════════════════════════════════════════════════════
CORRECCIÓN #4 — SecretariaAlumnos (Formulario alta alumno)
Archivo estimado: src/components/SecretariaAlumnos.tsx (o similar)
═══════════════════════════════════════════════════════════════════

PROBLEMA:
El formulario captura `grade` (ej: '3°') y `section` (ej: 'A') como strings planos.
La tabla `academic_schema.alumno` requiere `seccion_id UUID NOT NULL` y 
`periodo_id UUID NOT NULL`. Actualmente esos UUIDs nunca se resuelven, 
por lo que el INSERT falla silenciosamente o con error de FK.

SOLUCIÓN A IMPLEMENTAR:
1. Antes de ejecutar el INSERT del alumno, agregar una llamada a la API:
   GET /api/secciones?grado=3&seccion=A&periodo_activo=true
   (los parámetros `grado` y `seccion` deben extraerse dinámicamente del formulario)

2. De la respuesta, extraer:
   - `seccion_id` (UUID de la sección)
   - `periodo_id` (UUID del período activo)

3. Inyectar ambos UUIDs en el objeto payload del INSERT del alumno:
```typescript
   const payload = {
     ...formData,
     seccion_id: seccionData.id,       // UUID real
     periodo_id: seccionData.periodo_id // UUID real
   };
```

4. Si la respuesta de /api/secciones está vacía o retorna error, NO proceder 
   con el INSERT. En su lugar, mostrar un mensaje de error visible en el modal:
   "No se encontró la sección {grade}{section} para el período activo."

5. Manejar el estado de carga: deshabilitar el botón "Guardar" mientras se 
   resuelven los UUIDs.

═══════════════════════════════════════════════════════════════════
CORRECCIÓN #5 — AdminHorarios (Formulario nuevo bloque horario)
Archivo estimado: src/components/AdminHorarios.tsx (o similar)
═══════════════════════════════════════════════════════════════════

PROBLEMA:
Al guardar un bloque horario, el frontend almacena: `day`, `start`, `end`, 
`course` (nombre), `teacher` (nombre), `grade` (string) como strings planos.
La tabla `academic_schema.horario` requiere `asignacion_id UUID NOT NULL` 
que referencia `asignacion_docente(id)`. Ese UUID nunca se construye.

SOLUCIÓN A IMPLEMENTAR:
Al hacer clic en "Guardar bloque", ejecutar la siguiente cadena de resolución 
de UUIDs ANTES del INSERT a horario:

Paso 1 — Resolver docente_id:
   GET /api/docentes?nombre={nombreDocenteSeleccionado}
   Extraer: `docente_id` (UUID)

Paso 2 — Resolver curso_id:
   GET /api/cursos?nombre={nombreCursoSeleccionado}
   Extraer: `curso_id` (UUID)

Paso 3 — Resolver seccion_id:
   GET /api/secciones?grado={grade}&seccion={section}&periodo_activo=true
   Extraer: `seccion_id` (UUID) y `periodo_id` (UUID)

Paso 4 — Resolver asignacion_id:
   GET /api/asignaciones?docente_id={X}&curso_id={Y}&seccion_id={Z}&periodo_id={W}
   Extraer: `asignacion_id` (UUID)

Paso 5 — Construir el payload final:
```typescript
   const payload = {
     asignacion_id: asignacionData.id, // UUID real — FK obligatoria
     dia: form.day,
     hora_inicio: form.start,
     hora_fin: form.end,
   };
   await insertHorario(payload);
```

Consideraciones adicionales:
- Si algún paso de resolución falla (sin resultados o error), detener la cadena 
  y mostrar un error específico: "No se encontró la asignación para 
  {docente} / {curso} / {grado}{sección}."
- Todas las llamadas pueden hacerse en paralelo con Promise.all donde no haya 
  dependencia entre ellas (pasos 1, 2 y 3 son independientes; el paso 4 depende de ellos).
- Mostrar un estado de carga ("Resolviendo datos...") mientras se ejecutan las llamadas.

═══════════════════════════════════════════════════════════════════
CORRECCIÓN #6 — DocenteNotas (Ingreso de notas por competencia)
Archivo estimado: src/components/DocenteNotas.tsx (o similar)
═══════════════════════════════════════════════════════════════════

PROBLEMA:
La tabla `academic_schema.nota` requiere `bimestre_id UUID NOT NULL` y 
`docente_id UUID NOT NULL`. 
- El front selecciona el bimestre como string legible ('Bimestre II') y nunca 
  lo convierte a UUID.
- El `docente_id` no se incluye en el payload (o está hardcodeado).

SOLUCIÓN A IMPLEMENTAR:

Para bimestre_id:
1. Al seleccionar un bimestre en el selector, inmediatamente hacer:
   GET /api/bimestres?nombre=Bimestre+II&periodo_activo=true
   (el nombre se toma dinámicamente del valor del selector)
2. Guardar `bimestre_id` en el estado local del componente.
3. No almacenar el string 'Bimestre II' como identificador en el payload.

Para docente_id:
1. Obtener `docente_id` desde el JWT o la sesión activa del usuario autenticado.
   Ejemplo:
```typescript
   const { user } = useAuth(); // o useSession(), según tu sistema de auth
   const docente_id = user.id; // UUID del usuario autenticado — NUNCA hardcoded
```
2. Incluirlo siempre en el body del INSERT/UPSERT.

Payload correcto del INSERT/UPSERT a nota:
```typescript
   const payload = {
     alumno_id: alumno.id,
     competencia_id: competencia.id,
     bimestre_id: bimestreResuelto.id,  // UUID real
     docente_id: user.id,               // UUID del usuario autenticado
     nota_vigesimal: valorNota,
   };
```

Verificación adicional:
- Asegurar que la política RLS `docente_gestiona_notas_propias` sea respetada: 
  el `docente_id` enviado debe coincidir con el usuario autenticado. 
  Si no coincide, Supabase rechazará el INSERT por RLS.

═══════════════════════════════════════════════════════════════════
CORRECCIÓN #7 — AlumnoPagos / SecretariaVouchers
Archivos estimados: src/stores/voucherStore.ts + 
                    src/components/AlumnoPagos.tsx
                    src/components/SecretariaVouchers.tsx
═══════════════════════════════════════════════════════════════════

PROBLEMA:
El `voucherStore` almacena `paymentId` con IDs mock: 'p1', 'p2', ..., 'p12'.
La tabla `financial_schema.boleta_pago` requiere `pago_id UUID NOT NULL UNIQUE` 
que referencie `financial_schema.pago(id)`. Esos IDs mock no existen en la DB, 
por lo que cualquier INSERT de voucher falla con error de FK violation.
Además, el store usa `localStorage` para persistir datos, lo cual debe eliminarse.

SOLUCIÓN A IMPLEMENTAR:

En AlumnoPagos.tsx:
1. Al montar el componente (useEffect), reemplazar los PAYMENTS mock por datos 
   reales de la API:
   GET /api/pagos?alumno_id={alumno_id_sesion}
   (el alumno_id viene del usuario autenticado en sesión)
2. Almacenar la lista de pagos reales en el estado del componente o en el store.
3. Cada pago real tendrá un `id` UUID real — usar ese como `paymentId`.

En voucherStore.ts (o equivalente):
1. Eliminar completamente los IDs hardcodeados ('p1', 'p12', etc.).
2. Eliminar toda lectura/escritura a `localStorage`.
3. El store debe operar exclusivamente con datos provenientes de la API.

En submitVoucher() (o la función que envía el voucher):
```typescript
   const submitVoucher = async (pagoId: string, file: File) => {
     // pagoId debe ser un UUID real obtenido de GET /api/pagos
     const formData = new FormData();
     formData.append('pago_id', pagoId);   // UUID real, no 'p1'
     formData.append('archivo', file);
     await fetch('/api/vouchers', { method: 'POST', body: formData });
   };
```

═══════════════════════════════════════════════════════════════════
INSTRUCCIONES GENERALES DE IMPLEMENTACIÓN
═══════════════════════════════════════════════════════════════════

1. NO modifiques la estructura de la base de datos (DDL). 
   Todos los cambios son exclusivamente en el frontend.

2. Para cada llamada de resolución de UUID, utiliza el patrón try/catch con 
   mensajes de error visibles al usuario (no solo console.log).

3. Mantén el mismo patrón de código que ya existe en el proyecto 
   (no cambies de fetch a axios ni viceversa, respeta el sistema de autenticación actual).

4. Si el proyecto usa un cliente de Supabase directamente, adapta las llamadas 
   a la sintaxis de Supabase JS client en lugar de fetch nativo cuando corresponda.

5. Agrega comentarios en el código que indiquen dónde se resuelve cada UUID, 
   por ejemplo: // 🔑 Resolviendo seccion_id desde grade + section

6. Prioridad de implementación: #4 → #6 → #7 → #5 
   (de menor a mayor complejidad de cadena de resolución).
