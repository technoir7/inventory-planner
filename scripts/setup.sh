#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

create_env_file() {
  if [[ -f .env ]]; then
    echo ".env already exists; leaving it unchanged."
    return
  fi

  if [[ ! -f .env.example ]]; then
    echo "Missing .env.example; cannot create .env." >&2
    exit 1
  fi

  cp .env.example .env
  echo "Created .env from .env.example."
}

resolve_database_url() {
  if [[ -n "${DATABASE_URL:-}" ]]; then
    printf '%s\n' "$DATABASE_URL"
    return
  fi

  if [[ ! -f .env ]]; then
    return 1
  fi

  local env_line
  env_line="$(grep -E '^DATABASE_URL=' .env | tail -n 1 || true)"
  if [[ -z "$env_line" ]]; then
    return 1
  fi

  local value="${env_line#DATABASE_URL=}"
  value="${value#\"}"
  value="${value%\"}"
  value="${value#\'}"
  value="${value%\'}"

  printf '%s\n' "$value"
}

guard_database_url() {
  local database_url="$1"
  local lowered="${database_url,,}"

  if [[ -z "$database_url" ]]; then
    echo "DATABASE_URL is not set. Update .env before running setup." >&2
    exit 1
  fi

  if [[ "$lowered" == *"production"* ]] || [[ "$lowered" == *"prod"* ]]; then
    echo "Refusing to run setup against a DATABASE_URL that looks like production." >&2
    echo "DATABASE_URL=$database_url" >&2
    exit 1
  fi

  case "$lowered" in
    *"rds.amazonaws.com"*|*"neon.tech"*|*"supabase.co"*|*"render.com"*|*"railway.app"*)
      echo "Refusing to run setup against a remote DATABASE_URL that looks production-like." >&2
      echo "DATABASE_URL=$database_url" >&2
      exit 1
      ;;
  esac
}

create_env_file

database_url="$(resolve_database_url || true)"
guard_database_url "$database_url"

echo "Installing dependencies..."
npm install

echo "Generating Prisma client..."
npm run prisma:generate

echo "Pushing Prisma schema..."
npm run prisma:push

echo "Seeding database..."
npm run seed

echo "Setup complete."
