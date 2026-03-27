#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="$ROOT_DIR/build"
mkdir -p "$BUILD_DIR"
pushd "$ROOT_DIR" >/dev/null
CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o "$BUILD_DIR/llm-orchestration" ./
popd >/dev/null
