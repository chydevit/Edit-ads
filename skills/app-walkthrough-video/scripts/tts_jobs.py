"""Write a VoxCPM2 job file for every VO line of one language.

usage: tts_jobs.py <project> <lang> [--ad]
  walkthrough: lines from script/beats.json (base language) or script/translations.json (others)
  --ad:        lines from script/ad.json  ({"beats": [{"id", "<lang>": text, ...}]})
Output: build/tts_<lang>[_ad].json; audio goes to tts/<lang>/ (or tts_ad/<lang>/).

Voice per language from project.json "voice":
  {"km": {"ref_wav": "voice/km_ref.wav", "ref_text": "exact words spoken in the reference"},
   "en": {"design": "A calm, clear, warm adult narrator, neutral accent, studio quality",
          "sample_text": "One or two sentences in the style of the script."}}
A reference recording (8–20 s, clean, one speaker) clones that voice; ref_text must match it word for
word. "design" creates a voice from a description once (voice/<lang>_designed.wav), then every line
clones it so the narrator stays the same across all lines.
Existing wavs are skipped, so delete a line's wav to regenerate just that line.
"""
import json, os, sys
import project as pj
from phonetic import load_lexicon, speak

P = pj.load(); lang = sys.argv[2]; AD = '--ad' in sys.argv
BASE = P.get('base_lang', 'en')
V = P.get('voice', {}).get(lang)
if not V:
    sys.exit(f'project.json has no voice.{lang}')
lex = load_lexicon(P['_root'], lang)
out_dir = pj.path(P, 'tts_ad' if AD else 'tts', lang)
job = {'voices': [], 'lines': []}
if V.get('ref_wav'):
    ref_wav, ref_text = pj.path(P, V['ref_wav']), V.get('ref_text', '')
    if not os.path.exists(ref_wav):
        sys.exit(f'missing voice reference {ref_wav}')
else:
    ref_wav, ref_text = pj.path(P, 'voice', f'{lang}_designed.wav'), V['sample_text']
    job['voices'].append({'voice_id': lang, 'design': V['design'], 'sample_text': speak(V['sample_text'], lang, lex),
                          'out_wav': ref_wav, 'seed': V.get('voice_seed', 11)})
if AD:
    items = [(b['id'], b[lang]) for b in pj.jload(P, 'script', 'ad.json')['beats']]
else:
    beats = pj.jload(P, 'script', 'beats.json')['beats']
    tr = pj.jload(P, 'script', 'translations.json', default={})
    items = [(b['id'], b['vo'] if lang == BASE else tr[b['id']][lang]) for b in beats if b.get('vo')]
for bid, text in items:
    job['lines'].append({'id': bid, 'text': speak(text, lang, lex), 'ref_wav': ref_wav, 'ref_text': speak(ref_text, lang, lex),
                         'out_wav': os.path.join(out_dir, f'{bid}.wav'), 'seed': V.get('seed', 7),
                         'cfg': V.get('cfg', 2.0), 'steps': V.get('steps', 10), 'clone_mode': V.get('clone_mode', 'both')})
os.makedirs(pj.path(P, 'build'), exist_ok=True)
jp = pj.path(P, 'build', f'tts_{lang}{"_ad" if AD else ""}.json')
json.dump(job, open(jp, 'w'), ensure_ascii=False, indent=1)
todo = sum(1 for l in job['lines'] if not os.path.exists(l['out_wav']))
print(f'{jp}: {len(job["lines"])} lines ({todo} to generate)')
