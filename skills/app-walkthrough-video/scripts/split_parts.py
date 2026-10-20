"""Cut a finished walkthrough into N parts at chapter boundaries, each with a title card and its own SRTs.

usage: split_parts.py <project> <voice_lang> [N=5] [video]
  video defaults to out/<slug>-<lang>voice-16x9.mp4 (from finish.sh)
Cut points are the chapter starts that make the parts as even as possible. Every part opens
with a 3 s card ("Part 2 / 5" + its chapter titles, rendered by the PartCard composition) and
gets every subtitle language, shifted to the part's own clock.
Writes out/parts/<slug>-<lang>-partXofN.mp4 + .<sub>.srt, and build/parts_<lang>.json (titles,
start/end) used by covers.py and the posts.
"""
import json, os, subprocess, sys
import project as pj

P = pj.load(); LANG = sys.argv[2]
N = int(sys.argv[3]) if len(sys.argv) > 3 else 5
video = sys.argv[4] if len(sys.argv) > 4 else pj.path(P, 'out', pj.out_name(P, f'{LANG}voice', '16x9') + '.mp4')
CARD = 3.0
timing = pj.jload(P, 'build', f'timing_{LANG}.json')
UI = pj.lang_ui(P, LANG)
fps = timing['fps']; total = pj.dur(video)
starts = [c['frame'] / fps for c in timing['chapters']]
titles = [(UI['chapters'].get(c['title'], c['title']) if UI else c['title']) for c in timing['chapters']]

# choose the N-1 chapter starts that make the parts most even (exhaustive: chapter counts are small)
import itertools
edges = starts + [total]
cuts = min(itertools.combinations(range(1, len(starts)), N - 1),
           key=lambda cs: sum((edges[b] - edges[a] - total / N) ** 2 for a, b in zip((0,) + cs, cs + (len(starts),))))
cuts = list(cuts)
bounds = [0] + cuts + [len(starts)]
parts = []
for p in range(N):
    a_i, b_i = bounds[p], bounds[p + 1]
    a = starts[a_i]; b = starts[b_i] if b_i < len(starts) else total
    parts.append({'n': p + 1, 'of': N, 'start': a, 'end': b, 'titles': titles[a_i:b_i]})

od = pj.path(P, 'out', 'parts'); os.makedirs(od, exist_ok=True)
tpl = os.path.join(pj.SKILL, 'template'); pub = pj.public(P)
srts = {}
for sub in P.get('subtitles', [LANG]):
    sp = pj.path(P, 'out', pj.out_name(P, f'{LANG}voice') + f'.{sub}.srt')
    if os.path.exists(sp):
        srts[sub] = sp
sec = lambda x: int(x[:2]) * 3600 + int(x[3:5]) * 60 + int(x[6:8]) + int(x[9:]) / 1000
def ts(t):
    t = max(0, t); h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60
    return f'{h:02d}:{m:02d}:{int(s):02d},{min(999, int(round((s - int(s)) * 1000))):03d}'

for part in parts:
    base = pj.out_name(P, LANG, f'part{part["n"]}of{N}')
    card = pj.path(P, 'build', f'card_{LANG}_{part["n"]}.png')
    props = json.dumps({'part': part['n'], 'of': N, 'titles': part['titles'], 'lang': LANG,
                        'word': (UI or {}).get('partWord', 'PART'), 'brand': pj.brand(P)}, ensure_ascii=False)
    subprocess.run(['npx', 'remotion', 'still', 'src/index.ts', 'PartCard', card, f'--props={props}', f'--public-dir={pub}', '--log=error'],
                   cwd=tpl, check=True)
    out = os.path.join(od, base + '.mp4')
    a, b = part['start'], part['end']
    subprocess.run(['ffmpeg', '-v', 'error', '-y',
                    '-loop', '1', '-t', str(CARD), '-framerate', '30', '-i', card,
                    '-f', 'lavfi', '-t', str(CARD), '-i', 'anullsrc=r=48000:cl=stereo',
                    '-ss', f'{a:.3f}', '-to', f'{b:.3f}', '-i', video,
                    '-filter_complex', '[0:v]scale=1920:1080,format=yuv420p,fade=t=out:st=2.6:d=0.4[c];[2:v]format=yuv420p,fade=t=in:st=0:d=0.3[m];'
                                       '[2:a]aresample=48000[ma];[c][1:a][m][ma]concat=n=2:v=1:a=1[v][a]',
                    '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-r', '30',
                    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out], check=True)
    for sub, sp in srts.items():
        cues = []
        for bl in open(sp, encoding='utf-8').read().strip().split('\n\n'):
            ln = bl.split('\n'); x, y = ln[1].split(' --> '); s0, s1 = sec(x), sec(y)
            if s1 > a and s0 < b:
                cues.append((max(s0, a) - a + CARD, min(s1, b) - a + CARD, '\n'.join(ln[2:])))
        with open(os.path.join(od, f'{base}.{sub}.srt'), 'w', encoding='utf-8') as f:
            for i, (s0, s1, t) in enumerate(cues, 1):
                f.write(f'{i}\n{ts(s0)} --> {ts(s1)}\n{t}\n\n')
    part['file'] = out; part['dur'] = pj.dur(out)
    print(f'part {part["n"]}/{N}: {part["dur"] / 60:.1f} min  {" · ".join(part["titles"])}')
json.dump(parts, open(pj.path(P, 'build', f'parts_{LANG}.json'), 'w'), ensure_ascii=False, indent=1)
