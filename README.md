# SGEI — Sistema de Gestión Educativa Integral

Sistema de gestión escolar full-stack para instituciones de educación secundaria.
UI, identificadores y términos de dominio en **español**.

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite 6 + TypeScript + React Router 7 + Tailwind CSS 4 |
| Backend | Next.js 14 Route Handlers + Prisma ORM + Zod |
| Base de datos | PostgreSQL 15 (29 tablas, triggers, RLS, auditoría) |
| Auth | JWT en cookie HttpOnly — roles: Admin, Secretaria, Docente, Alumno |
| Orquestación | Docker Compose |

---

## Inicio rápido con Docker

### Prerequisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y corriendo
- Puertos **3000**, **3001** y **5432** libres en tu máquina

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd SGEI-Sistema-Gestion-Educativa-Integral
```

### 2. Levantar todos los servicios

```bash
docker compose up --build
```

Docker Compose levanta **tres servicios en orden**:

```
db (PostgreSQL 15)
  └─► backend (Next.js 14, puerto 3001)
        └─► frontend (Vite React, puerto 3000)
```

**Secuencia de arranque del backend** (gestionada por `docker-entrypoint.sh`):

1. Espera a que PostgreSQL esté disponible (`pg_isready`)
2. Ejecuta `prisma db pull` → introspecciona el DDL y genera `schema.prisma`
3. Ejecuta `prisma generate` → genera Prisma Client
4. Ejecuta `prisma db seed` → crea datos de prueba
5. Inicia el servidor Next.js en el puerto 3001

> El primer arranque tarda ~2–3 minutos porque Docker construye las imágenes e instala dependencias.

### 3. Verificar que todo esté corriendo

```bash
docker compose ps
```

Deberías ver los tres servicios con estado `Up`:

```
sgei-db        Up (healthy)
sgei-backend   Up (healthy)
sgei-frontend  Up
```

### 4. Acceder a la aplicación

| Servicio | URL |
|---|---|
| **Frontend** | http://localhost:3000 |
| **API** | http://localhost:3001/api |
| **Health check** | http://localhost:3001/api/health |

---

## Credenciales de prueba

**Contraseña de todos los usuarios: `demo1234`**

| Rol | Email |
|---|---|
| Admin | `director@sgei.edu.pe` |
| Secretaria | `secretaria@sgei.edu.pe` |
| Docente | `ana.garcia@sgei.edu.pe` |
| Docente | `jose.ramos@sgei.edu.pe` |
| Alumno | `carlos.mendoza@sgei.edu.pe` |
| Alumno | `adriana.castillo@sgei.edu.pe` |

---

## Estructura del proyecto

```
.
├── docker-compose.yml                          Orquesta PostgreSQL + Backend + Frontend
├── SQL/
│   ├── 00-setup.sql                            Crea schema auth y función uid()
│   ├── sgei_ddl_v2.1_auditado (1).sql          DDL completo: tablas, triggers, RLS, ENUMs
│   └── 02-seed.sql                             Datos de prueba (cargado automáticamente)
│
├── backend/
│   ├── Dockerfile                              Node.js 20-slim + Prisma + curl
│   ├── docker-entrypoint.sh                    Espera DB → pull → generate → seed → dev
│   ├── package.json                            Next.js 14, Prisma 5.22, JWT, bcryptjs, Zod
│   ├── prisma/schema.prisma                    Generado por "prisma db pull" (no editar)
│   ├── app/api/                                Route Handlers REST
│   ├── modules/                                Servicios y repositorios por dominio
│   ├── lib/                                    Prisma singleton, JWT, helpers de respuesta
│   └── schemas/                                Schemas Zod de validación
│
└── frontend/
    ├── Dockerfile                              Node.js 22-slim + pnpm + Vite
    ├── package.json                            React 18, React Router 7, Tailwind 4, shadcn/ui
    ├── src/
    │   ├── main.tsx                            Punto de entrada React
    │   ├── app/routes.tsx                      Rutas: /alumno /docente /admin /secretaria
    │   ├── app/pages/                          Componentes de cada portal
    │   ├── lib/api/                            Clientes HTTP hacia el backend
    │   └── types/                              Tipos TypeScript compartidos
    └── pnpm-workspace.yaml
```

---

## Comandos Docker

```bash
# Levantar todo (primera vez o tras cambios)
docker compose up --build

# Levantar en segundo plano
docker compose up --build -d

# Ver logs en tiempo real
docker compose logs -f

# Logs de un servicio específico
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db

# Detener sin borrar datos
docker compose down

# Detener Y borrar volúmenes (BORRA la base de datos)
docker compose down -v

# Reconstruir solo un servicio
docker compose up --build backend

# Ejecutar comandos en un contenedor
docker compose exec backend npx prisma studio          # GUI de base de datos (puerto 5555)
docker compose exec backend npx prisma db seed         # Re-ejecutar seed
docker compose exec db psql -U sgei -d sgei_db         # Consola PostgreSQL
```

---

## Variables de entorno

Todas las variables están definidas directamente en `docker-compose.yml`.
Para desarrollo local sin Docker crea `backend/.env` con:

```env
DATABASE_URL="postgresql://sgei:sgei@localhost:5432/sgei_db"
DIRECT_URL="postgresql://sgei:sgei@localhost:5432/sgei_db"
NODE_ENV="development"
JWT_SECRET="dev-secret-cambiar-en-produccion-minimo-64-caracteres-1234567890abcdef"
JWT_EXPIRES_IN="8h"
JWT_COOKIE_NAME="sgei_token"
BCRYPT_SALT_ROUNDS="12"
FRONTEND_ORIGIN="http://localhost:3000"
MAX_FILE_SIZE_MB="5"
WATCHPACK_POLLING="true"
```

El frontend no requiere `.env` — detecta el backend en `http://localhost:3001` por defecto
(configurable con `VITE_API_URL`).

---

## Desarrollo local sin Docker

### 1. Base de datos (solo PostgreSQL en Docker)

```bash
docker run --name sgei-db \
  -e POSTGRES_USER=sgei \
  -e POSTGRES_PASSWORD=sgei \
  -e POSTGRES_DB=sgei_db \
  -p 5432:5432 \
  -d postgres:15-alpine

# Cargar DDL y datos
docker exec -i sgei-db psql -U sgei -d sgei_db < SQL/00-setup.sql
docker exec -i sgei-db psql -U sgei -d sgei_db < "SQL/sgei_ddl_v2.1_auditado (1).sql"
docker exec -i sgei-db psql -U sgei -d sgei_db < SQL/02-seed.sql
```

### 2. Backend

```bash
cd backend
npm install
npx prisma db pull      # Introspecciona DB → genera schema.prisma
npx prisma generate     # Genera Prisma Client
npm run dev             # http://localhost:3001
```

### 3. Frontend

```bash
cd frontend
pnpm install
pnpm dev                # http://localhost:3000
```

---

## Verificación del sistema

```bash
# Health check de la API
curl http://localhost:3001/api/health
# {"success":true,"data":{"status":"ok","database":"up"}}

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"director@sgei.edu.pe","password":"demo1234"}' \
  -c cookies.txt -v

# Endpoint protegido (usando la cookie del login)
curl http://localhost:3001/api/asignaciones \
  -b cookies.txt
```

---

## Base de datos

### Arquitectura multi-schema

| Schema | Contenido |
|---|---|
| `auth_schema` | credenciales, perfiles de usuario, roles |
| `academic_schema` | períodos, grados, cursos, competencias, notas, asistencia, horarios |
| `financial_schema` | pagos, vouchers, mora |
| `audit_schema` | logs de auditoría automática |

### Reglas importantes

> **Nunca usar `prisma migrate`.**
> El DDL es la fuente de verdad — se modifica directamente en PostgreSQL.
> Después de cualquier cambio en el esquema, ejecutar `prisma db pull` para
> sincronizar `schema.prisma`.

### Auditoría automática

Todos los cambios INSERT/UPDATE/DELETE se registran mediante triggers.
El middleware del backend configura `app.current_user_id` antes de cada query
para que los triggers capturen el usuario responsable.

---

## Rutas del frontend

```
/                   Login (público)
/alumno/...         Portal Alumno   — notas, asistencia, pagos, libreta, cursos
/docente/...        Portal Docente  — registro de notas, asistencia, tareas
/admin/...          Portal Admin    — configuración general
/secretaria/...     Portal Secretaria — alumnos, pagos, SIAGIE
```

El rol se deriva del primer segmento de la URL.
La autenticación real usa JWT HttpOnly cookie — el Login navega al portal correspondiente
según el `rol` devuelto por `GET /api/auth/me`.

---

## Solución de problemas

### El backend no arranca o dice "DB no disponible"

```bash
# Ver estado de la base de datos
docker compose logs db

# Verificar que el healthcheck pasó
docker compose ps
# sgei-db debe mostrar "(healthy)"

# Reiniciar solo el backend tras que la DB esté lista
docker compose restart backend
```

### Error "port already in use"

```powershell
# Windows PowerShell — encontrar qué usa el puerto
Get-NetTCPConnection -LocalPort 3000 | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Get-Process -Id $_ }
Get-NetTCPConnection -LocalPort 3001 | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Get-Process -Id $_ }
Get-NetTCPConnection -LocalPort 5432 | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Get-Process -Id $_ }
```

```bash
# Linux / macOS
lsof -i :3000
lsof -i :3001
lsof -i :5432
```

### Quiero limpiar todo y empezar desde cero

```bash
# Detiene, borra contenedores Y el volumen de la base de datos
docker compose down -v

# Volver a levantar limpio
docker compose up --build
```

### El frontend muestra pantalla en blanco

1. Abre DevTools → Console → revisa errores en rojo
2. Verifica que el backend esté respondiendo: `curl http://localhost:3001/api/health`
3. Comprueba los logs: `docker compose logs frontend`

### `prisma db pull` falla en el entrypoint

Ocurre si el DDL tardó más de lo esperado en cargar. Solución:

```bash
docker compose restart backend
```

---

## Comandos Prisma útiles

```bash
# Desde el contenedor del backend
docker compose exec backend npx prisma db pull      # Regenera schema.prisma desde la BD
docker compose exec backend npx prisma generate     # Regenera Prisma Client
docker compose exec backend npx prisma studio       # GUI interactiva (localhost:5555)
docker compose exec backend npx prisma db seed      # Re-ejecuta el seed
docker compose exec backend npx prisma validate     # Valida schema.prisma
```

---

**Última actualización:** Mayo 2026
