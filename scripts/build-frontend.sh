#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_DIR="$ROOT_DIR/web"

if command -v npm >/dev/null 2>&1; then
  echo "Installing frontend dependencies with npm"
  pushd "$WEB_DIR" >/dev/null
  npm install
  npm run build
  popd >/dev/null
else
  echo "npm not found; using checked-in web/dist bundle"
fi
