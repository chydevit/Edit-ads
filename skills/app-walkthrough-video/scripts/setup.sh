#!/usr/bin/env bash
# One-time setup.  setup.sh [--voice]
#   always:  Remotion + Playwright (npm), a small Python venv with faster-whisper (subtitle timing, voice QC)
#   --voice: also the VoxCPM2 voice venv (PyTorch ~2 GB) and model (~5 GB). voice.sh does this on first use too.
set -euo pipefail
SK="$(cd "$(dirname "$0")/.." && pwd)"
ok() { echo "  ✓ $1"; }; bad() { echo "  ✗ $1" >&2; }
command -v node >/dev/null && ok "node $(node -v)" || { bad "Node.js 18+ is required"; exit 1; }
command -v ffmpeg >/dev/null && ok "ffmpeg" || { bad "ffmpeg is required (brew install ffmpeg / apt install ffmpeg)"; exit 1; }
command -v python3 >/dev/null && ok "python3" || { bad "python3 is required"; exit 1; }
cd "$SK/template"
[ -L node_modules ] && rm node_modules
[ -d node_modules/remotion ] && [ -d node_modules/playwright-core ] || npm install --no-audit --no-fund
npx tsc --noEmit -p . && ok "remotion template"
if [ ! -x "$SK/.venv/bin/python" ]; then python3 -m venv "$SK/.venv" && "$SK/.venv/bin/pip" install -q --upgrade pip; fi
"$SK/.venv/bin/pip" install -q numpy faster-whisper 2>&1 | grep -v notice || true
"$SK/.venv/bin/python" -c "import faster_whisper, numpy" && ok "python venv (faster-whisper)" || bad "faster-whisper failed: subtitles fall back to proportional timing"
if [[ " $* " == *" --voice "* ]]; then
  if [ ! -x "$SK/.venv-vox/bin/python" ]; then python3 -m venv "$SK/.venv-vox" && "$SK/.venv-vox/bin/pip" install -q --upgrade pip; fi
  "$SK/.venv-vox/bin/pip" install -q voxcpm soundfile 2>&1 | grep -v notice || true
  "$SK/.venv-vox/bin/python" -c "from huggingface_hub import snapshot_download; print('  model:', snapshot_download('openbmb/VoxCPM2'))" && ok "VoxCPM2 voice"
fi
echo "app-walkthrough-video: ready"
