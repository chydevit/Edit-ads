"""Write one SRT per subtitle language, timed to where each VO line landed in the cut.

usage: build_srt.py <project> <voice_lang>
Reads build/timing_<voice_lang>.json. Subtitle languages come from project.json "subtitles".
The voice language itself is timed with Whisper word timestamps when faster-whisper is installed
(and the voice is the base language); every other language is split at punctuation and timed
proportionally to its length across the same VO span.
Writes out/<slug>-<voice>voice.<sub>.srt
"""
import json, os, re, subprocess, sys
import project as pj

P = pj.load(); VO = sys.argv[2]
BASE = P.get('base_lang', 'en')
timing = pj.jload(P, 'build', f'timing_{VO}.json')
beats = {b['id']: b for b in pj.jload(P, 'script', 'beats.json')['beats']}
TR = pj.jload(P, 'script', 'translations.json', default={})
spoken = P.get('spoken_url', {})
url = pj.brand(P)['url']
cache_p = pj.path(P, 'build', f'words_{VO}.json')
cache = json.load(open(cache_p)) if os.path.exists(cache_p) else {}


def text(bid, lang):
    t = beats[bid]['vo'] if lang == BASE else TR.get(bid, {}).get(lang, beats[bid]['vo'])
    return t.replace(spoken.get(lang, '\0'), url) if url else t


def words_of(bid):
    if bid in cache:
        return cache[bid]
    try:
        import numpy as np
        from faster_whisper import WhisperModel
    except ImportError:
        return None
    global _m
    try:
        _m
    except NameError:
        _m = WhisperModel('small', compute_type='int8')
    a = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'quiet', '-i', pj.path(P, 'tts', VO, f'{bid}.wav'), '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'],
                                     capture_output=True).stdout, np.float32)
    segs, _ = _m.transcribe(a, language=VO, word_timestamps=True)
    ws = [[w.start, w.end] for s in segs for w in s.words]
    cache[bid] = ws
    json.dump(cache, open(cache_p, 'w'))
    return ws


def chunk_latin(t, limit=80):
    """Captions of <= ~80 chars, preferring sentence ends, wrapped to 2 lines of <= 42."""
    caps, cur = [], []
    for w in t.split():
        if cur and len(' '.join(cur + [w])) > limit:
            caps.append(cur); cur = []
        cur.append(w)
        if w[-1] in '.?!' and len(' '.join(cur)) > 25:
            caps.append(cur); cur = []
    if cur:
        if caps and len(' '.join(cur)) < 12 and len(' '.join(caps[-1] + cur)) <= limit + 12:
            caps[-1] += cur
        else:
            caps.append(cur)
    out = []
    for c in caps:
        line = ' '.join(c)
        if len(line) > 42 and len(c) > 1:
            best = min(range(1, len(c)), key=lambda i: abs(len(' '.join(c[:i])) - len(line) / 2))
            line = ' '.join(c[:best]) + '\n' + ' '.join(c[best:])
        out.append(line)
    return out


def chunk_script(t, lang):
    if lang in ('zh', 'ja'):
        out = []
        for p in re.split(r'(?<=[。？！；])', t):
            p = p.strip()
            while len(p) > 30:
                cut = p.rfind('，', 0, 30); cut = cut + 1 if cut > 10 else 30
                out.append(p[:cut]); p = p[cut:]
            if p: out.append(p)
        return out
    if lang in ('km', 'th', 'lo', 'my'):   # sentence-final marks; long sentences break at spaces
        out = []
        for p in re.split(r'(?<=[។?!])\s*', t):
            p = p.strip()
            while len(p) > 70:
                cut = p.rfind(' ', 0, 70); cut = cut if cut > 20 else 70
                out.append(p[:cut].strip()); p = p[cut:].strip()
            if p: out.append(p)
        return out
    return chunk_latin(t)


def ts(t):
    t = max(0, t); h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60
    return f'{h:02d}:{m:02d}:{int(s):02d},{min(999, int(round((s - int(s)) * 1000))):03d}'


def proportional(entries, caps, start, end):
    total = sum(len(c) for c in caps) or 1; acc = 0; span = end - start
    for c in caps:
        a = start + span * acc / total; acc += len(c)
        entries.append([a, start + span * acc / total, c])


def write(lang):
    entries = []
    for v in timing['vo']:
        bid, start, end = v['id'], v['start'], v['end']
        caps = chunk_script(text(bid, lang), lang)
        ws = words_of(bid) if (lang == VO == BASE) else None
        if ws:
            n_script = sum(len(c.split()) for c in caps); idx = 0; prev = 0.0
            for c in caps:
                k = len(c.split())
                a = ws[min(len(ws) - 1, round(idx / n_script * len(ws)))][0]
                b = ws[min(len(ws) - 1, max(0, round((idx + k) / n_script * len(ws)) - 1))][1]
                a = max(a, prev); b = max(b, a + 0.8); prev = b
                entries.append([start + a, start + b + 0.15, c]); idx += k
        else:
            proportional(entries, caps, start, end)
    for i in range(len(entries) - 1):   # no overlaps, ~1 s minimum on screen
        entries[i][1] = min(max(entries[i][1], entries[i][0] + 1.0), entries[i + 1][0] - 0.04)
        if entries[i][1] <= entries[i][0]:
            entries[i][1] = entries[i][0] + 0.5
    for i in range(len(entries) - 1):
        if entries[i + 1][0] < entries[i][1] + 0.01:
            entries[i + 1][0] = entries[i][1] + 0.01
            entries[i + 1][1] = max(entries[i + 1][1], entries[i + 1][0] + 0.5)
    os.makedirs(pj.path(P, 'out'), exist_ok=True)
    p = pj.path(P, 'out', pj.out_name(P, f'{VO}voice') + f'.{lang}.srt')
    with open(p, 'w', encoding='utf-8') as f:
        for i, (a, b, c) in enumerate(entries, 1):
            f.write(f'{i}\n{ts(a)} --> {ts(b)}\n{c}\n\n')
    print(f'{lang}: {len(entries)} cues -> {os.path.basename(p)}')


subs = P.get('subtitles', [BASE])
for lang in [VO] + [s for s in subs if s != VO]:
    write(lang)
