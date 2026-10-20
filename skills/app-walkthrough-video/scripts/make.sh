#!/usr/bin/env bash
# Edit pipeline for one voice language, after recording and voice:
#   make.sh <project> <lang> [--render]
# timeline -> subtitles (all languages) -> burned captions + sfx -> ad timeline -> docs [-> finish.sh]
set -euo pipefail
SK="$(cd "$(dirname "$0")/.." && pwd)"; proj="$1"; lang="$2"
PY="python3"; [ -x "$SK/.venv/bin/python" ] && PY="$SK/.venv/bin/python"
cd "$SK/scripts"
$PY build_timeline.py "$proj" "$lang"
$PY build_srt.py "$proj" "$lang"
$PY fx.py "$proj" "$lang"
[ -f "$proj/script/ad.json" ] && $PY ad_build.py "$proj" || true
$PY make_docs.py "$proj" "$lang"
[[ " $* " == *" --render "* ]] && bash "$SK/scripts/finish.sh" "$proj" "$lang"
echo "make: $lang done"
