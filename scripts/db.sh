#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.yml"

case "${1:-up}" in
  up)
    if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
      docker compose -f "$COMPOSE_FILE" up -d
    else
      docker volume create daily-ping-postgres-data >/dev/null
      docker start daily-ping-postgres >/dev/null 2>&1 || docker run -d \
        --name daily-ping-postgres \
        -e POSTGRES_USER=dailyping \
        -e POSTGRES_PASSWORD=dailyping \
        -e POSTGRES_DB=dailyping \
        -p 5435:5432 \
        -v daily-ping-postgres-data:/var/lib/postgresql/data \
        pgvector/pgvector:pg16 >/dev/null
    fi
    ;;
  down)
    if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
      docker compose -f "$COMPOSE_FILE" down
    else
      docker stop daily-ping-postgres >/dev/null 2>&1 || true
    fi
    ;;
  *)
    echo "Usage: $0 [up|down]" >&2
    exit 1
    ;;
esac
