#!/usr/bin/env bash
# One-time / periodic TLS setup for the production VM. Safe to run during deploy.
set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-/opt/curavision}"
DOMAIN="${TLS_DOMAIN:-curavision.mooo.com}"
CERT_DIR="${DEPLOY_DIR}/nginx/certs"
EMAIL="${TLS_EMAIL:-abdlrhmanv@proton.me}"

sudo mkdir -p "${CERT_DIR}"
sudo chown -R "${USER}:${USER}" "${DEPLOY_DIR}/nginx"

if sudo test -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"; then
  echo "[certs] Renewing Let's Encrypt certificate (if due)"
  sudo certbot renew --quiet --deploy-hook \
    "cp /etc/letsencrypt/live/${DOMAIN}/fullchain.pem ${CERT_DIR}/curavision.crt && cp /etc/letsencrypt/live/${DOMAIN}/privkey.pem ${CERT_DIR}/curavision.key" \
    || true
  sudo cp "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" "${CERT_DIR}/curavision.crt"
  sudo cp "/etc/letsencrypt/live/${DOMAIN}/privkey.pem" "${CERT_DIR}/curavision.key"
elif [[ ! -f "${CERT_DIR}/curavision.crt" ]]; then
  echo "[certs] No certificate found — requesting initial Let's Encrypt cert"
  sudo apt-get update && sudo apt-get install -y certbot
  cd "${DEPLOY_DIR}"
  docker compose -f docker-compose.yml -f docker-compose.prod.yml stop proxy || true
  sudo certbot certonly --standalone -d "${DOMAIN}" \
    --non-interactive --agree-tos -m "${EMAIL}" || true
  docker compose -f docker-compose.yml -f docker-compose.prod.yml start proxy || true
  if sudo test -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"; then
    sudo cp "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" "${CERT_DIR}/curavision.crt"
    sudo cp "/etc/letsencrypt/live/${DOMAIN}/privkey.pem" "${CERT_DIR}/curavision.key"
  else
    echo "[certs] Let's Encrypt failed — generating self-signed fallback"
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout "${CERT_DIR}/curavision.key" \
      -out "${CERT_DIR}/curavision.crt" \
      -subj "/CN=${DOMAIN}"
  fi
else
  echo "[certs] Using existing certificates in ${CERT_DIR}"
fi

sudo chmod 644 "${CERT_DIR}/curavision.crt" "${CERT_DIR}/curavision.key" 2>/dev/null || \
  chmod 644 "${CERT_DIR}/curavision.crt" "${CERT_DIR}/curavision.key"

echo "[certs] TLS material ready"
