#!/usr/bin/env bash
# Live preview in the browser while editing a project's slides.
#   studio.sh <project_dir>      then pick a style and set props to {"file":"slides_en.json"}
# Edits to the slides file are picked up when you re-run this (the project is copied into a staging dir).
set -euo pipefail
source "$(dirname "$0")/_stage.sh"
project="$(cd "$1" && pwd)"
stage="$(stage_public "$project")"; trap 'rm -rf "$stage"' EXIT
cd "$ROOT/template" && npx remotion studio src/index.ts --public-dir="$stage"
