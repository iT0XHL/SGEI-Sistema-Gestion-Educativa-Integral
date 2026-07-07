# Despliegue en VPS Hostinger (KVM 1) con GitHub Actions

Cada `git push` a `master` dispara el pipeline `.github/workflows/deploy.yml`:

```
push a master
  → build de imágenes de producción (backend y frontend) → GHCR
  → scp al VPS: docker-compose.prod.yml + .env.example + SQL/consolidated
  → SSH al VPS: docker compose pull && up -d
```

El VPS **nunca compila** — solo descarga imágenes listas. Esto es clave en un
KVM 1 (1 vCPU / 4 GB), donde un `next build` puede agotar la RAM.

## 1. Preparar el VPS (una sola vez)

```bash
# Conéctate por SSH e instala Docker (incluye compose v2)
curl -fsSL https://get.docker.com | sh

# Crea el directorio de despliegue
mkdir -p /opt/sgei
```

Crea el `.env` de producción (el workflow copia `.env.production.example` en
cada deploy, pero **nunca** toca tu `.env` real):

```bash
cd /opt/sgei
# (tras el primer push del workflow ya tendrás el example; o créalo a mano)
cp .env.production.example .env
nano .env
```

Valores mínimos a cambiar en `.env`:

| Variable | Valor |
| --- | --- |
| `POSTGRES_PASSWORD` | contraseña fuerte para la BD |
| `JWT_SECRET` | `openssl rand -hex 48` |
| `FRONTEND_ORIGIN` | `http://TU_IP` (o `https://tudominio.com`) |
| `COOKIE_SECURE` | `false` si accedes por IP sin SSL; `true` con HTTPS |

## 2. Configurar GitHub (una sola vez)

En el repo → **Settings → Secrets and variables → Actions**:

**Secrets:**

| Secret | Valor |
| --- | --- |
| `VPS_HOST` | IP del VPS (la que da Hostinger) |
| `VPS_USER` | usuario SSH, normalmente `root` |
| `VPS_SSH_KEY` | clave privada SSH completa (`-----BEGIN ... KEY-----`) |
| `VPS_PORT` | (opcional) puerto SSH si no es 22 |
| `GHCR_PAT` | (opcional) solo si dejas los paquetes GHCR **privados** — ver abajo |

Para la clave: genera un par con `ssh-keygen -t ed25519 -f sgei_deploy`,
agrega la **pública** a `~/.ssh/authorized_keys` del VPS y pega la **privada**
en el secret.

> **Paquetes GHCR (importante):** tras el primer build, las imágenes quedan en
> `ghcr.io/TU_USUARIO/sgei-{backend,frontend}`. Lo más simple es hacerlas
> **públicas** (GitHub → tu perfil → *Packages* → cada paquete → *Package
> settings* → *Change visibility → Public*); así el VPS las descarga sin
> autenticarse. Si prefieres dejarlas **privadas**, crea un PAT con scope
> `read:packages` y guárdalo como secret `GHCR_PAT`: el workflow hará
> `docker login` en el VPS automáticamente.

**Variables:**

| Variable | Valor |
| --- | --- |
| `VITE_API_URL` | URL pública del backend, ej. `http://TU_IP:3001` |
| `DEPLOY_PATH` | (opcional) directorio en el VPS, por defecto `/opt/sgei` |

> `VITE_API_URL` se incrusta en el bundle del frontend **en build**: si la
> cambias, hay que relanzar el workflow (pestaña Actions → Run workflow).

## 3. Desplegar

```bash
git push origin master
```

o manualmente desde GitHub → Actions → *CI/CD — Despliegue VPS* → Run workflow.

Al terminar: frontend en `http://TU_IP` (puerto 80) y API en
`http://TU_IP:3001/api/health`.

## Notas de operación

- **La BD solo se inicializa con los scripts `SQL/` la primera vez** (volumen
  nuevo). Para recargarla desde cero (⚠️ borra todos los datos):
  `docker compose -f docker-compose.prod.yml down -v && docker compose -f docker-compose.prod.yml up -d`
- Postgres queda expuesto **solo en 127.0.0.1** del VPS; no es accesible
  desde internet.
- Los uploads (vouchers, imágenes de simulacros) persisten en el bind mount
  `./uploads` del directorio de despliegue (`/opt/sgei/uploads`); respáldalo
  con `rsync`/`scp` junto con el dump de la BD.
- El deploy fija las imágenes por SHA del commit (`:SHA`), así un redeploy
  del mismo commit es reproducible; también se publica `:latest`.
- Backup rápido de la BD:
  `docker exec sgei-db pg_dump -U sgei sgei_db > backup_$(date +%F).sql`
- Si más adelante usas dominio + SSL (recomendado): apunta el dominio al VPS,
  pon un reverse proxy (Caddy/Nginx) delante, cambia `FRONTEND_ORIGIN`,
  `VITE_API_URL` a `https://…` y `COOKIE_SECURE=true`.
