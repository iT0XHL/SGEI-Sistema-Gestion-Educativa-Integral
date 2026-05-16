#!/bin/sh
set -e
echo "⏳ Esperando a PostgreSQL (db:5432)..."
until pg_isready -h db -p 5432 -U sgei >/dev/null 2>&1; do sleep 1; done
echo "✅ PostgreSQL disponible"
sleep 2

echo "🔍 Introspectando BD para generar schema.prisma (prisma db pull)..."
npx prisma db pull || echo "⚠️  prisma db pull omitido"

echo "🔧 Generando cliente Prisma..."
npx prisma generate

echo "🌱 Ejecutando seed (idempotente)..."
npx prisma db seed || echo "⚠️  Seed omitido/fallido"

echo "🚀 Iniciando backend en :3001"
exec npm run dev
