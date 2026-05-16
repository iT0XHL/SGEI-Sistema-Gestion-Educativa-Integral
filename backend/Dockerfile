FROM node:20-slim

# Instalar dependencias: openssl (Prisma) + postgresql-client (wait for db)
RUN apt-get update && apt-get install -y openssl postgresql-client curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar package.json
COPY package.json ./

# Instalar dependencias (sin ejecutar postinstall)
RUN npm install --ignore-scripts

# Copiar código fuente (incluyendo prisma/schema.prisma)
COPY . .

# Pre-generar cliente de Prisma
RUN npx prisma generate

EXPOSE 3001

# Entrypoint: espera DB → seed → dev
CMD ["sh", "/app/docker-entrypoint.sh"]
