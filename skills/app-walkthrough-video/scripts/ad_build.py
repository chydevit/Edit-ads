"""Build an ad timeline (default 2:00) per language from script/ad.json and the recorded clips.

usage: ad_build.py <project> [seconds]
ad.json: {"beats": [{"id": "a01", "shots": ["agents-grid"], "head": {"en": "...", "km": "..."}, "en": "...", "km": "..."},
                    {"id": "a02", "shots": ["BRAND"], ...}, ..., {"id": "a14", "shots": ["CTA"], ...}]}
Voice: tts_ad/<lang>/<id>.wav (voice.sh <project> <lang> --ad). Each beat's footage is cut to its VO
plus an even gap so the whole ad lands on the target length; ads never slow footage (>= 1.25x).
"""
import json, os, re, sys
sys.argv = [sys.argv[0], sys.argv[1], 'ad'] + sys.argv[2:]
import build_timeline as bt
import project as pj

P = bt.P; FPS = bt.FPS; PUB = bt.PUB
TARGET = float(sys.argv[3]) if len(sys.argv) > 3 else float(P.get('ad', {}).get('seconds', 120))
AD = pj.jload(P, 'script', 'ad.json')['beats']
B = pj.brand(P)
UIW = P.get('ad', {}).get('cta', {})


def chunks(text, lang):
    if re.search(r'[A-Za-z]', text[:12]) and lang in ('en', 'fr', 'es', 'de', 'pt', 'id', 'vi'):
        out, cur = [], []
        for x in text.split():
            cur.append(x)
            if len(' '.join(cur)) > 34 or x[-1] in '.?!':
                out.append(' '.join(cur)); cur = []
        if cur: out.append(' '.join(cur))
        return out
    out = []
    for p in [p.strip() for p in re.split(r'(?<=[។?!。？！])\s*', text) if p.strip()]:
        while len(p) > 36:
            c = p.rfind(' ', 0, 36); c = c if c > 10 else 36
            out.append(p[:c].strip()); p = p[c:].strip()
        if p: out.append(p)
    return out


for lang in P.get('ad', {}).get('langs', P.get('langs', ['en'])):
    segs, audio, duck, caps, sfx = [], [], [], [], []
    f = 0
    vdir = pj.path(P, 'tts_ad', lang)
    if not os.path.isdir(vdir):
        print(f'{lang}: no ad voice yet (voice.sh <project> {lang} --ad)'); continue
    vs_ = [pj.dur(os.path.join(vdir, f'{b["id"]}.wav')) for b in AD]
    fixed = sum(max(v + 1.2, 2.8) if b['shots'] == ['BRAND'] else (v + 3.0 if b['shots'] == ['CTA'] else v) for v, b in zip(vs_, AD))
    nreg = sum(1 for b in AD if b['shots'] not in (['BRAND'], ['CTA']))
    GAP = min(3.6, max(0.6, (TARGET - fixed) / max(1, nreg)))
    for b, v in zip(AD, vs_):
        wav = os.path.join(vdir, f'{b["id"]}.wav'); pj.place(wav, f'{PUB}/advo_{lang}/{b["id"]}.wav')
        start = f
        if b['shots'] == ['BRAND']:
            n = round(max(v + 1.2, 2.8) * FPS)
            segs.append({'kind': 'brand', 'start': f, 'dur': n, 'title': B['tagline']})
            sfx.append({'at': f, 'name': 'impact', 'vol': 0.45}); f += n
        elif b['shots'] == ['CTA']:
            n = round((v + 3.0) * FPS)
            segs.append({'kind': 'end', 'start': f, 'dur': n, 'title': UIW.get(lang, 'Download now at')})
            sfx.append({'at': f + 6, 'name': 'ding', 'vol': 0.35}); f += n
        else:
            target = v + GAP; share = target / len(b['shots'])
            for si, shot in enumerate(b['shots']):
                loc = bt.locate(shot)
                if not loc:
                    print('MISSING shot', shot); continue
                name, t0, t1 = loc
                acts = [e['t'] for e in bt.clip(name)['events'] if e['type'] in ('click', 'type', 'focus') and t0 <= e['t'] < t1]
                if acts: t0 = max(t0, acts[0] - 0.8)
                pieces = bt.fit(name, t0, t1, share)
                for p in pieces:
                    if not p[3]: p[2] = max(p[2], 1.25)
                ss, _ = bt.build_clip_segs(name, pieces, f, None, share)
                cut = f + round(share * FPS); keep = []
                for sg in ss:
                    if sg['start'] >= cut: break
                    sg['dur'] = min(sg['dur'], cut - sg['start']); sg.pop('badge', None); keep.append(sg)
                if si == 0 and keep and b.get('head'):
                    keep[0]['head'] = {'text': b['head'][lang], 't0': 3, 't1': min(keep[0]['dur'] - 2, 105)}
                for sg in keep:
                    for p in sg.get('cursor', []):
                        if p.get('click'): sfx.append({'at': sg['start'] + p['t'] + 2, 'name': 'click', 'vol': 0.25})
                segs.extend(keep); f = cut
            sfx.append({'at': start, 'name': 'whoosh', 'vol': 0.3})
        vs = start + 8
        audio.append({'src': f'advo_{lang}/{b["id"]}.wav', 'start': vs}); duck.append([vs, vs + round(v * FPS)])
        text = b[lang].replace(P.get('spoken_url', {}).get(lang, '\0'), B['url'])
        cs = chunks(text, lang); tot = sum(len(c) for c in cs) or 1; acc = 0
        for c in cs:
            a = vs + round(v * acc / tot * FPS); acc += len(c)
            caps.append({'start': a, 'end': vs + round(v * acc / tot * FPS), 'text': c})
    segs = [s for s in segs if s['dur'] > 0]
    json.dump({'durationFrames': f, 'segments': segs, 'audio': audio, 'captions': caps, 'sfx': sorted(sfx, key=lambda x: x['at']), 'brand': B,
               'music': {'src': pj.music_src(P, 'ad'), 'volume': 0.9, 'duck': duck}}, open(f'{PUB}/ad_{lang}.json', 'w'))
    print(f'ad {lang}: {f / FPS:.1f}s, {len(segs)} segments, gap {GAP:.2f}s/beat')
