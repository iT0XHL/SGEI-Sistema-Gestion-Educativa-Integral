FROM node:22-slim

# Habilitar corepack para pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copiar manifiestos
COPY package.json pnpm-workspace.yaml ./

# Instalar dependencias con pnpm
RUN pnpm install --ignore-scripts

# Copiar código fuente
COPY . .

EXPOSE 3000

# Inicia Vite en host 0.0.0.0:3000 (alcanzable desde fuera del contenedor)
CMD ["pnpm", "dev", "--host", "0.0.0.0", "--port", "3000"]
