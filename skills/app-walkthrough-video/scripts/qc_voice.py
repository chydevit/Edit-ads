"""Check every generated VO line before editing.

usage: qc_voice.py <project> <lang> [--ad]
- speaking rate outliers (chars/sec far from the median) catch truncated, rushed or looping lines
- base language: Whisper transcript vs. script, word error rate > 12 % is flagged (needs faster-whisper)
Regenerate a flagged line by deleting its wav (or changing its seed in the job) and re-running voice.sh.
"""
import json, os, re, statistics, subprocess, sys
import project as pj

P = pj.load(); lang = sys.argv[2]; AD = '--ad' in sys.argv
BASE = P.get('base_lang', 'en')
d = pj.path(P, 'tts_ad' if AD else 'tts', lang)
if AD:
    items = {b['id']: b[lang] for b in pj.jload(P, 'script', 'ad.json')['beats']}
else:
    tr = pj.jload(P, 'script', 'translations.json', default={})
    items = {b['id']: (b['vo'] if lang == BASE else tr[b['id']][lang]) for b in pj.jload(P, 'script', 'beats.json')['beats'] if b.get('vo')}
rows = []
for bid, text in items.items():
    w = os.path.join(d, f'{bid}.wav')
    if not os.path.exists(w):
        print(f'{bid} MISSING'); continue
    s = pj.dur(w); rows.append((bid, s, len(text) / s, text))
if not rows:
    sys.exit('no audio yet')
med = statistics.median(r[2] for r in rows)
bad = [(b, round(s, 1), round(c, 1)) for b, s, c, _ in rows if c < med * 0.6 or c > med * 1.5]
print(f'{len(rows)} lines, median {med:.1f} chars/s, total {sum(r[1] for r in rows) / 60:.1f} min')
print('rate outliers (id, sec, chars/s):', bad or 'none')
if lang == BASE:
    try:
        import numpy as np
        from faster_whisper import WhisperModel
    except ImportError:
        sys.exit('(install faster-whisper for the transcript check)')
    m = WhisperModel('small', compute_type='int8')
    norm = lambda s: re.sub(r"[^a-z0-9 ]", " ", s.lower()).split()
    def wer(a, b):
        dd = list(range(len(b) + 1))
        for i in range(1, len(a) + 1):
            p, dd[0] = dd[0], i
            for j in range(1, len(b) + 1):
                p, dd[j] = dd[j], min(dd[j] + 1, dd[j - 1] + 1, p + (a[i - 1] != b[j - 1]))
        return dd[len(b)] / max(1, len(a))
    hint = ', '.join(P.get('asr_hint', [pj.brand(P)['name']]))
    for bid, s, c, text in rows:
        a = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'quiet', '-i', os.path.join(d, f'{bid}.wav'), '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'],
                                         capture_output=True).stdout, np.float32)
        segs, _ = m.transcribe(a, language=lang, initial_prompt=hint)
        asr = ' '.join(x.text for x in segs).strip(); e = wer(norm(text), norm(asr))
        if e > 0.12:
            print(f'{bid} WER {e:.2f} <<< heard: {asr[:120]}')
    print('transcript check done')
