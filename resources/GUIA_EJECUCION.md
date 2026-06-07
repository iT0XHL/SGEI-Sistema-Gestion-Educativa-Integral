# Guía de Ejecución — SGEI

Cómo levantar el sistema completo (base de datos + backend + frontend) en modo desarrollo.

---

## Requisitos previos

| Herramienta | Versión mínima | Necesaria para |
|-------------|---------------|----------------|
| Docker Desktop | 24+ | Ejecución con Docker |
| Node.js | 20+ | Ejecución sin Docker |
| pnpm | 8+ | Frontend sin Docker |
| PostgreSQL | 15+ | Base de datos sin Docker |

---

## Opción A — Con Docker (recomendado)

Levanta los tres servicios (DB, backend y frontend) con un solo comando.

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd SGEI-Sistema-Gestion-Educativa-Integral
```

### 2. Levantar todos los servicios

```bash
docker compose up --build
```

Docker hará automáticamente:
- Crear e inicializar la base de datos PostgreSQL con el DDL y los datos semilla.
- Instalar dependencias del backend, generar el cliente Prisma y ejecutar el seed.
- Instalar dependencias del frontend y levantar el servidor Vite.

### 3. Acceder a la aplicación

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:3000 |
| Backend (API) | http://localhost:3001 |
| Health check | http://localhost:3001/api/health |

### Comandos útiles

```bash
# Ver logs en tiempo real
docker compose logs -f

# Ver logs de un servicio específico
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db

# Detener los servicios (mantiene los datos)
docker compose stop

# Detener y eliminar contenedores (mantiene los datos del volumen)
docker compose down

# Eliminar también los datos de la base de datos
docker compose down -v
```

---

## Opción B — Sin Docker (manual)

Requiere tener PostgreSQL, Node.js y pnpm instalados localmente.

### 1. Configurar la base de datos

Crea la base de datos y el usuario en PostgreSQL:

```sql
CREATE USER sgei WITH PASSWORD 'sgei';
CREATE DATABASE sgei_db OWNER sgei;
```

Luego ejecuta los scripts SQL en orden:

```bash
psql -U sgei -d sgei_db -f SQL/00-setup.sql
psql -U sgei -d sgei_db -f "SQL/sgei_ddl_v2.1_auditado (1).sql"
psql -U sgei -d sgei_db -f SQL/02-seed.sql
```

### 2. Configurar y levantar el backend

```bash
cd backend
```

Crea el archivo de variables de entorno:

```bash
# backend/.env
DATABASE_URL="postgresql://sgei:sgei@localhost:5432/sgei_db"
DIRECT_URL="postgresql://sgei:sgei@localhost:5432/sgei_db"
NODE_ENV="development"
JWT_SECRET="dev-secret-cambiar-en-produccion-minimo-64-caracteres-1234567890abcdef"
JWT_EXPIRES_IN="8h"
JWT_COOKIE_NAME="sgei_token"
BCRYPT_SALT_ROUNDS="12"
FRONTEND_ORIGIN="http://localhost:3000"
MAX_FILE_SIZE_MB="5"
```

Instalar dependencias, generar Prisma y ejecutar el seed:

```bash
npm install
npx prisma generate
npm run db:seed
```

Iniciar el servidor de desarrollo (puerto 3001):

```bash
npm run dev
```

### 3. Levantar el frontend

Abre otra terminal:

```bash
cd frontend
pnpm install
pnpm dev
```

El frontend queda disponible en http://localhost:3000.

### 4. Verificar que todo funciona

```bash
# Comprobar que el backend responde
curl http://localhost:3001/api/health
```

---

## Variables de entorno del backend

| Variable | Valor por defecto | Descripción |
|----------|------------------|-------------|
| `DATABASE_URL` | — | Cadena de conexión a PostgreSQL (obligatoria) |
| `DIRECT_URL` | igual a `DATABASE_URL` | Conexión directa (opcional, para Supabase) |
| `NODE_ENV` | `development` | Entorno de ejecución |
| `JWT_SECRET` | — | Clave de firma JWT (mín. 32 caracteres) |
| `JWT_EXPIRES_IN` | `8h` | Tiempo de expiración del token |
| `JWT_COOKIE_NAME` | `sgei_token` | Nombre de la cookie de sesión |
| `BCRYPT_SALT_ROUNDS` | `12` | Rondas de hashing de contraseñas (10–15) |
| `FRONTEND_ORIGIN` | `http://localhost:3000` | Origen permitido en CORS |
| `MAX_FILE_SIZE_MB` | `5` | Tamaño máximo de archivos subidos |
| `SUPABASE_URL` | — | URL de Supabase (opcional, solo para subida de archivos) |
| `SUPABASE_SERVICE_KEY` | — | Clave de servicio de Supabase (opcional) |

---

## Estructura de puertos

```
localhost:3000  →  Frontend (Vite React)
localhost:3001  →  Backend  (Next.js 14 API)
localhost:5432  →  Base de datos (PostgreSQL 15)
```
