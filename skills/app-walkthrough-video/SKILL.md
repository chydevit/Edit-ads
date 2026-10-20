---
name: app-walkthrough-video
description: Produce a complete, narrated software walkthrough / tutorial video of a real desktop (Electron) or web app, from recording the real app on a clean demo profile to every deliverable — 16:9 chaptered walkthrough (10–20 min) with zooms, cursor, labels, burned animated captions and selectable subtitle tracks (e.g. EN / KM / ZH), voiceover in a designed or cloned voice (including the user's own Khmer voice), music + sfx at −14 LUFS, a 9:16 highlight cut, an N-part series, a 2-minute ad, thumbnail and covers, script, shot list, YouTube description with chapters and ready-to-paste posts. Use it whenever the user wants a tutorial, walkthrough, demo, "every feature" video, screen-recorded explainer, app review, onboarding video, a Khmer (ខ្មែរ) version of one, or wants to cut an existing walkthrough into parts, shorts, ads or covers — even if they don't name the skill. For music-only slide promos from screenshots use product-promo-video instead.
---

# App walkthrough video

The film is real footage of the real app, driven by scripts so every take is clean and repeatable,
then edited automatically to the voiceover. Everything for one film lives in a **project folder**;
the skill holds the code. Read `references/project.md` before creating a project.

```
<skill>/scripts/   setup.sh rec.sh voice.sh make.sh finish.sh split_parts.py covers.py (+ the Python steps they call)
<skill>/template/  Remotion edit (Main = 16:9, Vertical = 9:16, Covers) + rec/ harness, recorder, site tour
<skill>/examples/gennal-walkthrough/   a complete real project: 12 chapters, 74 beats, 13 scenes, EN + KM
<skill>/references/ project.md · recording.md · voice.md · editing.md
```

## Ground rules (they come from real mistakes)

- **Record the real product doing the real thing.** No mockups. If a feature can't be shown working,
  fix it or leave it out — and tell the user. Bugs found while recording are worth reporting.
- **Privacy is part of the job.** Demo HOME + fresh profile + sample projects; never the user's own
  sessions, tokens, emails, file paths, account names, IPs or QR codes. `project.json` `redact`
  blurs matching text live; `redact_css` blurs elements; still look at every take.
- **Use the product's own names** for features (from its website / UI), in every language.
- **QC from rendered files**, not from code or single stills: contact sheets of real frames, loudness
  readouts, subtitle files opened. A thing "looks right" only after you've seen it in the output.
- Ask the user before anything outward-facing (publishing, releases, pushing builds).

## Workflow

1. **Setup once:** `bash <skill>/scripts/setup.sh` (`--voice` also installs the local voice model).
2. **Plan** with the user: app + version, languages for voice and subtitles, length, what must be
   shown, what they will film themselves (installers, phone) → those become *slots*.
   Write `script/beats.json`: chapters → beats (one VO line + one shot each). See `project.md`.
3. **Demo environment** (`references/recording.md`): sample projects, demo HOME, fresh profile,
   any logins the app needs (link, don't copy, credential files that rotate).
4. **Record.** Write `rec/scenes.mjs` (one function per take; `s.shot(id)` per beat).
   `rec.sh <p> poke '<js>'` to find selectors; `rec.sh <p> scenes c04 --launch` to record;
   `rec.sh <p> site` for the website tour; `rec.sh <p> sheet` to see every take's end frame.
   Re-record a scene until the take is clean — it's cheap.
5. **Translate** (`script/translations.json`, `script/ui_<lang>.json`) — natural spoken language,
   product terms kept in Latin where that's how people say them.
6. **Voice:** `voice.sh <p> <lang>` per voice language → `qc_voice.py <p> <lang>`; regenerate
   flagged lines. For Khmer, fill `script/lexicon_km.json` until `phonetic.py <p> km` lists nothing
   that sounds wrong (`references/voice.md`).
7. **Edit:** `make.sh <p> <lang>` → timeline, SRTs for every subtitle language, burned captions + sfx,
   ad timeline, docs. Then `finish.sh <p> <lang>` renders + masters the 16:9 (with subtitle tracks),
   the 9:16 and the ad. A 15-min film renders in ~20–30 min; run it in the background.
8. **QC** (`references/editing.md` checklist): contact sheet from the rendered MP4, `ebur128` ≈ −14
   LUFS, watch transitions, open the SRTs, check zooms land on what's clicked.
9. **Derivatives on request:** `split_parts.py <p> <lang> 5` (series with title cards + per-part
   SRTs), `covers.py <p> <lang>` (thumbnail, 9:16 cover, part covers), posts are in `out/posts-<lang>.md`.
10. **Report**: paths, durations, loudness, what was verified, what's still a slot or a known flaw.

## Pacing the user

These films take hours of wall time (agent replies inside the app, voice generation, renders). Start
long steps in the background, keep working on the next thing, and give short, concrete status when the
user asks "what time done" — what's finished, what's running, a realistic estimate.
