#!/usr/bin/env bash
#
# Starts the complete development stack: PostgreSQL 18 and the API.
# It installs dependencies, writes .env on first use, starts the database,
# applies the Prisma migrations and serves the API with hot reload.
#
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

ENV_DATABASE_URL="${DATABASE_URL:-}"
ENV_JWT_SECRET="${JWT_SECRET:-}"
ENV_PORT="${PORT:-}"

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-conduit}"
DB_USER="${DB_USER:-conduit}"

log() { printf '\n[dev] %s\n' "$*"; }
fail() {
  printf '\n[dev] ERROR: %s\n' "$*" >&2
  exit 1
}

random_hex() {
  node -e 'process.stdout.write(require("crypto").randomBytes(32).toString("hex"))'
}

if ! command -v node >/dev/null 2>&1; then
  fail "Node.js is required. Install Node.js 20 (see .nvmrc) and run this command again."
fi

if [ ! -f .env ]; then
  DB_PASSWORD="$(random_hex)"
  if [ -n "$ENV_DATABASE_URL" ]; then
    ENV_DATABASE_URL_VALUE="$ENV_DATABASE_URL"
  else
    ENV_DATABASE_URL_VALUE="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"
  fi
  cat > .env <<EOF
DATABASE_URL=${ENV_DATABASE_URL_VALUE}
JWT_SECRET=${ENV_JWT_SECRET:-$(random_hex)}
NODE_ENV=${NODE_ENV:-development}
PORT=${ENV_PORT:-3000}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME}
DB_PORT=${DB_PORT}
EOF
  chmod 600 .env
  log "Created .env with a generated database password and JWT secret."
fi

set -a
# shellcheck disable=SC1091
. ./.env
set +a

# Values provided by the environment win over the ones stored in .env.
if [ -n "$ENV_DATABASE_URL" ]; then
  export DATABASE_URL="$ENV_DATABASE_URL"
fi
if [ -n "$ENV_JWT_SECRET" ]; then
  export JWT_SECRET="$ENV_JWT_SECRET"
fi
if [ -n "$ENV_PORT" ]; then
  export PORT="$ENV_PORT"
fi

: "${DATABASE_URL:?DATABASE_URL is missing from .env}"
: "${JWT_SECRET:?JWT_SECRET is missing from .env}"

if [ -n "$ENV_DATABASE_URL" ]; then
  # The caller supplied the database address, so the launcher does not own it.
  USING_LOCAL_DB=0
else
  USING_LOCAL_DB=1
fi

if [ "$USING_LOCAL_DB" -eq 1 ]; then
  if [ -z "${DB_PASSWORD:-}" ]; then
    DB_PASSWORD="$(random_hex)"
    printf '\nDB_PASSWORD=%s\n' "$DB_PASSWORD" >>.env
    export DB_PASSWORD
    log "Added a generated DB_PASSWORD to .env."
  fi

  if ! command -v docker >/dev/null 2>&1; then
    fail "Docker is required to start PostgreSQL 18. Install Docker and run this command again."
  fi

  if ! docker compose version >/dev/null 2>&1; then
    fail "Docker Compose v2 is required to start PostgreSQL 18. Install it and run this command again."
  fi

  if ! docker info >/dev/null 2>&1; then
    fail "The Docker daemon is not running. Start Docker and run this command again."
  fi

  log "Starting PostgreSQL 18 in the background (docker compose up -d db) ..."
  docker compose up -d db

  log "Waiting for PostgreSQL to accept connections ..."
  ready=0
  for _ in $(seq 1 60); do
    if docker compose exec -T db pg_isready -U "${DB_USER}" -d "${DB_NAME}" >/dev/null 2>&1; then
      ready=1
      break
    fi
    sleep 2
  done
  if [ "$ready" -ne 1 ]; then
    fail "PostgreSQL did not become ready in time. Inspect it with 'docker compose logs db'."
  fi
else
  log "Using the PostgreSQL database from DATABASE_URL; no local container is started."
fi

log "Installing dependencies ..."
npm install --no-audit --no-fund

log "Generating the Prisma Client ..."
npx prisma generate

log "Applying the database migrations ..."
npx prisma migrate deploy

log "Starting the API on http://localhost:${PORT:-3000} (also applies pending migrations on boot) ..."
exec npx nx serve api
