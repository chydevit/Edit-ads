#!/usr/bin/env bash
# Record footage.
#   rec.sh <project> launch                 start the app fresh on the demo profile
#   rec.sh <project> scenes c04,c05 [--launch]   run scenes from <project>/rec/scenes.mjs
#   rec.sh <project> site                   record the website tour
#   rec.sh <project> poke '<js>' [shot.png] inspect the running app (selectors, text) while writing scenes
#   rec.sh <project> sheet                  contact sheet of the end frame of every recorded take
set -euo pipefail
SK="$(cd "$(dirname "$0")/.." && pwd)"
export WALK_PROJECT="$(cd "$1" && pwd)"; export WALK_HARNESS="$SK/template/rec/harness.mjs"
unset ELECTRON_RUN_AS_NODE || true
cmd="$2"; shift 2
case "$cmd" in
  launch) ( cd "$SK/template" && node --input-type=module -e "const H=await import(process.env.WALK_HARNESS); await H.launch({fresh:true}); console.log('app up'); process.exit(0)" ) ;;
  scenes) ( cd "$SK/template" && node "$WALK_PROJECT/rec/scenes.mjs" "$@" ) ;;
  site)   ( cd "$SK/template" && node rec/site.mjs ) ;;
  poke)   ( cd "$SK/template" && node rec/cdp.mjs "$@" ) ;;
  sheet)  ls "$WALK_PROJECT"/build/qc/end_*.png >/dev/null 2>&1 || { echo "no takes yet"; exit 1; }
          ffmpeg -v error -y -pattern_type glob -i "$WALK_PROJECT/build/qc/end_*.png" -vf "scale=640:-1,tile=3x4:padding=6" -frames:v 1 "$WALK_PROJECT/build/qc/takes.jpg"
          echo "$WALK_PROJECT/build/qc/takes.jpg" ;;
  *) echo "unknown: $cmd"; exit 1 ;;
esac
