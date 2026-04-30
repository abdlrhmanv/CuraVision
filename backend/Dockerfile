# syntax=docker/dockerfile:1.7

# ---- deps ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=optional --no-audit --no-fund

# ---- runtime ----
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# dumb-init for proper signal handling (pid 1)
RUN apk add --no-cache dumb-init curl

# non-root user
RUN addgroup -S app && adduser -S app -G app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Only the storage dir needs to be writable by the app user. Recursively
# chown'ing all of /app (node_modules included) would add minutes to builds.
RUN mkdir -p /app/storage && chown app:app /app/storage

USER app
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://localhost:3001/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]
