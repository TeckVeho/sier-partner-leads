#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

echo "Starting PostgreSQL..."
docker-compose up -d

echo "Waiting for PostgreSQL..."
for i in {1..30}; do
  if docker-compose exec -T postgres pg_isready -U paag -d paag >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "Running migrations..."
npm run db:migrate:deploy

echo "Seeding..."
npm run db:seed

echo "Done. Run: npm run dev"
