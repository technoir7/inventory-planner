#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

printf '[bootstrap] Running setup...\n'
bash scripts/setup.sh
printf '[bootstrap] Setup succeeded. Starting dev server...\n'
exec npm run dev
