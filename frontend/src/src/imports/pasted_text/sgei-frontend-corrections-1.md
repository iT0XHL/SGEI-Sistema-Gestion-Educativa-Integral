# Prompt de Correcciones Frontend — SGEI
### Para uso en Figma Make

---

## Contexto del proyecto

Este proyecto es el frontend del **Sistema de Gestión Educativa Institucional (SGEI)**, construido en **React + TypeScript + Vite**, con componentes Shadcn/UI y estilos en Tailwind CSS. La estructura de páginas se organiza en módulos por rol: `alumno/`, `docente/`, `admin/` y `secretaria/`.

Se identificaron **3 fallos críticos de persistencia** donde la lógica de negocio opera únicamente en estado local del navegador (React state o in-memory), sin realizar ninguna llamada real a la API del backend. Esto rompe la consistencia con la base de datos PostgreSQL subyacente. A continuación se detallan cada uno con su ubicación exacta, el problema actual y la implementación correcta esperada.

---

## CORRECCIÓN 1 — `AlumnoPagos.tsx` / `SecretariaVouchers.tsx` + `voucherStore.ts`

### Problema actual
El archivo `src/app/store/voucherStore.ts` gestiona todo el ciclo de vida del voucher (subida, aprobación, rechazo, observación) mediante un store en memoria (`inMemoryStore`) con funciones síncronas (`submitVoucher`, `approveVoucher`, `rejectVoucher`). Aunque el código ya eliminó `localStorage`, **sigue sin realizar ninguna llamada HTTP real**. El estado se pierde al recargar la página y nunca llega a la tabla `boleta_pago` de la base de datos.

### Archivos a modificar
- `src/app/store/voucherStore.ts` — **eliminar completamente**
- `src/app/pages/alumno/AlumnoPagos.tsx` — reemplazar uso de `submitVoucher()`
- `src/app/pages/secretaria/SecretariaVouchers.tsx` — reemplazar uso de `approveVoucher()` / `rejectVoucher()`

### Implementación requerida

**1. Eliminar `voucherStore.ts`** y todas sus importaciones en los archivos que lo consumen.

**2. En `AlumnoPagos.tsx` — Subida de voucher:**
Reemplazar la llamada a `submitVoucher()` por una petición real con `multipart/form-data`:

```ts
// Antes (mock)
submitVoucher(pagoId, month, amount);

// Después (real)
const formData = new FormData();
formData.append('pago_id', pagoId);
formData.append('archivo', archivoSeleccionado); // File del input
await fetch('/api/boletas', {
  method: 'POST',
  body: formData,
});
```

El componente debe incluir un `<input type="file" accept="image/*,application/pdf" />` visible o accesible al usuario para capturar el archivo antes de enviarlo.

**3. En `SecretariaVouchers.tsx` — Revisión de voucher:**
Reemplazar `approveVoucher()` / `rejectVoucher()` por llamadas al procedimiento almacenado vía API:

```ts
// Aprobar
await fetch('/api/boletas/revisar', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    boleta_id: boletaId,
    revisor_id: currentUserId,
    nuevo_estado: 'Aprobada',
    observacion: null,
  }),
});

// Rechazar
await fetch('/api/boletas/revisar', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    boleta_id: boletaId,
    revisor_id: currentUserId,
    nuevo_estado: 'Rechazada',
    observacion: observacionTexto,
  }),
});
```

**4. Lectura de estado de vouchers:**
Reemplazar la lectura desde el store por fetch al backend:

```ts
// Al montar el componente o al cambiar el pago seleccionado
const res = await fetch(`/api/boletas?pago_id=${pagoId}`);
const data = await res.json();
```

**5. Mapeo de estados:**
Mantener `src/app/utils/voucherStatusMapper.ts` para la conversión entre estados del frontend (`submitted`, `approved`, `rejected`) y los de la DB (`En_Revision`, `Aprobada`, `Rechazada`).

### UX esperada
- Mostrar un spinner o estado de carga mientras se sube el archivo.
- Mostrar un mensaje de éxito o error real según la respuesta HTTP.
- Refrescar la lista de vouchers tras cada acción de revisión.

---

## CORRECCIÓN 2 — `DocenteAsistencia.tsx`

### Problema actual
En `src/app/pages/docente/DocenteAsistencia.tsx`, la función `handleSave()` simula el guardado con un `setTimeout` de 1000ms pero **no ejecuta ninguna llamada HTTP**. La asistencia marcada visualmente nunca se persiste en la tabla `academic_schema.asistencia` de la base de datos.

```ts
// Código actual (incorrecto)
function handleSave() {
  setSaving(true);
  setTimeout(() => { setSaving(false); setSaved(true); }, 1000);
}
```

### Archivo a modificar
- `src/app/pages/docente/DocenteAsistencia.tsx`

### Implementación requerida

Reemplazar el `setTimeout` por una llamada `POST` real a la API:

```ts
async function handleSave() {
  setSaving(true);
  setSaved(false);

  const registros = Object.entries(attendance).map(([alumno_id, estado]) => ({
    alumno_id,
    estado, // 'present' | 'absent' | 'late'
  }));

  try {
    const res = await fetch('/api/asistencia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fecha: selectedDate,       // string ISO, e.g. '2026-05-05'
        seccion_id: selectedSection,
        registros,
      }),
    });

    if (!res.ok) throw new Error('Error al guardar');

    setSaved(true);
  } catch (err) {
    // Mostrar feedback de error al docente
    setErrorMsg('No se pudo guardar la asistencia. Intenta nuevamente.');
  } finally {
    setSaving(false);
  }
}
```

**Nota de backend (informativa para contexto):** El endpoint debe ejecutar `INSERT INTO academic_schema.asistencia ... ON CONFLICT (alumno_id, seccion_id, fecha) DO UPDATE SET estado = EXCLUDED.estado` para manejar guardados dobles sin error.

### UX esperada
- El botón "Guardar asistencia" debe mostrar el spinner mientras la petición está en curso (comportamiento ya implementado, solo reemplazar el mock).
- Si la API responde con error, mostrar un mensaje visible en pantalla (toast o alerta inline), **no** marcar como guardado.
- Si la API responde con éxito, mantener el estado "Asistencia guardada" con ícono verde tal como está diseñado.

---

## CORRECCIÓN 3 — `AdminBloqueo.tsx`

### Problema actual
En `src/app/pages/admin/AdminBloqueo.tsx`, la función `toggleBlock(id)` únicamente muta el estado local de React sin persistir el cambio:

```ts
// Código actual (incorrecto)
function toggleBlock(id: string) {
  setStudents(prev =>
    prev.map(s => s.id === id ? { ...s, blocked: !s.blocked } : s)
  );
}
```

La columna `alumno.bloqueo_manual BOOLEAN` en la base de datos nunca se actualiza, por lo que la función `fn_bloquea_libreta()` del backend no puede actuar correctamente.

### Archivo a modificar
- `src/app/pages/admin/AdminBloqueo.tsx`

### Implementación requerida

Implementar **optimistic update**: aplicar el cambio en UI de inmediato y revertirlo si la API falla.

```ts
async function toggleBlock(id: string) {
  // 1. Optimistic update — aplicar cambio en UI de inmediato
  const previousStudents = students;
  setStudents(prev =>
    prev.map(s => s.id === id ? { ...s, blocked: !s.blocked } : s)
  );

  const student = students.find(s => s.id === id);
  const nuevoEstado = !student?.blocked;

  try {
    const res = await fetch(`/api/alumnos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bloqueo_manual: nuevoEstado }),
    });

    if (!res.ok) throw new Error('Error al actualizar bloqueo');

  } catch (err) {
    // 2. Revertir si la API falla
    setStudents(previousStudents);
    setErrorMsg('No se pudo actualizar el estado de bloqueo.');
  }
}
```

### UX esperada
- El botón "Bloquear" / "Desbloquear" de cada fila debe cambiar de estado visualmente de inmediato (ya ocurre).
- Si la API falla, el botón debe **revertir** al estado anterior automáticamente.
- Mostrar un mensaje de error (toast o alerta) cuando la operación no se complete en el backend.
- Los botones de acción masiva `blockAll()` y `unblockAll()` deben seguir el mismo patrón: llamada `PATCH` en lote o iteración con manejo de errores.

---

## Consideraciones generales para todas las correcciones

1. **No alterar el diseño visual existente.** Los cambios son exclusivamente en la capa de lógica (handlers y efectos). Layouts, estilos, colores y componentes UI permanecen igual.
2. **Los inputs no tienen restricción de caracteres** — no agregar validaciones de longitud máxima ni mínima en los campos de texto existentes.
3. **Manejo de estados de carga:** Todos los módulos ya tienen variables de estado para `saving`/`loading`. Usarlas correctamente según la respuesta real de la API en lugar del mock.
4. **Feedback de error:** Agregar un estado `errorMsg: string | null` en cada componente donde no exista, para mostrar mensajes de fallo al usuario.
5. **Variables de entorno:** Las URLs de la API (`/api/boletas`, `/api/asistencia`, `/api/alumnos/:id`) deben seguir el patrón base ya establecido en el proyecto. Si existe un cliente HTTP centralizado o configuración de `baseURL`, utilizarlo en lugar de `fetch` directo.