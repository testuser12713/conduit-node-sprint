#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DB_CONTAINER="conduit-postgres"
DB_IMAGE="docker.io/library/postgres:18.6-trixie"
DB_USER="${DB_USER:-app}"
DB_PASSWORD="${DB_PASSWORD:-app}"
DB_NAME="${DB_NAME:-app}"
DB_PORT="${DB_PORT:-5432}"
API_PORT="${PORT:-3000}"
DATABASE_URL="${DATABASE_URL:-postgresql://${DB_USER}:${DB_PASSWORD}@localhost:${DB_PORT}/${DB_NAME}}"
NODE_ENV="${NODE_ENV:-development}"

port_open() {
  node -e '
    const net = require("net");
    const socket = net.connect({ host: process.argv[1], port: Number(process.argv[2]) });
    socket.setTimeout(1000);
    socket.on("connect", () => { socket.end(); process.exit(0); });
    socket.on("timeout", () => { socket.destroy(); process.exit(1); });
    socket.on("error", () => process.exit(1));
  ' "$1" "$2"
}

if [ ! -f .env ]; then
  JWT_SECRET="${JWT_SECRET:-$(node -e 'process.stdout.write(require("crypto").randomBytes(32).toString("hex"))')}"
  cat > .env <<EOF
DATABASE_URL=${DATABASE_URL}
JWT_SECRET=${JWT_SECRET}
NODE_ENV=${NODE_ENV}
PORT=${API_PORT}
EOF
  echo "Created .env with a generated JWT secret."
fi

set -a
# shellcheck disable=SC1091
. ./.env
set +a

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is missing. Add it to .env or export it before starting the product." >&2
  exit 1
fi

DB_TARGET="$(node -e '
  const url = new URL(process.env.DATABASE_URL);
  process.stdout.write(`${url.hostname} ${url.port || "5432"}`);
')"
DB_HOST="${DB_TARGET% *}"
DB_PORT="${DB_TARGET#* }"

if [ "$DB_HOST" = "localhost" ] || [ "$DB_HOST" = "127.0.0.1" ]; then
  if port_open "$DB_HOST" "$DB_PORT"; then
    echo "PostgreSQL is already reachable on ${DB_HOST}:${DB_PORT}."
  else
    if ! command -v docker >/dev/null 2>&1; then
      echo "PostgreSQL is not reachable and Docker is not installed." >&2
      echo "Install Docker or point DATABASE_URL in .env at an existing PostgreSQL 18 server." >&2
      exit 1
    fi

    export DB_USER DB_PASSWORD DB_NAME DB_PORT
    if docker compose version >/dev/null 2>&1; then
      COMPOSE_CMD=(docker compose)
    elif command -v docker-compose >/dev/null 2>&1; then
      COMPOSE_CMD=(docker-compose)
    else
      COMPOSE_CMD=()
    fi

    if [ "${#COMPOSE_CMD[@]}" -gt 0 ]; then
      "${COMPOSE_CMD[@]}" up -d db
    elif ! docker ps -a --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
      docker run -d \
        --name "$DB_CONTAINER" \
        -e POSTGRES_USER="$DB_USER" \
        -e POSTGRES_PASSWORD="$DB_PASSWORD" \
        -e POSTGRES_DB="$DB_NAME" \
        -p "${DB_PORT}:5432" \
        "$DB_IMAGE" >/dev/null
    elif [ "$(docker inspect -f '{{.State.Running}}' "$DB_CONTAINER")" != "true" ]; then
      docker start "$DB_CONTAINER" >/dev/null
    fi

    echo "Waiting for PostgreSQL on ${DB_HOST}:${DB_PORT} ..."
    DB_READY=0
    for _ in $(seq 1 60); do
      if port_open "$DB_HOST" "$DB_PORT"; then
        DB_READY=1
        break
      fi
      sleep 1
    done

    if [ "$DB_READY" -ne 1 ]; then
      echo "PostgreSQL did not become reachable within 60 seconds." >&2
      exit 1
    fi
    echo "PostgreSQL is ready."
  fi
else
  echo "Using the PostgreSQL server configured in DATABASE_URL (${DB_HOST}:${DB_PORT})."
fi

echo "Installing dependencies ..."
npm install --no-audit --no-fund

echo "Generating the Prisma client ..."
npx prisma generate

echo "Applying database migrations ..."
npx prisma migrate deploy

echo "Starting the API on http://localhost:${PORT:-3000} ..."
exec npx nx serve api
