# Voice

Engine: **VoxCPM2**, local and free, runs on Apple Silicon (MPS) or CUDA. `voice.sh` writes a job file
(`tts_jobs.py`) and runs the worker (`tts_vox.py`); existing wavs are skipped, so delete one wav to
regenerate one line. First run installs PyTorch (~2 GB) + the model (~5 GB).

## Choosing the voice (project.json "voice")

- **Designed voice**: `{"design": "A calm, clear, warm adult narrator, neutral accent, studio quality",
  "sample_text": "..."}`. A sample is generated once (`voice/<lang>_designed.wav`) and every line clones it,
  so the narrator stays identical across 70+ lines.
- **Cloned voice** (e.g. the user's own Khmer voice): `{"ref_wav": "voice/km_ref.wav", "ref_text": "..."}`.
  The reference: 8–20 s, one speaker, no music, little room echo; convert phone recordings to mono 16–24 kHz wav
  and trim silence. `ref_text` must be exactly what is said in it. `clone_mode: "both"` (default) uses it as
  reference and prompt and is the closest match.
- Only clone a voice the user owns or has permission to use.

## Pronunciation (lexicons)

Subtitles keep the script text; the voice gets a *spoken* version from `phonetic.py`:
- base language: regex `rules` in `script/lexicon_en.json` ("CLI" → "C L I", "GenNal" → "Gen-Nal", "1.5.9" → words).
- Khmer: `multi` (phrases) and `words` (single Latin words) respelled in Khmer script, digits → Khmer number
  words. Run `python3 scripts/phonetic.py <p> km` to list Latin words still left; add the ones the voice says
  badly. The GenNal example has ~250 developer terms ready to reuse.

## QC

`qc_voice.py <p> <lang>`: rate outliers (truncated / rushed / looping lines) for every language, and a
Whisper transcript check (WER > 12 % flagged) for the base language. Listen to every flagged line and a
random handful of others before editing. Typical fixes: change the seed, shorten the sentence, add a
lexicon entry, split a long line into two beats.
