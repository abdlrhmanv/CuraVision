#!/bin/sh
set -e

echo "[entrypoint] Applying database migrations..."
npx prisma migrate deploy

# Only seed database by default in non-production environments.
# In production, seeding is disabled unless explicitly set to "true".
if [ "${NODE_ENV}" != "production" ] && [ "${RUN_DB_SEED:-true}" = "true" ]; then
  echo "[entrypoint] Seeding database..."
  node prisma/seed.js
elif [ "${RUN_DB_SEED:-false}" = "true" ]; then
  echo "[entrypoint] Seeding database (explicitly requested for production)..."
  node prisma/seed.js
else
  echo "[entrypoint] Skipping database seeding."
fi

echo "[entrypoint] Starting backend..."
exec node src/server.js
