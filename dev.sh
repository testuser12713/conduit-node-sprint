#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

# Load local overrides (DATABASE_URL, JWT_SECRET, POSTGRES_*, PORT, ...) if present.
if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

DB_USER="${POSTGRES_USER:-conduit}"
DB_NAME="${POSTGRES_DB:-conduit}"

# No committed database password: generate an ephemeral one for this run when unset.
if [ -z "${POSTGRES_PASSWORD:-}" ]; then
  export POSTGRES_PASSWORD="$(node -e "process.stdout.write(require('crypto').randomBytes(24).toString('hex'))")"
fi

# Local development database URL; a value from the environment wins.
export DATABASE_URL="${DATABASE_URL:-postgresql://${DB_USER}:${POSTGRES_PASSWORD}@localhost:5432/${DB_NAME}?schema=public}"

# No committed signing key: generate an ephemeral one for this run when unset.
if [ -z "${JWT_SECRET:-}" ]; then
  export JWT_SECRET="$(node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))")"
fi

echo "Starting PostgreSQL..."
docker compose up -d db

echo "Waiting for PostgreSQL to accept connections..."
ready=0
for _ in $(seq 1 60); do
  if docker compose exec -T db pg_isready -U "${DB_USER}" -d "${DB_NAME}" >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done
if [ "${ready}" -ne 1 ]; then
  echo "PostgreSQL did not become ready in time." >&2
  exit 1
fi

echo "Applying database schema..."
npx prisma generate
npx prisma migrate deploy

echo "Starting the API..."
exec npx ts-node --transpile-only --compiler-options '{"module":"CommonJS"}' src/main.ts
