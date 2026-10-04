#!/bin/sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 backups/sql-vault-YYYYMMDDTHHMMSSZ.dump" >&2
  exit 1
fi

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"
backup_file="$1"

if [ ! -f "$backup_file" ]; then
  echo "Backup not found: $backup_file" >&2
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE" >&2
  exit 1
fi

POSTGRES_USER="$(grep '^POSTGRES_USER=' "$ENV_FILE" | tail -n1 | cut -d= -f2-)"
POSTGRES_DB="$(grep '^POSTGRES_DB=' "$ENV_FILE" | tail -n1 | cut -d= -f2-)"

if [ -z "$POSTGRES_USER" ] || [ -z "$POSTGRES_DB" ]; then
  echo "POSTGRES_USER and POSTGRES_DB must be defined in $ENV_FILE" >&2
  exit 1
fi

echo "This will replace objects in database '$POSTGRES_DB'."
echo "Set CONFIRM_RESTORE=$POSTGRES_DB to continue."

if [ "${CONFIRM_RESTORE:-}" != "$POSTGRES_DB" ]; then
  echo "Restore cancelled." >&2
  exit 1
fi

cat "$backup_file" | docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T db   pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB"     --clean --if-exists --no-owner --no-acl

echo "Restore completed from $backup_file"
