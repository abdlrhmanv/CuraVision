# syntax=docker/dockerfile:1.7

# ---- deps ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=optional --no-audit --no-fund

# ---- runtime ----
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# dumb-init for proper signal handling (pid 1)
RUN apk add --no-cache dumb-init curl

# Non-root user — pin UID/GID to 1001 so the shared storage volume is
# accessible by the ai-service container, which uses the same UID.
RUN addgroup -S -g 1001 app && adduser -S -u 1001 -G app app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Pre-create every subdirectory the ai-service will write into.
# When Docker initialises the named volume from this image the directories
# already exist with the right ownership, so no container needs root to
# mkdir them at runtime.
RUN mkdir -p /app/storage/dicoms /app/storage/masks /app/storage/heatmaps \
 && chown -R app:app /app/storage

USER app
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://localhost:3001/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "docker-entrypoint.sh"]
