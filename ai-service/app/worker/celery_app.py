"""
Celery application used for long-running AI pipelines (SDD §7).

Start a worker with:

    cd ai-service
    source .venv/bin/activate
    celery -A app.worker.celery_app.celery worker --loglevel=info

Requires a running Redis broker. The default URL is read from
`CELERY_BROKER_URL`, falling back to `redis://localhost:6379/0`.
"""
from __future__ import annotations

import os

from celery import Celery


broker_url = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
result_backend = os.getenv("CELERY_RESULT_BACKEND", broker_url)


celery = Celery(
    "curavision",
    broker=broker_url,
    backend=result_backend,
    include=["app.worker.tasks"],
)

celery.conf.update(
    task_default_queue="curavision",
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    # Generous soft-limit because real segmentation jobs can run for minutes.
    task_soft_time_limit=300,
    task_time_limit=360,
)
