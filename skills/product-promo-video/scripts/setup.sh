#!/usr/bin/env bash
# One-time install of the Remotion renderer used by every style.
# Needs Node 18+ and ffmpeg on PATH.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
command -v node >/dev/null || { echo "Node.js 18+ is required" >&2; exit 1; }
command -v ffmpeg >/dev/null || { echo "ffmpeg is required (brew install ffmpeg / apt install ffmpeg)" >&2; exit 1; }
cd "$ROOT/template"
[ -d node_modules/remotion ] || npm install --no-audit --no-fund
npx tsc --noEmit -p . && echo "product-promo-video: ready"
