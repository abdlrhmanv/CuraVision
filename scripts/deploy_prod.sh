#!/usr/bin/env bash
# Production deploy helper — invoked by CD after compose files and secrets are on the VM.
set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-/opt/curavision}"
IMAGE_TAG="${CURAVISION_IMAGE_TAG:-latest}"
COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.prod.yml)

cd "${DEPLOY_DIR}"

log() { echo "[deploy] $*"; }

require_var() {
  if [[ -z "${!1:-}" ]]; then
    echo "ERROR: required env var $1 is not set" >&2
    exit 1
  fi
}

require_var GROQ_API_KEY

# Preserve auth secrets across redeploys unless explicitly provided.
if [[ -f .env ]] && grep -q '^JWT_SECRET=' .env; then
  JWT_SEC="$(grep '^JWT_SECRET=' .env | cut -d= -f2-)"
else
  JWT_SEC="$(openssl rand -hex 32)"
fi

if [[ -n "${INTERNAL_SERVICE_TOKEN:-}" ]]; then
  INTERNAL_TOKEN="${INTERNAL_SERVICE_TOKEN}"
elif [[ -f .env ]] && grep -q '^INTERNAL_SERVICE_TOKEN=' .env; then
  INTERNAL_TOKEN="$(grep '^INTERNAL_SERVICE_TOKEN=' .env | cut -d= -f2-)"
else
  INTERNAL_TOKEN="$(openssl rand -hex 32)"
fi

log "Writing .env (tag=${IMAGE_TAG})"
cat > .env <<EOF
JWT_SECRET=${JWT_SEC}
INTERNAL_SERVICE_TOKEN=${INTERNAL_TOKEN}
GROQ_API_KEY=${GROQ_API_KEY}
POSTGRES_USER=${POSTGRES_USER:-curavision}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-curavision_prod_pass}
POSTGRES_DB=${POSTGRES_DB:-curavision}
MINIO_ROOT_USER=${MINIO_ROOT_USER:-curavision}
MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD:-curavision_prod_pass}
CORS_ORIGIN=${CORS_ORIGIN:-https://curavision.mooo.com}
BACKEND_URL=${BACKEND_URL:-https://curavision.mooo.com}
SMTP_HOST=${SMTP_HOST:-}
SMTP_USER=${SMTP_USER:-}
SMTP_PASS=${SMTP_PASS:-}
SMTP_PORT=${SMTP_PORT:-465}
SMTP_SECURE=${SMTP_SECURE:-true}
SMTP_FROM=${SMTP_FROM:-}
INFERENCE_STRATEGY=onnx
CLS_ONNX_PATH=/models/classification.onnx
SEG_ONNX_PATH=/models/segmentation.onnx
EOF

mkdir -p ai-service models
cp .env ai-service/.env

if [[ -x scripts/download_weights.sh ]]; then
  if [[ -n "${MODEL_WEIGHTS_URL:-}" ]]; then
    export MODEL_WEIGHTS_URL
    export MODEL_WEIGHTS_DIR="${DEPLOY_DIR}/models"
    bash scripts/download_weights.sh
  elif [[ ! -f models/classification.onnx ]] || [[ ! -f models/segmentation.onnx ]]; then
    echo "ERROR: MODEL_WEIGHTS_URL is not set and models/ is missing ONNX files." >&2
    exit 1
  else
    log "Reusing existing ONNX models in models/"
  fi
fi

for model_file in classification.onnx classification.onnx.data segmentation.onnx segmentation.onnx.data; do
  if [[ ! -f "models/${model_file}" ]]; then
    echo "ERROR: models/${model_file} is missing on the server." >&2
    exit 1
  fi
done

export CURAVISION_IMAGE_TAG="${IMAGE_TAG}"

if [[ -n "${GHCR_TOKEN:-}" ]] && [[ -n "${GHCR_USER:-}" ]]; then
  echo "${GHCR_TOKEN}" | docker login ghcr.io -u "${GHCR_USER}" --password-stdin
fi

log "Pulling images (${IMAGE_TAG})"
"${COMPOSE[@]}" pull

# Fallback for legacy compose files that still bind-mount ./ml
if [[ ! -f ml/src/inference/pipeline.py ]]; then
  log "Seeding ml/ from ai-service image"
  docker rm -f ml-extract 2>/dev/null || true
  docker create --name ml-extract "ghcr.io/abdlrhmanv/curavision/ai-service:${IMAGE_TAG}"
  mkdir -p ml
  docker cp ml-extract:/ml/. ./ml/
  docker rm ml-extract
fi

log "Starting stack"
"${COMPOSE[@]}" up -d --remove-orphans

# Nginx caches upstream IPs — restart after app containers are recreated.
if docker ps --format '{{.Names}}' | grep -qx curavision-proxy; then
  log "Restarting reverse proxy"
  docker restart curavision-proxy
fi

wait_for_service() {
  local service="$1"
  local attempts="${2:-30}"
  local delay="${3:-5}"
  local i=0
  while (( i < attempts )); do
    if "${COMPOSE[@]}" ps --status running "${service}" 2>/dev/null | grep -q "${service}"; then
      local health
      health="$("${COMPOSE[@]}" ps --format json "${service}" 2>/dev/null | grep -o '"Health":"[^"]*"' | head -1 || true)"
      if [[ -z "${health}" ]] || echo "${health}" | grep -q '"Health":"healthy"'; then
        log "${service} is up"
        return 0
      fi
    fi
    sleep "${delay}"
    i=$((i + 1))
  done
  echo "ERROR: ${service} failed to become healthy in time" >&2
  "${COMPOSE[@]}" ps
  "${COMPOSE[@]}" logs --tail 80 "${service}" || true
  return 1
}

wait_for_service backend
wait_for_service ai-service
wait_for_service ai-worker
wait_for_service frontend

if curl -fsS --max-time 15 "${BACKEND_URL:-https://curavision.mooo.com}/health" >/dev/null; then
  log "Public health check passed"
else
  echo "ERROR: public /health check failed" >&2
  exit 1
fi

# Remove dangling layers only — keep previous tags for rollback.
docker image prune -f

log "Deploy complete (tag=${IMAGE_TAG})"
