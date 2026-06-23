#!/bin/bash
set -e

# Backup script for CuraVision PostgreSQL database.
# Requires pg_dump utility. Can be scheduled via cron.

DB_USER="${POSTGRES_USER:-curavision}"
DB_NAME="${POSTGRES_DB:-curavision}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
BACKUP_DIR="$(dirname "$0")/../backups"

# Use the postgres password if provided
if [ -n "$POSTGRES_PASSWORD" ]; then
  export PGPASSWORD="$POSTGRES_PASSWORD"
else
  export PGPASSWORD="curavision"
fi

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="curavision_backup_${TIMESTAMP}.sql.gz"

echo "Creating backups directory..."
mkdir -p "$BACKUP_DIR"

echo "Backing up database ${DB_NAME} from ${DB_HOST}:${DB_PORT} as user ${DB_USER}..."
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" | gzip > "${BACKUP_DIR}/${FILENAME}"

echo "✓ Database backup created successfully: ${BACKUP_DIR}/${FILENAME}"

# Optional: keep only the last 30 backups
echo "Cleaning up backups older than 30 days..."
find "$BACKUP_DIR" -name "curavision_backup_*.sql.gz" -type f -mtime +30 -delete
