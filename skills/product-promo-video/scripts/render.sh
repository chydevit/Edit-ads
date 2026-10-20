#!/usr/bin/env bash
# Render one style of the product film, master it to -14 LUFS, and write a storyboard.
#   render.sh <project_dir> <Template|Neon|Paper> <slides_file.json> <out.mp4>
set -euo pipefail
source "$(dirname "$0")/_stage.sh"
project="$(cd "$1" && pwd)"; style="$2"; file="$3"; out="$4"
overlap="$(overlap_for "$style")"
[ -f "$project/$file" ] || { echo "missing $project/$file" >&2; exit 1; }
mkdir -p "$(dirname "$out")"; out="$(cd "$(dirname "$out")" && pwd)/$(basename "$out")"
stage="$(stage_public "$project")"; trap 'rm -rf "$stage"' EXIT
raw="$stage/raw.mp4"
( cd "$ROOT/template" && npx remotion render src/index.ts "$style" "$raw" --public-dir="$stage" \
    --props="{\"file\":\"$file\"}" --codec=h264 --crf=16 --audio-codec=aac --log=error )
# Two-pass loudnorm to -14 LUFS / -1.5 dBTP (YouTube/Facebook/TikTok target).
J="$(ffmpeg -hide_banner -i "$raw" -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')"
g() { echo "$J" | python3 -c "import json,sys;print(json.load(sys.stdin)['$1'])"; }
if [ -n "$J" ]; then
  ffmpeg -hide_banner -loglevel error -y -i "$raw" -c:v copy -af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true" \
    -ar 48000 -c:a aac -b:a 192k -movflags +faststart "$out"
else
  ffmpeg -hide_banner -loglevel error -y -i "$raw" -c copy -movflags +faststart "$out"   # silent film
fi
python3 "$ROOT/scripts/storyboard.py" "$out" "$project/$file" "$overlap"
dur="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$out")"
lufs="$(ffmpeg -hide_banner -i "$out" -af ebur128 -f null - 2>&1 | grep -A1 Integrated | tail -1 | tr -s ' ')"
echo "done: $out  (${dur}s,${lufs})"
