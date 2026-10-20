"""Build the edit timelines for one voice language.

usage: build_timeline.py <project> <lang>

Reads script/beats.json, the recorded clips (clips/<scene>/clip.mp4 + events.json) and the
voice lines (tts/<lang>/<beat>.wav). Writes into build/public/:
  timeline_<lang>.json   16:9 walkthrough (Remotion composition "Walkthrough")
  vertical_<lang>.json   9:16 highlight cut ("Vertical")
and build/timing_<lang>.json (where each VO line and chapter landed; used for SRTs, docs, parts).

Each beat gets the footage of its shot (span between the recorder's `shot` marks), fitted to the
VO length: `speed` spans (waiting for an agent / a build) are fast-forwarded with a badge,
footage shorter than the VO freezes on its last frame, clicks/focus marks become zooms, a
spotlight and a synthetic cursor.
"""
import json, os, re, sys
import project as pj

P = pj.load()
LANG = sys.argv[2] if len(sys.argv) > 2 else P.get('base_lang', 'en')
BASE = P.get('base_lang', 'en')
FPS = 30
E = P.get('edit', {})
PUB = pj.public(P)
UI = pj.lang_ui(P, LANG)
L = (lambda t: UI.get('labels', {}).get(t, t)) if UI else (lambda t: t)
doc = pj.jload(P, 'script', 'beats.json')
beats, chapters = doc['beats'], doc['chapters']
SLOTS = pj.jload(P, 'script', 'slots.json', default={})
FAQ = (UI or {}).get('faq') or pj.jload(P, 'script', 'faq.json', default={})
TR = pj.jload(P, 'script', 'translations.json', default={})
VO_DIR = pj.path(P, 'tts', LANG)
CLIPS = pj.path(P, 'clips')
dur = pj.dur


def text_of(bid, lang=LANG):
    b = next(x for x in beats if x['id'] == bid)
    return b['vo'] if lang == BASE else TR.get(bid, {}).get(lang, b['vo'])


clips = {}
def clip(name):
    if name not in clips:
        d = os.path.join(CLIPS, name)
        clips[name] = {'events': json.load(open(f'{d}/events.json')), 'dur': dur(f'{d}/clip.mp4')}
        pj.place(f'{d}/clip.mp4', f'{PUB}/clips/{name}.mp4')
    return clips[name]


def span_by_marks(name, key, value, kind='shot'):
    """[t0,t1] between a mark and the next mark of the same kind."""
    c = clip(name)
    marks = [e for e in c['events'] if e['type'] == kind]
    for i, e in enumerate(marks):
        if e.get(key) == value:
            t1 = marks[i + 1]['t'] if i + 1 < len(marks) else c['dur']
            return e['t'], min(t1, c['dur'])
    raise KeyError(f'{name}: no {kind} {key}={value}')


# Website-tour shots are found by `label` marks: "site-tour:hero": ["site-tour", "Hero", null|"Last label"]
SITE = {k: tuple(v) for k, v in E.get('site_shots', {}).items()}
CONTINUE = E.get('continue', {})          # shot -> shot recorded after a restart, played back to back
WHOLE = set(E.get('whole_clips', []))     # clips used start to end
PORTRAIT = set(E.get('portrait_clips', []))
MONTAGE = [tuple(m) for m in E.get('montage', [])]   # [shot, offset_s, length_s] for the intro


def scene_of(shot):
    for name in sorted(os.listdir(CLIPS)):
        p = os.path.join(CLIPS, name, 'events.json')
        if os.path.exists(p) and any(e.get('type') == 'shot' and e.get('id') == shot for e in json.load(open(p))):
            return name
    return None


def locate(shot):
    if shot in WHOLE:
        return shot, 0.0, clip(shot)['dur']
    if shot in SITE:
        name, first, last = SITE[shot]
        t0, t1 = span_by_marks(name, 'text', first, 'label')
        if last:
            t1 = span_by_marks(name, 'text', last, 'label')[1]
        scrolls = [e['t'] for e in clip(name)['events'] if e['type'] == 'scroll' and e['t'] <= t0]
        if scrolls and t0 - scrolls[-1] < 3:     # include the scroll that leads into the section
            t0 = scrolls[-1]
        return name, t0, t1
    name = scene_of(shot)
    if not name:
        return None
    t0, t1 = span_by_marks(name, 'id', shot)
    acts = [e['t'] for e in clip(name)['events'] if e['type'] in ('click', 'type', 'key', 'focus') and t0 <= e['t'] < t1]
    if acts and acts[0] - t0 > 4:      # trim dead lead-in (e.g. optional clicks that timed out)
        t0 = acts[0] - 1.5
    return name, t0, t1


def fit(name, t0, t1, target):
    """Split [t0,t1] into normal/fast pieces: list of [src_t0, src_t1, rate, fast]."""
    ev = clip(name)['events']
    fast, open_at = [], None
    for e in ev:
        if e['type'] != 'speed':
            continue
        if e.get('from'):
            open_at = e['t']
        elif e.get('to') and open_at is not None:
            a, b = max(open_at, t0), min(e['t'], t1)
            if b - a > 1:
                fast.append((a, b))
            open_at = None
    pieces, cur = [], t0
    for a, b in fast:
        if a > cur:
            pieces.append([cur, a, 1.0, False])
        pieces.append([a, b, None, True])
        cur = b
    if cur < t1:
        pieces.append([cur, t1, 1.0, False])
    normal = sum(p[1] - p[0] for p in pieces if not p[3])
    for p in pieces:
        if p[3]:
            p[2] = max(4.0, (p[1] - p[0]) / max(2.5, min(8.0, (target - normal) if target > normal else 3.0)))
    out_len = sum((p[1] - p[0]) / p[2] for p in pieces)
    if out_len > target + 4:   # long silent stretches: gently speed normal footage (max 1.6x)
        k = min(1.6, normal / max(1.0, target - sum((p[1] - p[0]) / p[2] for p in pieces if p[3])))
        if k > 1.05:
            for p in pieces:
                if not p[3]:
                    p[2] = round(k, 3)
    return pieces


def build_clip_segs(name, pieces, start_f, label, target):
    ev = clip(name)['events']
    segs, f = [], start_f
    for (a, b, rate, is_fast) in pieces:
        n = max(1, round((b - a) / rate * FPS))
        seg = {'kind': 'clip', 'start': f, 'dur': n, 'src': f'clips/{name}.mp4', 'srcFrom': round(a, 3), 'rate': round(rate, 3)}
        if is_fast:
            seg['badge'] = f'{round(rate)}×'
        if name in PORTRAIT:
            seg['portrait'] = True
        to_f = lambda t: round((t - a) / rate * FPS)
        zooms, cur = [], []
        for e in ev:
            if e['type'] not in ('click', 'focus') or not (a <= e['t'] <= b) or 'box' not in e:
                continue
            bx, by, bw, bh = e['box']
            if bw * bh > 1920 * 1080 * 0.25:   # big regions: no zoom
                continue
            scale = 1.4 if bw < 500 and bh < 300 else 1.22
            cx, cy = bx + bw / 2, by + bh / 2
            t = to_f(e['t'])
            if e['type'] == 'click':
                cur.append({'t': max(0, t - 2), 'x': e['x'], 'y': e['y'], 'click': True})
                z = {'t0': max(0, t - 14), 't1': min(n, t + 40), 'cx': cx, 'cy': cy, 'scale': scale, 'box': [bx, by, bw, bh]}
            else:
                z = {'t0': max(0, t - 6), 't1': min(n, t + 60), 'cx': cx, 'cy': cy, 'scale': scale, 'box': [bx, by, bw, bh]}
            if zooms and z['t0'] < zooms[-1]['t1']:
                zooms[-1]['t1'] = max(zooms[-1]['t0'] + 12, z['t0'] + 6)   # hand over to the next target
            zooms.append(z)
        if zooms:
            seg['zooms'] = zooms
        if cur:
            path = [{'t': 0, 'x': cur[0]['x'] - 140, 'y': cur[0]['y'] + 90}]
            for p in cur:
                path.append({'t': max(path[-1]['t'] + 1, p['t'] - 12), 'x': path[-1]['x'], 'y': path[-1]['y']})
                path.append(p)
            seg['cursor'] = path
        segs.append(seg)
        f += n
    total = f - start_f
    if total < target * FPS:   # hold on the last frame
        last = pieces[-1]
        segs.append({'kind': 'clip', 'freeze': True, 'start': f, 'dur': round(target * FPS) - total, 'src': f'clips/{name}.mp4',
                     'srcFrom': round(max(0, last[1] - 0.05), 3), 'rate': 1})
        f = start_f + round(target * FPS)
    if label and segs:
        segs[0]['label'] = {'text': label, 't0': 8, 't1': min(segs[0]['dur'] - 2, 130)}
    return segs, f


def vo_wav(bid):
    return os.path.join(VO_DIR, f'{bid}.wav')


if __name__ == '__main__':
    segments, audio, duck, chapter_marks, vo_spans = [], [], [], [], []
    f = 0
    by_ch = {}
    for b in beats:
        by_ch.setdefault(b['ch'], []).append(b)
    for ci, ch in enumerate(chapters):
        chapter_marks.append({'id': ch['id'], 'title': ch['title'], 'frame': f})
        if ci > 0:   # no card before the intro
            n = int(E.get('chapter_card_secs', 2.4) * FPS)
            segments.append({'kind': 'card', 'start': f, 'dur': n, 'chapter': f'{ci + 1:02d}',
                             'title': UI['chapters'].get(ch['title'], ch['title']) if UI else ch['title'],
                             'word': UI.get('chapterWord', 'CHAPTER') if UI else 'CHAPTER'})
            f += n
        for bi, b in enumerate(by_ch.get(ch['id'], [])):
            wav = vo_wav(b['id'])
            have = os.path.exists(wav)
            v = dur(wav) if have else len(text_of(b['id']).split()) / 2.5
            if have:
                pj.place(wav, f'{PUB}/vo_{LANG}/{b["id"]}.wav')
            target = v + 0.9
            start = f
            shot = b['shot']
            if b.get('slot') or shot in SLOTS:
                n = round(max(target, 5) * FPS)
                sl = SLOTS.get(shot, {'title': b['label'], 'lines': []})
                segments.append({'kind': 'slot', 'start': f, 'dur': n, 'title': sl['title'], 'lines': sl['lines'],
                                 'label': {'text': L(b['label']), 't0': 8, 't1': min(n - 2, 130)}})
                f += n
            elif shot == 'faq-card':
                n = round(max(target, 3.2) * FPS)
                q = FAQ[b['id']]
                segments.append({'kind': 'faq', 'start': f, 'dur': n, 'q': q['q'], 'a': q['a']})
                f += n
            elif shot == 'end-card':
                n = round(max(target + 1.5, 6.5) * FPS)
                segments.append({'kind': 'end', 'start': f, 'dur': n, 'title': UI.get('endDownload', 'Download at') if UI else 'Download at'})
                f += n
            elif shot == 'intro-montage' and MONTAGE:
                half = len(MONTAGE) // 2
                mine = MONTAGE[:half] if bi == 0 else MONTAGE[half:]
                per = target / max(1, len(mine))
                for sh, off, ln in mine:
                    loc = locate(sh)
                    if not loc:
                        continue
                    name, t0, t1 = loc
                    a = min(t0 + off, max(t0, t1 - ln))
                    segs, f = build_clip_segs(name, [[a, min(t1, a + ln), ln / per, False]], f, L(b['label']) if sh == mine[0][0] else None, per)
                    segments.extend(segs)
            else:
                loc = locate(shot)
                if not loc:
                    print('MISSING shot', shot, file=sys.stderr)
                    n = round(target * FPS)
                    segments.append({'kind': 'slot', 'start': f, 'dur': n, 'title': f'Missing: {shot}', 'lines': []})
                    f += n
                else:
                    name, t0, t1 = loc
                    cont = CONTINUE.get(shot)
                    if cont and locate(cont):
                        n2, a2, b2 = locate(cont)
                        share = (t1 - t0) / ((t1 - t0) + (b2 - a2))
                        segs, f = build_clip_segs(name, fit(name, t0, t1, target * share), f, L(b['label']), target * share)
                        segments.extend(segs)
                        segs, f = build_clip_segs(n2, fit(n2, a2, b2, target * (1 - share)), f, None, target * (1 - share))
                        segments.extend(segs)
                    else:
                        segs, f = build_clip_segs(name, fit(name, t0, t1, target), f, L(b['label']), target)
                        segments.extend(segs)
            if have:
                vs = start + int(0.35 * FPS)
                audio.append({'src': f'vo_{LANG}/{b["id"]}.wav', 'start': vs})
                duck.append([vs, vs + round(v * FPS)])
                vo_spans.append({'id': b['id'], 'start': vs / FPS, 'end': vs / FPS + v})

    segments = [sg for sg in segments if sg['dur'] > 0]
    tl = {'durationFrames': f, 'segments': segments, 'audio': audio, 'brand': pj.brand(P),
          'music': {'src': pj.music_src(P, 'walkthrough'), 'volume': E.get('music_volume', 0.55), 'duck': duck}}
    json.dump(tl, open(f'{PUB}/timeline_{LANG}.json', 'w'))
    os.makedirs(pj.path(P, 'build'), exist_ok=True)
    json.dump({'chapters': chapter_marks, 'vo': vo_spans, 'fps': FPS, 'frames': f, 'lang': LANG},
              open(pj.path(P, 'build', f'timing_{LANG}.json'), 'w'), indent=1)
    print(f'{LANG}: frames={f} ({f / FPS / 60:.2f} min), segments={len(segments)}, vo={len(audio)}')
    for c in chapter_marks:
        s = c['frame'] // FPS
        print(f'  {s // 60}:{s % 60:02d} {c["title"]}')

    # ---- 9:16 highlight cut ----
    VERT = E.get('vertical', [])
    if VERT:
        bmap = {b['id']: b for b in beats}
        vsegs, vaudio, vduck, vcaps, vtitles = [], [], [], [], []
        vf = 0
        for item in VERT:
            if LANG in item.get('skip', []):
                continue
            bid = item['beat']; b = bmap[bid]; wav = vo_wav(bid)
            if not os.path.exists(wav):
                continue
            v = dur(wav); target = v + 0.5
            vtitles.append({'start': vf, 'text': item['title'].get(LANG, item['title'].get(BASE, ''))})
            shot = item.get('shot') or b['shot']
            if shot in ('intro-montage', 'end-card', 'faq-card'):
                shot = item.get('fallback_shot', MONTAGE[0][0] if MONTAGE else shot)
            loc = locate(shot)
            if loc:
                name, t0, t1 = loc
                segs, _ = build_clip_segs(name, fit(name, t0, t1, target), vf, None, target)
                cut = vf + round(target * FPS)
                for sg in segs:   # keep the highlight tight: trim to the VO length
                    if sg['start'] >= cut:
                        break
                    sg['dur'] = min(sg['dur'], cut - sg['start'])
                    vsegs.append(sg)
            vs = vf + 6
            pj.place(wav, f'{PUB}/vo_{LANG}/{bid}.wav')
            vaudio.append({'src': f'vo_{LANG}/{bid}.wav', 'start': vs}); vduck.append([vs, vs + round(v * FPS)])
            # short caption chunks timed by character share
            text = text_of(bid).replace(P.get('spoken_url', {}).get(LANG, '\0'), pj.brand(P)['url'])
            if LANG == BASE:
                words = text.split(); chunks = [' '.join(words[i:i + 5]) for i in range(0, len(words), 5)]
            else:
                chunks = []
                for part in [p.strip() for p in re.split(r'(?<=[។?!。？！])\s*', text) if p.strip()]:
                    while len(part) > 34:
                        c = part.rfind(' ', 0, 34); c = c if c > 10 else 34
                        chunks.append(part[:c].strip()); part = part[c:].strip()
                    if part:
                        chunks.append(part)
            tot = sum(len(c) for c in chunks) or 1; acc = 0
            for c in chunks:
                a0 = vs + round(v * acc / tot * FPS); acc += len(c)
                vcaps.append({'start': a0, 'end': vs + round(v * acc / tot * FPS), 'text': c})
            vf += round(target * FPS)
        vsegs = [sg for sg in vsegs if sg['dur'] > 0]
        vsfx = [{'at': t['start'], 'name': 'whoosh', 'vol': 0.3} for t in vtitles]
        for sg in vsegs:
            for p in sg.get('cursor', []):
                if p.get('click'):
                    vsfx.append({'at': sg['start'] + p['t'] + 2, 'name': 'click', 'vol': 0.28})
        json.dump({'durationFrames': vf, 'segments': vsegs, 'audio': vaudio, 'captions': vcaps, 'titles': vtitles, 'brand': pj.brand(P),
                   'sfx': sorted(vsfx, key=lambda x: x['at']), 'music': {'src': pj.music_src(P, 'walkthrough'), 'volume': 0.5, 'duck': vduck}},
                  open(f'{PUB}/vertical_{LANG}.json', 'w'))
        print(f'  vertical: {vf / FPS:.1f}s')
