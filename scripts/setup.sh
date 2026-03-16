#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

DATABASE_URL_SOURCE="unset"

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

log_step() {
  local message="$1"
  printf '[setup] %s\n' "$message"
}

run_step() {
  local step_name="$1"
  shift

  log_step "Starting ${step_name}..."
  if "$@"; then
    log_step "Completed ${step_name}."
    return 0
  fi

  local status=$?
  log_step "${step_name} failed."
  return "$status"
}

read_env_assignment() {
  local key="$1"
  local file_path="$2"

  if [[ ! -f "$file_path" ]]; then
    return 1
  fi

  local env_line
  env_line="$(grep -E "^${key}=" "$file_path" | tail -n 1 || true)"
  if [[ -z "$env_line" ]]; then
    return 1
  fi

  local value="${env_line#${key}=}"
  value="${value#\"}"
  value="${value%\"}"
  value="${value#\'}"
  value="${value%\'}"

  printf '%s\n' "$value"
}

resolve_database_url() {
  if [[ -n "${DATABASE_URL:-}" ]]; then
    DATABASE_URL_SOURCE="environment"
    printf '%s\n' "$DATABASE_URL"
    return
  fi

  local value
  value="$(read_env_assignment DATABASE_URL .env || true)"
  if [[ -z "$value" ]]; then
    return 1
  fi

  DATABASE_URL_SOURCE=".env"
  printf '%s\n' "$value"
}

resolve_example_database_url() {
  read_env_assignment DATABASE_URL .env.example
}

is_local_database_url() {
  local lowered="${1,,}"

  case "$lowered" in
    *"@localhost"*|*"@127.0.0.1"*|*"@0.0.0.0"*|*"@::1"*|*"host=localhost"*|*"host=127.0.0.1"*|*"host=/tmp"*|*"host=%2ftmp"*)
      return 0
      ;;
  esac

  return 1
}

looks_like_placeholder_database_url() {
  local database_url="$1"
  local example_database_url="${2:-}"
  local lowered="${database_url,,}"

  if [[ -n "$example_database_url" && "$database_url" == "$example_database_url" ]]; then
    return 0
  fi

  case "$lowered" in
    *"://<"*|*"@"*">"*|*"{your_"*|*"<username>"*|*"<password>"*|*"<database>"*|*"your_username"*|*"your_password"*|*"your_database"*|*"change_me"*|*"changeme"*|*"replace_me"*|*"example"*)
      return 0
      ;;
  esac

  return 1
}

warn_if_local_database_url_looks_invalid() {
  local database_url="$1"
  local example_database_url="${2:-}"

  if ! is_local_database_url "$database_url"; then
    return
  fi

  if ! looks_like_placeholder_database_url "$database_url" "$example_database_url"; then
    return
  fi

  echo "DATABASE_URL looks like example local Postgres credentials." >&2
  echo "Resolved DATABASE_URL from ${DATABASE_URL_SOURCE}." >&2
  echo "If your local Postgres username, password, or database name differ, Prisma setup will fail to authenticate." >&2
  echo "Set DATABASE_URL in .env or your shell before rerunning setup." >&2
}

is_prisma_auth_or_connectivity_error() {
  local lowered="${1,,}"

  case "$lowered" in
    *"p1000"*|*"authentication failed"*|*"password authentication failed"*|*"role "*' does not exist'*|*"p1001"*|*"can't reach database server"*|*"could not connect to server"*|*"connection refused"*|*"timed out"*|*"timeout"*|*"database "*' does not exist'*)
      return 0
      ;;
  esac

  return 1
}

run_prisma_push() {
  local database_url="$1"
  local example_database_url="${2:-}"
  local output_file
  output_file="$(mktemp)"

  log_step "Starting prisma push..."
  if npm run prisma:push >"$output_file" 2>&1; then
    cat "$output_file"
    rm -f "$output_file"
    log_step "Completed prisma push."
    return 0
  else
    local status=$?
  fi

  local output
  output="$(cat "$output_file")"
  rm -f "$output_file"

  printf '%s\n' "$output" >&2
  log_step "prisma push failed."

  if is_prisma_auth_or_connectivity_error "$output"; then
    echo "Prisma could not connect to the Postgres database configured in DATABASE_URL." >&2
    echo "Check that PostgreSQL is running, the username and password are correct, and the database already exists." >&2

    if is_local_database_url "$database_url"; then
      if looks_like_placeholder_database_url "$database_url" "$example_database_url"; then
        echo "The configured URL still looks like the example local credentials from .env.example." >&2
      fi

      echo "Update DATABASE_URL in .env or your shell, create the database if needed, then rerun npm run setup or npm run bootstrap." >&2
      echo "Database setup failed. Check DATABASE_URL, ensure PostgreSQL is running, and create the database if needed." >&2
      return "$status"
    fi

    echo "Update DATABASE_URL and rerun npm run setup or npm run bootstrap." >&2
    echo "Database setup failed. Check DATABASE_URL, ensure PostgreSQL is running, and create the database if needed." >&2
    return "$status"
  fi

  echo "Database setup failed. Check DATABASE_URL, ensure PostgreSQL is running, and create the database if needed." >&2
  return "$status"
}

guard_database_url() {
  local database_url="$1"
  local lowered="${database_url,,}"

  if [[ -z "$database_url" ]]; then
    echo "DATABASE_URL is not set." >&2
    echo "Set DATABASE_URL in .env or your shell before running setup, then rerun npm run setup or npm run bootstrap." >&2
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
example_database_url="$(resolve_example_database_url || true)"
guard_database_url "$database_url"
warn_if_local_database_url_looks_invalid "$database_url" "$example_database_url"

run_step "install" npm install
run_step "prisma generate" npm run prisma:generate
run_prisma_push "$database_url" "$example_database_url"
run_step "seed" npm run seed

log_step "Setup complete."
