"""Rewrite script text into what the TTS should *say* (subtitles keep the original text).

Lexicon per language: <project>/script/lexicon_<lang>.json
  {"rules": [["\\bCLI\\b", "C L I"], ...],        regex replacements, applied first, in order
   "multi": {"Claude Code": "ក្លូដ កូដ", ...},      multi-word phrases (longest first, case-insensitive)
   "words": {"commit": "ខមមីត", ...}}             single Latin words (case-insensitive)
For Khmer, digits are also spelled out as Khmer number words and "1.5.9" becomes "មួយ ចុច ប្រាំ ចុច ប្រាំបួន".
Why: VoxCPM2 reads Latin words inside Khmer with an English accent or skips them; respelling them in
Khmer script makes the cloned Khmer voice say them the way Khmer developers do.

usage: phonetic.py <project> <lang>    -> prints the Latin words still left after respelling (fill the lexicon)
"""
import json, os, re, sys

ONES = ['សូន្យ', 'មួយ', 'ពីរ', 'បី', 'បួន', 'ប្រាំ', 'ប្រាំមួយ', 'ប្រាំពីរ', 'ប្រាំបី', 'ប្រាំបួន']
TENS = {1: 'ដប់', 2: 'ម្ភៃ', 3: 'សាមសិប', 4: 'សែសិប', 5: 'ហាសិប', 6: 'ហុកសិប', 7: 'ចិតសិប', 8: 'ប៉ែតសិប', 9: 'កៅសិប'}


def km_num(n):
    n = int(n)
    if n < 10: return ONES[n]
    if n < 100: return TENS[n // 10] + (ONES[n % 10] if n % 10 else '')
    if n < 1000: return ONES[n // 100] + 'រយ' + (km_num(n % 100) if n % 100 else '')
    if n < 10000: return ONES[n // 1000] + 'ពាន់' + (km_num(n % 1000) if n % 1000 else '')
    return str(n)


def load_lexicon(root, lang):
    p = os.path.join(root, 'script', f'lexicon_{lang}.json')
    return json.load(open(p, encoding='utf-8')) if os.path.exists(p) else {}


def speak(text, lang, lex):
    s = text
    for a, b in lex.get('rules', []):
        s = re.sub(a, b, s)
    multi = lex.get('multi', {})
    for k in sorted(multi, key=len, reverse=True):
        s = re.sub(re.escape(k), ' ' + multi[k] + ' ', s, flags=re.I)
    words = {k.lower(): v for k, v in lex.get('words', {}).items()}
    if words:
        s = re.sub(r"[A-Za-z][A-Za-z0-9]*", lambda m: words.get(m.group(0).lower(), m.group(0)), s)
    if lang == 'km':
        s = re.sub(r'(\d+)\.(\d+)\.(\d+)', lambda m: ' ចុច '.join(km_num(x) for x in m.groups()), s)
        s = re.sub(r'\d+', lambda m: km_num(m.group(0)), s)
        s = s.replace('&', ' និង ').replace('—', ', ')
    return re.sub(r'\s+', ' ', s).strip()


if __name__ == '__main__':
    sys.path.insert(0, os.path.dirname(__file__))
    import project as pj
    P = pj.load(); lang = sys.argv[2]
    lex = load_lexicon(P['_root'], lang)
    tr = pj.jload(P, 'script', 'translations.json', default={})
    beats = pj.jload(P, 'script', 'beats.json')['beats']
    texts = [b['vo'] for b in beats] if lang == P.get('base_lang', 'en') else [tr[b['id']][lang] for b in beats if b['id'] in tr]
    left = set()
    for t in texts:
        left |= set(re.findall(r'[A-Za-z]+', speak(t, lang, lex)))
    print('Latin words still in the spoken text:', ' '.join(sorted(left)) or '(none)')
