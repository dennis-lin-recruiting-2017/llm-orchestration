#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT_DIR/build/package"
APP_NAME="llm-orchestration"
ZIP_NAME="llm-orchestration-v0013.zip"
rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"
cp -R "$ROOT_DIR" "$OUT_DIR/$APP_NAME"
rm -rf "$OUT_DIR/$APP_NAME/build"
pushd "$OUT_DIR" >/dev/null
zip -qr "$ZIP_NAME" "$APP_NAME"
popd >/dev/null
