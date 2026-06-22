#!/bin/sh
set -e

echo "[entrypoint] Applying database migrations..."
npx prisma migrate deploy

if [ "${RUN_DB_SEED:-true}" = "true" ]; then
  echo "[entrypoint] Seeding database..."
  node prisma/seed.js
fi

echo "[entrypoint] Starting backend..."
exec node src/server.js
