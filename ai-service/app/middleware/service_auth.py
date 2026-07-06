"""Service-to-service authentication for internal AI endpoints."""

from __future__ import annotations

import secrets

from fastapi import Header, HTTPException, status

from app.core.config import settings

# Backend → AI uses X-Service-Token; Celery → backend uses X-Internal-Token.
# Both carry the same shared secret (INTERNAL_SERVICE_TOKEN).
_SERVICE_TOKEN_HEADERS = ("X-Internal-Token", "X-Service-Token")


async def verify_service_token(
    x_internal_token: str | None = Header(None, alias="X-Internal-Token"),
    x_service_token: str | None = Header(None, alias="X-Service-Token"),
) -> None:
    """Require a valid shared secret on all /ai/* routes."""
    expected = (settings.internal_service_token or "").strip()
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service authentication is not configured.",
        )

    provided = (x_internal_token or x_service_token or "").strip()
    if not provided or not secrets.compare_digest(provided, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
        )
