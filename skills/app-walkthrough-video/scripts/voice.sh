#!/usr/bin/env bash
# Generate voice lines with VoxCPM2 (local, free; clones a reference voice).
#   voice.sh <project> <lang> [--ad]
# First run creates a Python venv with PyTorch (~2 GB) and downloads the model (~5 GB).
set -euo pipefail
SK="$(cd "$(dirname "$0")/.." && pwd)"
proj="$1"; lang="$2"; shift 2
python3 "$SK/scripts/tts_jobs.py" "$proj" "$lang" "$@"
job="$proj/build/tts_${lang}$([[ " $* " == *" --ad "* ]] && echo _ad).json"
if [ ! -x "$SK/.venv-vox/bin/python" ]; then
  echo "creating VoxCPM venv (PyTorch, ~2 GB)..."
  python3 -m venv "$SK/.venv-vox" && "$SK/.venv-vox/bin/pip" install -q --upgrade pip && "$SK/.venv-vox/bin/pip" install -q voxcpm soundfile
fi
"$SK/.venv-vox/bin/python" "$SK/scripts/tts_vox.py" "$job"
