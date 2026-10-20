# Editing, deliverables and QC

## What make.sh does

1. `build_timeline.py <p> <lang>`: each beat → footage fitted to its VO (+0.9 s). Waits inside `speed`
   marks are fast-forwarded (badge "6×"), short footage freezes on its last frame, long silent stretches
   speed up ≤ 1.6×. Clicks/focus boxes smaller than ¼ of the frame become zooms (1.22–1.4×) with a spotlight,
   clicks get a synthetic cursor path + ripple. Chapter cards (2.4 s) between chapters. Also the 9:16 cut.
2. `build_srt.py <p> <lang>`: one SRT per subtitle language, timed to the VO placement (Whisper word timing
   for the base language when available, proportional for others). ≤ 42 chars × 2 lines for Latin scripts.
3. `fx.py <p> <lang>`: burns the voice language's SRT in as animated captions; adds sfx (whoosh on cards,
   pop on labels, click on clicks, swipe on fast-forward, ding on the end card).
4. `ad_build.py <p>`: 2-minute ad per language (brand slide, headline per beat, CTA end card), evenly paced.
5. `make_docs.py <p> <lang>`: script, shot list, YouTube description with chapters, posts.

`finish.sh <p> <lang>` renders, masters (two-pass loudnorm −14 LUFS / −1.5 dBTP, 48 kHz AAC) and muxes
every SRT as a selectable `mov_text` track with language tags.

## Timeline segment kinds (template/src/Main.tsx)

`clip` (footage with zooms/cursor/label/badge/headline), `card` (chapter), `slot` (dashed placeholder for
footage the user films), `faq`, `end`, `brand`. Brand name, URL and accent colours come from
`project.json brand` through the timeline, so restyling never needs code changes.

## Rendering lessons

- Don't use CSS `background-clip: text` (gradient text) in anything Remotion renders: it comes out as a
  grey box in real renders while looking fine in the studio. Captions use a dim layer plus a bright layer
  revealed with `clip-path: inset(...)` instead.
- Remotion's public dir doesn't serve symlinks; the scripts hardlink/copy into `build/public`.
- Khmer needs a Khmer font (Noto Sans Khmer is bundled) and taller line-height (≥ 1.3).
- Re-run `make.sh` after any change to beats, voice or clips: timings shift everywhere.

## Deliverables

| file | from |
|---|---|
| `out/<slug>-<lang>voice-16x9.mp4` (+ SRT tracks) | finish.sh |
| `out/<slug>-<lang>voice-highlights-9x16.mp4` | finish.sh (edit.vertical) |
| `out/<slug>-<lang>-ad-16x9.mp4` | finish.sh (script/ad.json) |
| `out/<slug>-<lang>voice.<sub>.srt` | build_srt.py |
| `out/parts/<slug>-<lang>-partXofN.mp4` + SRTs | split_parts.py (title card per part, even lengths at chapter boundaries) |
| `out/covers/*.png` | covers.py (write `covers.<lang>.parts` after splitting, matching each part's chapters) |
| `out/script-<lang>.md`, `shot-list.md`, `youtube-<lang>.md`, `posts-<lang>.md` | make_docs.py (re-run after split for the series section) |

## QC checklist (from the rendered files)

- Contact sheet: `ffmpeg -i film.mp4 -vf "fps=1/20,scale=480:-1,tile=6x8" -frames:v 1 sheet.jpg` and look at it.
- Loudness: `ffmpeg -i film.mp4 -af ebur128 -f null - 2>&1 | grep -A1 Integrated` → −14 ± 0.5 LUFS.
- Watch every chapter start, every fast-forward and the end card; check zooms land on the clicked control.
- Captions readable, never covering the thing being shown; SRT files open and line up.
- Privacy pass again on the final video (redaction can miss text that appears late in a take).
- Remaining slots and known flaws: tell the user exactly which beats and what to film.
