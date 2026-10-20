#!/usr/bin/env bash
# Fast layout check before a full render: one still per slide -> contact sheet.
#   stills.sh <project_dir> <Template|Neon|Paper> <slides_file.json> <out.jpg> [slide,slide,...]
set -euo pipefail
source "$(dirname "$0")/_stage.sh"
project="$(cd "$1" && pwd)"; style="$2"; file="$3"; out="$4"; only="${5:-}"
mkdir -p "$(dirname "$out")"; out="$(cd "$(dirname "$out")" && pwd)/$(basename "$out")"
stage="$(stage_public "$project")"; trap 'rm -rf "$stage"' EXIT
( cd "$ROOT/template" && node qc-stills.mjs "$stage" "$style" "$file" "$(overlap_for "$style")" "$stage/stills" "$only" )
n=$(ls "$stage/stills" | wc -l | tr -d ' '); rows=$(( (n + 3) / 4 )); cols=$(( n < 4 ? n : 4 ))
ffmpeg -loglevel error -y -pattern_type glob -i "$stage/stills/*.png" -vf "tile=${cols}x${rows}:padding=6" -frames:v 1 "$out"
echo "stills: $out"
