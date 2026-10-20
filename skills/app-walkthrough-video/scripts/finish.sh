#!/usr/bin/env bash
# Render + master the deliverables for one voice language.
#   finish.sh <project> <lang> [walkthrough|vertical|ad|all]   (default all)
# walkthrough: out/<slug>-<lang>voice-16x9.mp4 with every subtitle language as a selectable track
# vertical:    out/<slug>-<lang>voice-highlights-9x16.mp4 (captions burned in)
# ad:          out/<slug>-<lang>-ad-16x9.mp4
# Expects build_timeline.py, build_srt.py and fx.py to have run (make.sh does all of it).
set -euo pipefail
SK="$(cd "$(dirname "$0")/.." && pwd)"; source "$SK/scripts/_master.sh"
proj="$(cd "$1" && pwd)"; lang="$2"; what="${3:-all}"
slug="$(python3 -c "import json;p=json.load(open('$proj/project.json'));print(p.get('slug',p.get('name','video')))")"
pub="$proj/build/public"; out="$proj/out"; mkdir -p "$out"
render() { ( cd "$SK/template" && npx remotion render src/index.ts "$1" "$2" --public-dir="$pub" --props="{\"file\":\"$3\"}" \
  --codec=h264 --crf=18 --audio-codec=aac --audio-bitrate=256k --log=error ); }
iso() { case "$1" in en) echo eng;; km) echo khm;; zh) echo chi;; th) echo tha;; vi) echo vie;; ja) echo jpn;; ko) echo kor;; fr) echo fre;; es) echo spa;; *) echo "$1";; esac; }
name() { case "$1" in en) echo English;; km) echo Khmer;; zh) echo Chinese;; th) echo Thai;; vi) echo Vietnamese;; ja) echo Japanese;; ko) echo Korean;; fr) echo French;; es) echo Spanish;; *) echo "$1";; esac; }

if [[ "$what" == all || "$what" == walkthrough ]]; then
  render Walkthrough "$out/.raw-$lang.mp4" "timeline_$lang.json"
  master "$out/.raw-$lang.mp4" "$out/.norm-$lang.mp4"
  args=(-i "$out/.norm-$lang.mp4"); maps=(-map 0); meta=(-metadata:s:a:0 "language=$(iso "$lang")"); i=0
  subs=$(python3 -c "import json;p=json.load(open('$proj/project.json'));s=p.get('subtitles',['$lang']);print(' '.join(['$lang']+[x for x in s if x!='$lang']))")
  for s in $subs; do
    f="$out/$slug-${lang}voice.$s.srt"; [ -f "$f" ] || continue
    args+=(-i "$f"); i=$((i+1)); maps+=(-map "$i")
    meta+=(-metadata:s:s:$((i-1)) "language=$(iso "$s")" -metadata:s:s:$((i-1)) "title=$(name "$s")")
  done
  ffmpeg -v error -y "${args[@]}" "${maps[@]}" -c copy -c:s mov_text "${meta[@]}" -movflags +faststart "$out/$slug-${lang}voice-16x9.mp4"
  rm -f "$out/.raw-$lang.mp4" "$out/.norm-$lang.mp4"; report "$out/$slug-${lang}voice-16x9.mp4"
fi
if [[ ( "$what" == all || "$what" == vertical ) && -f "$pub/vertical_$lang.json" ]]; then
  render Vertical "$out/.rv-$lang.mp4" "vertical_$lang.json"
  master "$out/.rv-$lang.mp4" "$out/$slug-${lang}voice-highlights-9x16.mp4"; rm -f "$out/.rv-$lang.mp4"
  report "$out/$slug-${lang}voice-highlights-9x16.mp4"
fi
if [[ ( "$what" == all || "$what" == ad ) && -f "$pub/ad_$lang.json" ]]; then
  render Ad "$out/.ra-$lang.mp4" "ad_$lang.json"
  master "$out/.ra-$lang.mp4" "$out/$slug-$lang-ad-16x9.mp4"; rm -f "$out/.ra-$lang.mp4"
  report "$out/$slug-$lang-ad-16x9.mp4"
fi
