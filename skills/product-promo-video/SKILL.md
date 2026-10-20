---
name: product-promo-video
description: Make a polished 16:9 product promo / launch film (music-only, ~1:30–2:00, 1920×1080 MP4) from app or website screenshots, in Khmer and/or English, in three ready styles — Template (light/dark alternating slides with floating 3D window screenshots, like a classic SaaS product video), Neon (dark, glowing, fast, light-streak cuts) and Paper (warm editorial, thick outlines, hard shadows, page-push). Renders with Remotion, masters to −14 LUFS and checks every slide in a storyboard. Use it whenever the user wants a product video, promo, launch video, feature showcase, app trailer, "video like this template", a Khmer (ខ្មែរ) product video, or another style/language version of one — even if they don't name the skill.
---

# Product promo video

Slide-based product films: a kicker, a big headline that animates in line by line with one accent
line, a short sub-line, and a cropped screenshot of the real product. No voiceover — music + sfx
carry it, so it plays muted on social feeds and works in any language.

Everything is driven by one JSON file per language. The three styles read the *same* file, so once
the slides are written you can render every style × language for free.

```
<skill>/
  scripts/setup.sh        one-time npm install (Node 18+, ffmpeg)
  scripts/stills.sh       quick layout check: one still per slide → contact sheet (~1 min)
  scripts/studio.sh       live browser preview of a project (for the user)
  scripts/render.sh       full render → −14 LUFS master → <out>-storyboard.jpg
  scripts/music.py        synthesize an original royalty-free track (needs numpy)
  scripts/sfx.py          re-synthesize the sfx pack (needs numpy)
  template/               Remotion project: src/Product.tsx (Template), src/Styles.tsx (Neon, Paper)
  examples/gennal/        complete working project: 24 slides KM + EN, shots, logo
  references/slides.md    slide JSON schema, every slide kind, crop maths, writing rules
```

## Workflow

1. **Setup (once):** `bash <skill>/scripts/setup.sh`. If it fails, fix Node/ffmpeg first.
2. **Make a project folder** anywhere (not inside the skill):
   ```
   my-film/
     slides_km.json   slides_en.json     # one per language
     logo.png                            # square, transparent, ~256px
     shots/*.png                         # screenshots, all the same pixel size
     music/<file>                        # optional, else built-in upbeat/calm
   ```
   Copying `examples/gennal` and editing it is the fastest start.
3. **Get screenshots.** Real product, clean demo data. Capture at a high resolution
   (e.g. 2880×1620 = a 1440×810 window at 2×) so crops stay sharp, and set `shot.w/h` to that size.
   Before using any shot, look at it for tokens, emails, account names, file paths, IPs, QR codes —
   crop them out or blur them in the source image. The film is public; this is the step that leaks.
4. **Write the slides** — read `references/slides.md` first. Story order that works:
   problem → stats → brand/section → overview (two / steps) → one feature per slide grouped
   into 2–4 sections (each opened by a `dark` slide) → platforms → end tiles with URL.
   20–26 slides of 4.6 s ≈ 1:45. Headlines: 2–3 short lines, the payoff line as `accent`.
5. **Check layout before rendering:**
   `bash <skill>/scripts/stills.sh my-film Neon slides_km.json /tmp/check.jpg`
   (add `0,5,9` to check only those slide indexes). Look at the image. Fix crops that show
   nothing readable, headlines that look cramped, empty areas.
6. **Render:** `bash <skill>/scripts/render.sh my-film <Template|Neon|Paper> slides_km.json out/Film-NEON-KHMER.mp4`
   Takes ~2–4 min per film. Writes the MP4 (h264/AAC, faststart, −14 LUFS) and
   `out/Film-NEON-KHMER-storyboard.jpg`.
7. **QC from the rendered file, not the code.** Open the storyboard. Every slide should be
   settled, readable, on-brand, with no private data. If anything is off, fix and re-render that
   film. Report path, duration and loudness to the user.

When the user gives a reference video "in this style", watch it first (sample frames with ffmpeg,
check loudness, voice or not, pacing per slide) and map it onto the closest style; then adjust
colours/durations in the JSON or the style file rather than starting from scratch.

## Styles

| id | look | music default | slide overlap |
|---|---|---|---|
| `Template` | light lavender slides alternating with dark section slides; floating 3D window screenshots; stat cards; numbered steps | `music/upbeat.m4a` | 8 frames crossfade |
| `Neon` | near-black with moving grid and violet/cyan glows; glowing panels that wipe open and push in; mask-reveal headlines; giant outlined chapter numbers; light-streak cuts; progress bar | `music/upbeat.m4a` | 0 (hard cut + streak) |
| `Paper` | warm paper with dot grid; thick black outlines and coloured hard shadows; highlighter accent; sticker stats; page-push transitions; page counter | `music/calm.m4a` | 14 frames push |

Colours live at the top of each style (`VIOLET/CYAN/INK` in Product.tsx, `N` and `P` objects in
Styles.tsx). To brand a film, change those constants — keep contrast high, keep one accent.

## Khmer notes

- Fonts are bundled: Kantumruy Pro (Khmer) + Montserrat (Latin), mixed in one line automatically.
- Write natural Khmer, keep product/feature names in English (Claude Code, commit, diff) — that is
  how Khmer developers actually talk, and it matches the UI in the screenshots.
- End sentences with `។`; the accent string must equal one whole headline line exactly.
- Headlines shrink to fit instead of wrapping, so a line never breaks inside a word. If a line
  becomes visibly small, split it into two lines rather than accepting a tiny font.

## Music

Built-in tracks are original synthesized beds (no licensing). For a new track of the right length:
`python3 <skill>/scripts/music.py -o my-film/music/bed.wav --dur 110 --mood hype --bpm 120`
then set `"music": "music/bed.wav"` in the slides file (`"music": ""` renders silent).
