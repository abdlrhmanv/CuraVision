# syntax=docker/dockerfile:1.7

FROM python:3.13-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONPATH=/ml

WORKDIR /app

# System deps: curl for healthcheck, build-essential for native wheels that
# chromadb/onnxruntime may need on first install.
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl build-essential \
 && rm -rf /var/lib/apt/lists/*

COPY ai-service/requirements.txt ./
RUN pip install -r requirements.txt

# Non-root user — pin UID/GID to 1001 to match the backend container so
# the shared storage volume (curavision_backend_storage) is writable by both.
RUN groupadd --system --gid 1001 app \
 && useradd --system --uid 1001 --gid app --create-home --shell /usr/sbin/nologin app

# Pre-create the shared storage directories so that if this container
# initialises the named volume before the backend does, the directories
# are already present and owned by the correct UID.
RUN mkdir -p /app/storage/dicoms /app/storage/masks /app/storage/heatmaps \
 && chown -R app:app /app/storage

COPY --chown=app:app ai-service/ .
COPY --chown=app:app ml/ /ml/
RUN test -f /ml/src/inference/pipeline.py

USER app
EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=5s --start-period=180s --retries=5 \
  CMD curl -fsS http://localhost:8001/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
