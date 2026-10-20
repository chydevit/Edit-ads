"""Add burned-in captions (from an SRT) and SFX cues to a timeline.

usage: fx.py <project> <lang> [srt]      (default srt: out/<slug>-<lang>voice.<lang>.srt)
Run after build_srt.py. Cards get a whoosh, labels a pop, fast-forwards a swipe, clicks a click.
"""
import json, os, sys
import project as pj

P = pj.load(); LANG = sys.argv[2]
FPS = 30
tl_p = os.path.join(pj.path(P, 'build', 'public'), f'timeline_{LANG}.json')
srt_p = sys.argv[3] if len(sys.argv) > 3 else pj.path(P, 'out', pj.out_name(P, f'{LANG}voice') + f'.{LANG}.srt')
tl = json.load(open(tl_p))
sec = lambda x: int(x[:2]) * 3600 + int(x[3:5]) * 60 + int(x[6:8]) + int(x[9:]) / 1000
caps = []
for bl in open(srt_p, encoding='utf-8').read().strip().split('\n\n'):
    ln = bl.split('\n')
    a, b = ln[1].split(' --> ')
    caps.append({'start': round(sec(a) * FPS), 'end': round(sec(b) * FPS), 'text': '\n'.join(ln[2:])})
sfx = []
for sg in tl['segments']:
    st = sg['start']
    if sg['kind'] == 'card': sfx.append({'at': st, 'name': 'whoosh', 'vol': 0.32})
    elif sg['kind'] == 'faq': sfx.append({'at': st, 'name': 'whoosh_soft', 'vol': 0.28})
    elif sg['kind'] == 'end': sfx.append({'at': st + 4, 'name': 'ding', 'vol': 0.3})
    if sg.get('label'): sfx.append({'at': st + sg['label']['t0'], 'name': 'pop', 'vol': 0.22})
    if sg.get('badge'): sfx.append({'at': st, 'name': 'swipe', 'vol': 0.2})
    for p in sg.get('cursor', []):
        if p.get('click'): sfx.append({'at': st + p['t'] + 2, 'name': 'click', 'vol': 0.28})
sfx.sort(key=lambda x: x['at'])
dedup = []
for x in sfx:
    if dedup and x['at'] - dedup[-1]['at'] < 4:
        continue
    dedup.append(x)
tl['captions'], tl['sfx'] = caps, dedup
json.dump(tl, open(tl_p, 'w'))
print(f'{os.path.basename(tl_p)}: {len(caps)} captions, {len(dedup)} sfx')
