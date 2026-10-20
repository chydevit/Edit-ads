"""Thumbnail, 9:16 cover and part covers for one voice language (PNG, via Remotion stills).

usage: covers.py <project> <lang>
project.json "covers": {"<lang>": {
   "thumb":    {"shot": "agents-grid", "offset": 4, "lines": ["EVERY", "FEATURE"], "sub": "Start → finish", "badge": "v1.5.9"},
   "vertical": {"shot": "agents-diff", "lines": ["ONE APP FOR", "ALL YOUR AGENTS"], "sub": "Claude · Codex · Gemini\\n{url}"},
   "parts":    [["DOWNLOAD &", "INSTALL", "Website tour · Windows · macOS"], ...]}}     # one per part, optional
The screenshot is a frame of a recorded shot ("shot" id from beats.json, "offset" seconds into it, default 3),
taken from the raw clip so no captions or labels are on it. Pick a shot that shows the product doing
something. Part covers use the middle app shot of each part automatically.
Writes out/covers/<slug>-<lang>-{thumbnail,vertical-cover,partXofN-cover}.png
"""
import json, os, subprocess, sys
import project as pj

P = pj.load(); LANG = sys.argv[2]
C = P.get('covers', {}).get(LANG, {})
B = pj.brand(P)
video = pj.path(P, 'out', pj.out_name(P, f'{LANG}voice', '16x9') + '.mp4')
pub = pj.public(P); tpl = os.path.join(pj.SKILL, 'template')
od = pj.path(P, 'out', 'covers'); os.makedirs(od, exist_ok=True); os.makedirs(f'{pub}/covers', exist_ok=True)


def shot_time(shot):
    for name in sorted(os.listdir(pj.path(P, 'clips'))):
        ev = pj.path(P, 'clips', name, 'events.json')
        if os.path.exists(ev):
            for e in json.load(open(ev)):
                if e.get('type') == 'shot' and e.get('id') == shot:
                    return pj.path(P, 'clips', name, 'clip.mp4'), e['t']
    return None


def frame(spec, key):
    """spec: {"shot": id, "offset": s} -> frame of the raw clip; or {"at": s} -> frame of the finished video."""
    p = f'{pub}/covers/{LANG}_{key}.png'
    hit = shot_time(spec['shot']) if spec.get('shot') else None
    src, t = (hit[0], hit[1] + spec.get('offset', 3)) if hit else (video, spec.get('at', 60))
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{t:.2f}', '-i', src, '-frames:v', '1', '-vf', 'scale=1920:1080', p], check=True)
    return f'covers/{LANG}_{key}.png'


def part_shot(part):
    """The app shot of the beat whose voice line sits in the middle of the part."""
    timing = pj.jload(P, 'build', f'timing_{LANG}.json')
    beats = {b['id']: b for b in pj.jload(P, 'script', 'beats.json')['beats']}
    inside = [v for v in timing['vo'] if part['start'] <= v['start'] < part['end']]
    inside.sort(key=lambda v: abs((v['start'] + v['end']) / 2 - (part['start'] + part['end']) / 2))
    for v in inside:
        s = beats[v['id']]['shot']
        if shot_time(s):
            return {'shot': s, 'offset': 3}
    return {'at': part['start'] + (part['end'] - part['start']) * 0.4}


def still(comp, props, out):
    props = {**props, 'brand': B, 'lang': LANG}
    if 'sub' in props and props['sub']:
        props['sub'] = props['sub'].replace('{url}', B['url'])
    subprocess.run(['npx', 'remotion', 'still', 'src/index.ts', comp, out, f'--props={json.dumps(props, ensure_ascii=False)}',
                    f'--public-dir={pub}', '--log=error'], cwd=tpl, check=True)
    print('cover:', os.path.relpath(out, P['_root']))


if 'thumb' in C:
    t = C['thumb']
    still('Cover', {'img': frame(t, 'thumb'), 'lines': t['lines'], 'sub': t.get('sub'), 'badge': t.get('badge')},
          os.path.join(od, pj.out_name(P, LANG, 'thumbnail') + '.png'))
if 'vertical' in C:
    t = C['vertical']
    still('VerticalCover', {'img': frame(t, 'vertical'), 'lines': t['lines'], 'sub': t.get('sub')},
          os.path.join(od, pj.out_name(P, LANG, 'vertical-cover') + '.png'))
pp = pj.path(P, 'build', f'parts_{LANG}.json')
if C.get('parts') and os.path.exists(pp):
    parts = json.load(open(pp, encoding='utf-8'))
    word = (pj.lang_ui(P, LANG) or {}).get('partWord', 'PART')
    for p, spec in zip(parts, C['parts']):
        img = frame(part_shot(p), f'part{p["n"]}')
        still('Cover', {'img': img, 'lines': spec[:2], 'sub': spec[2] if len(spec) > 2 else None, 'badge': f'{word} {p["n"]} / {p["of"]}'},
              os.path.join(od, pj.out_name(P, LANG, f'part{p["n"]}of{p["of"]}', 'cover') + '.png'))
