# Plan de Optimización de Rendimiento del SGEI

## Objetivo
Mejorar drásticamente los tiempos de respuesta del Sistema de Gestión Educativa Integral (SGEI) tanto en el entorno local (Docker) como en producción. El plan aborda los cuellos de botella mediante estrategias de optimización distribuidas en las cuatro capas principales del sistema.

---

## 1. Módulo de Infraestructura (Docker & Entorno Local)
La lentitud excesiva en el desarrollo (especialmente al recargar vistas o levantar el sistema) suele radicar en la virtualización del sistema de archivos entre el host y el contenedor.

### Propuestas:
*   **Aislamiento de `node_modules`**: Utilizar volúmenes anónimos para las carpetas `node_modules` tanto en el frontend como en el backend. Esto evita que Docker sincronice miles de pequeños archivos hacia el sistema operativo anfitrión (Windows/macOS), lo cual destruye el rendimiento (I/O bottleneck).
*   **Vite HMR (Hot Module Replacement)**: Asegurar que el servidor de desarrollo Vite use polling optimizado (`usePolling: true` con un intervalo adecuado) si los eventos nativos del sistema operativo no se propagan bien al contenedor.
*   **Redes Bridge Dedicadas**: Aislar los contenedores en una red bridge interna para reducir latencias en la comunicación Frontend → Backend, en lugar de enrutar el tráfico por el localhost del anfitrión.

---

## 2. Capa de Base de Datos (PostgreSQL / Supabase)
El diseño del SGEI utiliza triggers y funciones PL/pgSQL críticas. Un mal manejo de índices aquí ralentiza todas las operaciones de lectura (consultas al cambiar vistas) y escritura (guardado masivo de notas).

### Propuestas:
*   **Índices Estratégicos**: Aplicar índices `B-Tree` en claves foráneas ampliamente consultadas (`alumno_id`, `curso_id`, `seccion_id`, `bimestre_id`). Sin esto, las búsquedas por ID resultan en un escaneo secuencial (Sequential Scan) de las tablas.
*   **Índice compuesto para ORDER BY + WHERE**: En tablas con filtro + ordenamiento (ej. `boleta_pago` con `WHERE estado_revision = ? ORDER BY fecha_subida DESC`), un índice compuesto `(columna_filtro, columna_orden DESC)` permite index-only scans y elimina la costosa fase de Sort.
*   **Vistas Materializadas para Dashboards**: Consultas analíticas (ej. "Ingresos totales mensuales" o "Total de morosos") no deben recalcularse en cada `GET /api/dashboard`. Se deben usar vistas materializadas que se actualicen vía `cron` o triggers asíncronos.
*   **Optimización del Connection Pooling**: Si se está usando Supabase, conectar el backend a través de **PgBouncer** (puerto 6543) o el pooler nativo de Supabase, en lugar de la conexión directa (puerto 5432), evitando la saturación de conexiones ante múltiples peticiones simultáneas del frontend.

---

## 3. Capa Backend (Next.js 14 API & Prisma)
El backend procesa la lógica y se comunica con la BD. Las latencias aquí bloquean directamente a los hooks de React Query.

### Propuestas:
*   **Erradicación del Problema N+1**: Auditar consultas en Prisma (especialmente al cargar libretas y notas completas) para asegurar el uso adecuado de `include`. Las iteraciones en código (loops haciendo queries) deben ser reemplazadas por consultas por lotes o transacciones en bruto (`queryRaw`).
*   **Caching en Route Handlers**: Implementar caché HTTP (Next.js `revalidate`) para recursos estáticos del dominio (Catálogo de cursos, listas de roles, períodos académicos inactivos) que raramente cambian, ahorrando viajes a la base de datos.
*   **Trabajos Asíncronos para Cargas Pesadas**: Tareas como la **generación de reportes SIAGIE** no deben bloquear el hilo de respuesta. El endpoint debe retornar un estado rápido (HTTP 202 Accepted) e iniciar el proceso en segundo plano (Serverless Functions o Background Jobs).

---

## 4. Capa Frontend (React 18 & UI/UX)
El rendimiento percibido (cómo siente el usuario la app) es vital. Si el frontend se optimiza, el usuario sentirá la app rápida aunque el backend tarde unos milisegundos extra.

### Propuestas:
*   **Optimistic Updates (React Query)**: Al crear, editar o eliminar registros (ej. ingreso de una calificación, aprobación de voucher), actualizar el estado visual de la UI **inmediatamente**, en paralelo a la petición del servidor. Si el servidor falla, se revierte (rollback). Esto hace que las interacciones se perciban instantáneas.
*   **Code Splitting y Lazy Loading**: Trocear la aplicación. No descargar el código de los módulos de la "Secretaria" ni de los "Docentes" cuando entra un "Alumno". Usar `React.lazy()` y suspense boundaries por perfil.
*   **Virtualización de Tablas Grandes**: El *Renderizado de Listas* largas (ej. Matriz de notas de toda una sección) consume mucha CPU del navegador. Usar librerías como `@tanstack/react-virtual` para renderizar únicamente las filas que el usuario está viendo en pantalla en ese momento.
*   **Prefetching Inteligente**: Aprovechar React Query para hacer pre-fetch de los datos antes de que el usuario cambie de vista. (Ej. Al pasar el mouse por encima del botón "Ver Notas", comenzar a descargar el JSON de notas en segundo plano).

---

## User Review Required
> [!IMPORTANT]
> Se requiere revisión sobre la prioridad de implementación. Los cambios en Docker son rápidos y mejorarán el flujo de desarrollo, pero los **Optimistic Updates** en React Query y los **Índices en BD** tendrán el mayor impacto visible para los usuarios finales.

## Open Questions
> [!TIP]
> Por favor aclara los siguientes puntos para ajustar el plan:
> 1. En la experiencia actual, ¿dónde notas mayor lentitud: al abrir la aplicación por primera vez, o al navegar entre secciones ya dentro de la aplicación?
> 2. ¿Podrías proporcionar la configuración actual de los volúmenes (volumes) en tu archivo `docker-compose.yml` para proponer la corrección exacta del I/O?