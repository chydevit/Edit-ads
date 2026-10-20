#!/usr/bin/env bash
# Link every skill in this repo into Claude Code and install their dependencies.
#   bash install.sh            all skills
#   bash install.sh --voice    also the local voice model for app-walkthrough-video (~7 GB)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
DEST="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"; mkdir -p "$DEST"
for s in "$ROOT"/skills/*/; do
  n="$(basename "$s")"
  if [ -e "$DEST/$n" ] && [ ! -L "$DEST/$n" ]; then echo "skip $n: $DEST/$n exists and is not a link"; continue; fi
  ln -sfn "${s%/}" "$DEST/$n"; echo "linked $n -> $DEST/$n"
  bash "$s/scripts/setup.sh" "$@"
done
