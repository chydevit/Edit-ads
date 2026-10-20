"""Write the paperwork for one voice language from the final timing.

usage: make_docs.py <project> <lang>
  out/script-<lang>.md     narration by chapter with timecodes (+ translations)
  out/shot-list.md         every shot: chapter, scene/clip, on-screen action, placeholder slots to film
  out/youtube-<lang>.md    title, description with chapters, tags (from project.json "publish")
  out/posts-<lang>.md      ready-to-paste Facebook / TikTok / X captions (+ parts if split)
Chapter timecodes come from build/timing_<lang>.json, so re-run after every re-edit.
"""
import json, os, sys
import project as pj

P = pj.load(); LANG = sys.argv[2]; BASE = P.get('base_lang', 'en')
doc = pj.jload(P, 'script', 'beats.json')
timing = pj.jload(P, 'build', f'timing_{LANG}.json')
TR = pj.jload(P, 'script', 'translations.json', default={})
SLOTS = pj.jload(P, 'script', 'slots.json', default={})
UI = pj.lang_ui(P, LANG)
FPS = timing['fps']; vo = {v['id']: v for v in timing['vo']}
pub = P.get('publish', {}).get(LANG, {})
B = pj.brand(P)
od = pj.path(P, 'out'); os.makedirs(od, exist_ok=True)
tc = lambda s: f'{int(s) // 60}:{int(s) % 60:02d}'
ctitle = lambda t: UI['chapters'].get(t, t) if UI else t
chap_at = {c['id']: c['frame'] / FPS for c in timing['chapters']}

# script
L = [f"# {doc.get('title', B['name'])}: script ({LANG})\n", f"Length {tc(timing['frames'] / FPS)}.\n"]
for ch in doc['chapters']:
    L.append(f"\n## {tc(chap_at.get(ch['id'], 0))} {ctitle(ch['title'])}\n")
    for b in [b for b in doc['beats'] if b['ch'] == ch['id']]:
        at = tc(vo[b['id']]['start']) if b['id'] in vo else '–'
        L.append(f"**{at} · {b['id']} · {b.get('label', '')}**  \n{b['vo'] if LANG == BASE else TR.get(b['id'], {}).get(LANG, b['vo'])}\n")
        if LANG != BASE:
            L.append(f"> {b['vo']}\n")
open(os.path.join(od, f'script-{LANG}.md'), 'w', encoding='utf-8').write('\n'.join(L))

# shot list (language independent)
S = ['# Shot list\n', '| Beat | Chapter | Shot | What is on screen |', '|---|---|---|---|']
for b in doc['beats']:
    what = b.get('action', '')
    if b['shot'] in SLOTS:
        what = '**SLOT, film yourself:** ' + ' → '.join(SLOTS[b['shot']]['lines'])
    S.append(f"| {b['id']} | {b['ch']} | `{b['shot']}` | {what} |")
open(os.path.join(od, 'shot-list.md'), 'w', encoding='utf-8').write('\n'.join(S) + '\n')

# YouTube
chapters = '\n'.join(f"{tc(c['frame'] / FPS)} {ctitle(c['title'])}" for c in timing['chapters'])
Y = [f"# YouTube ({LANG})\n", '**Title**', '```', pub.get('title', doc.get('title', B['name'])), '```', '',
     '**Description**', '```', pub.get('description', '').strip(), '', pub.get('chapters_word', 'Chapters'), chapters, '',
     ' '.join(pub.get('hashtags', [])), '```', '', '**Tags**', '```', ', '.join(pub.get('tags', [])), '```']
subs = P.get('subtitles', [])
if subs:
    Y += ['', f"Upload the subtitle files `{pj.out_name(P, f'{LANG}voice')}.<lang>.srt` for: {', '.join(subs)}."]
open(os.path.join(od, f'youtube-{LANG}.md'), 'w', encoding='utf-8').write('\n'.join(Y) + '\n')

# posts
url = B['url']; tags = ' '.join(pub.get('hashtags', []))
Ps = [f"# Posts ({LANG})\n", 'Copy each block as is.\n']
for key, title in (('facebook', 'Facebook'), ('short', 'TikTok / Reels / Shorts'), ('x', 'X (Twitter)')):
    if pub.get(key):
        Ps += [f'## {title}', '```', pub[key].replace('{url}', url).replace('{tags}', tags).strip(), '```', '']
pp = pj.path(P, 'build', f'parts_{LANG}.json')
if os.path.exists(pp):
    parts = json.load(open(pp, encoding='utf-8'))
    word = (UI or {}).get('partWord', 'Part')
    Ps += [f'## Series: {len(parts)} parts', 'Upload in order; each part has its own subtitle files in `out/parts/`.\n']
    for p in parts:
        Ps += [f"**{word} {p['n']}/{p['of']}**: `{os.path.basename(p['file'])}`", '```',
               f"{B['name']} {word} {p['n']}/{p['of']}: {' · '.join(p['titles'])}", '```']
    if pub.get('part_caption'):
        Ps += ['', '**Caption for every part** (change the number)', '```', pub['part_caption'].replace('{url}', url).replace('{tags}', tags).strip(), '```']
open(os.path.join(od, f'posts-{LANG}.md'), 'w', encoding='utf-8').write('\n'.join(Ps) + '\n')
print(f'docs ({LANG}): script, shot-list, youtube, posts -> {od}')
