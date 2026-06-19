# SGEI — Sistema de Gestión Educativa Integral

Plataforma **full-stack** de gestión escolar para un colegio secundario peruano. Cubre todo el ciclo académico: estructura curricular, personas, asistencia, notas, **libretas oficiales (formato MINEDU)**, pagos y notificaciones en tiempo real. Esta guía describe **qué hace el sistema** y **cómo levantarlo** en local.

---

## ¿Qué hace el sistema?

### Stack y arquitectura
- **Frontend:** SPA Vite + React 18 + React Router 7 + Tailwind 4 (puerto **3000**). Cuatro portales por rol.
- **Backend:** Next.js 14 Route Handlers — API REST (puerto **3001**) con capas `Ruta → Auth/RBAC → Zod → Servicio → Repositorio → Prisma`.
- **Base de datos:** PostgreSQL 15 (Prisma ORM, multi-schema: académico, auth, financiero, auditoría).
- **Sesión:** JWT en cookie HttpOnly + RBAC. Toda la app está orquestada con **Docker Compose**.

### Roles y portales
| Rol | Portal | Hace |
| --- | --- | --- |
| **Admin** | `/admin` | Configura institución, períodos, bimestres, niveles/grados/secciones, cursos/competencias, asignaciones docente-curso, horarios y escala literal; gestiona cuentas (alumnos, docentes, staff); ve estadísticas, asistencia de docentes y bloqueo de libretas. |
| **Secretaría** | `/secretaria` | Matrícula y gestión de alumnos; **genera, revisa, aprueba y publica libretas**; registra pagos y revisa vouchers/boletas; exporta SIAGIE; situación final. |
| **Docente** | `/docente` | Ve sus cursos/horario; **registra notas** (vigesimal→literal); toma asistencia; sube materiales; crea actividades y califica entregas. |
| **Alumno** | `/alumno` | Consulta sus cursos, notas, asistencia y estado de pagos; sube su voucher; **descarga su libreta como Word editable (`.docx`)** cuando está publicada. |

### Flujos principales
1. **Setup académico (Admin):** institución → período activo → bimestres → estructura (niveles/grados/secciones) → cursos/competencias → asignaciones → horarios → escala literal.
2. **Notas → Libreta:** el docente registra notas → Secretaría **genera** la libreta (instantánea inmutable) → workflow de estados `BORRADOR → EN_REVISIÓN → APROBADA → PUBLICADA` (+ OBSERVADA/BLOQUEADA/ANULADA) → el alumno **descarga su libreta en Word** (formato MINEDU, editable por el personal). Se bloquea si hay deuda.
3. **Pagos:** Secretaría registra concepto/pago → el alumno sube su voucher → Secretaría lo revisa (aprueba/rechaza).
4. **Notificaciones por eventos:** en tiempo real (SSE) + *toast*; campana con contador y filtros. No te notificas de tus propias acciones (ver §3).

---

## Acceso al entorno de desarrollo

Esta guía resume **cómo levantar el sistema** y las **cuentas de acceso** para probar cada portal en local.

> ⚠️ **SOLO DESARROLLO LOCAL.** Las contraseñas de este documento son de un entorno de pruebas con Docker. **No usar en producción** y, idealmente, no subir este archivo a un repositorio público (puedes añadirlo a `.gitignore`).

---

## 1. Levantar el sistema

Requisitos: Docker Desktop.

```bash
# Levantar todo (base de datos + backend + frontend)
docker compose up -d

# Ver estado
docker ps --filter "name=sgei"

# Apagar
docker compose down
```

| Servicio  | URL                      | Puerto |
| --------- | ------------------------ | ------ |
| Frontend  | http://localhost:3000    | 3000   |
| Backend   | http://localhost:3001    | 3001   |
| PostgreSQL| localhost                | 5432   |

Abre **http://localhost:3000**, elige el rol e inicia sesión con una cuenta de la tabla siguiente.

---

## 2. Cuentas de acceso (una por rol)

Todas usan la contraseña **`demo1234`**. Al iniciar sesión, selecciona el **rol** correspondiente.

| Rol          | Correo                        | Contraseña   | Portal             |
| ------------ | ----------------------------- | ------------ | ------------------ |
| **Admin**    | `director@sgei.edu.pe`        | `demo1234`  | `/admin/inicio`      |
| **Secretaria** | `secretaria@sgei.edu.pe`    | `demo1234`  | `/secretaria/inicio` |
| **Docente**  | `ana.garcia@sgei.edu.pe`      | `demo1234`  | `/docente/inicio`    |
| **Alumno**   | `benjamin.cruz@sgei.edu.pe`   | `demo1234`  | `/alumno/inicio`     |

> El login bloquea la cuenta tras **5 intentos fallidos** (30 min). Si te bloqueas, usa la utilidad de la sección 4 para desbloquear.

---

## 3. Ver el sistema de notificaciones en vivo

Las notificaciones aparecen en la **campana** del encabezado, con contador, filtros por tipo y actualización en **tiempo real (SSE)** + *toast*.

Importante: **no recibes notificaciones de tus propias acciones**. Para verlas llegar:

1. Navegador normal → entra como **Admin** (`director@sgei.edu.pe`).
2. Ventana de **incógnito** → entra como **Secretaria** (`secretaria@sgei.edu.pe`).
3. Como **Secretaria**, registra un alumno (o el Admin crea un docente y lo observas desde la Secretaria).
4. En la otra sesión verás, **sin recargar**: un *toast* y el contador de la campana subir. Al hacer clic en la notificación, te lleva a la pantalla del recurso.

---

## 4. Restablecer / desbloquear cuentas

El seed crea **muchas más cuentas** (docentes y alumnos), todas con la contraseña **`demo1234`**. Para fijar otra contraseña o desbloquear una cuenta (p. ej. tras 5 intentos fallidos), usa la utilidad de desarrollo:

```bash
# Restablece la cuenta indicada a la contraseña indicada y la desbloquea
docker exec \
  -e RESET_LOGIN=correo@sgei.edu.pe \
  -e RESET_PASSWORD=demo1234 \
  sgei-backend npx tsx /app/prisma/reset-admin-password.ts
```

Sin variables de entorno, restablece por defecto `director@sgei.edu.pe` a `demo1234`.

Listar las cuentas disponibles por rol:

```bash
docker exec sgei-db psql -U sgei -d sgei_db -c \
  "SELECT p.rol, c.usuario_login, c.activo
   FROM auth_schema.perfil_usuario p
   JOIN auth_schema.credencial c ON c.id = p.credencial_id
   ORDER BY p.rol, c.usuario_login;"
```

---

## 5. Notas técnicas

- **Stack:** Frontend Vite + React 18 (puerto 3000) · Backend Next.js 14 Route Handlers (puerto 3001) · PostgreSQL 15.
- **Sesión:** JWT en cookie HttpOnly (`sgei_token`). El frontend usa `credentials: "include"`; el backend permite CORS desde `FRONTEND_ORIGIN` (http://localhost:3000).
- **Migraciones SQL:** todos los scripts de la carpeta `SQL/` se aplican **automáticamente** al crear el volumen de la base de datos. `docker-compose.yml` los monta en `/docker-entrypoint-initdb.d` y PostgreSQL los ejecuta en orden: `setup → DDL → notificaciones → libretas → fix-audit → seed`. Si recreas el volumen desde cero (`docker compose down -v`), se vuelven a aplicar solas. Para aplicarlas a mano sobre una DB ya existente:
  ```bash
  docker exec -i sgei-db psql -U sgei -d sgei_db < SQL/01_notificaciones_eventos.sql
  docker exec -i sgei-db psql -U sgei -d sgei_db < SQL/03-libretas-migration.sql
  docker exec -i sgei-db psql -U sgei -d sgei_db < SQL/04-fix-audit-trigger.sql
  ```
