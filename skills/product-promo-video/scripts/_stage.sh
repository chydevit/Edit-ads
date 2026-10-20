# Sourced by render.sh / stills.sh. Builds a throwaway public dir that layers the
# project (slides, shots, logo, music) over the template's shared fonts/sfx/music.
# Files are copied, not symlinked: Remotion's bundler skips symlinks in the public dir.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
stage_public() {
  local project="$1" stage
  stage="$(mktemp -d "${TMPDIR:-/tmp}/promo-stage.XXXXXX")"
  cp -R "$ROOT"/template/public/. "$stage/"
  # Project files win; a project music/ folder merges with the built-in tracks.
  for p in "$project"/*; do
    case "$(basename "$p")" in *.mp4|*.jpg|out|renders) continue;; esac
    cp -R "$p" "$stage/"
  done
  echo "$stage"
}
overlap_for() { case "$1" in Template) echo 8;; Neon) echo 0;; Paper) echo 14;; *) echo "unknown style $1" >&2; return 1;; esac; }
