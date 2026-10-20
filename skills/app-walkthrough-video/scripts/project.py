"""Shared project loader for every Python step.

A project is a folder with project.json at its root (see references/project.md).
Pass it as the first CLI argument or via WALK_PROJECT.
"""
import json, os, shutil, subprocess, sys

SKILL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load(argv=None):
    argv = sys.argv if argv is None else argv
    root = argv[1] if len(argv) > 1 and not argv[1].startswith('-') else os.environ.get('WALK_PROJECT')
    if not root or not os.path.exists(os.path.join(root, 'project.json')):
        sys.exit('usage: <script> <project_dir> ...   (project_dir must contain project.json)')
    root = os.path.abspath(root)
    P = json.load(open(os.path.join(root, 'project.json')))
    P['_root'] = root
    return P


def path(P, *parts):
    return os.path.join(P['_root'], *parts)


def jload(P, *parts, default=None):
    p = path(P, *parts)
    if not os.path.exists(p):
        if default is not None:
            return default
        sys.exit(f'missing {p}')
    return json.load(open(p))


def dur(p):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p],
                         capture_output=True, text=True).stdout.strip()
    return float(out)


def place(src, dst):
    """Put a file into the Remotion public dir. Hardlink when possible (fast, no extra disk), else copy.
    Symlinks are not used: Remotion's bundler does not serve them."""
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    if os.path.exists(dst):
        if os.path.getmtime(dst) >= os.path.getmtime(src) and os.path.getsize(dst) == os.path.getsize(src):
            return
        os.remove(dst)
    try:
        os.link(src, dst)
    except OSError:
        shutil.copy2(src, dst)


def public(P):
    """build/public: the Remotion public dir for this project, seeded with fonts, sfx, music and the logo."""
    pub = path(P, 'build', 'public')
    tpl = os.path.join(SKILL, 'template', 'public')
    for sub in ('fonts', 'sfx', 'music'):
        for f in os.listdir(os.path.join(tpl, sub)):
            place(os.path.join(tpl, sub, f), os.path.join(pub, sub, f))
    logo = path(P, P.get('brand', {}).get('logo', 'logo.png'))
    if os.path.exists(logo):
        place(logo, os.path.join(pub, 'logo.png'))
    mus = P.get('music', {})
    for key in ('walkthrough', 'ad'):
        m = mus.get(key)
        if m and os.path.exists(path(P, m)):
            place(path(P, m), os.path.join(pub, 'music', os.path.basename(m)))
    return pub


def brand(P):
    b = P.get('brand', {})
    return {'name': b.get('name', P.get('name', 'App')), 'url': b.get('url', ''), 'tagline': b.get('tagline', ''),
            'accent': b.get('accent', ['#7c5cff', '#22d3ee'])}


def music_src(P, key):
    m = P.get('music', {}).get(key)
    if m:
        return 'music/' + os.path.basename(m)
    return 'music/bed.m4a' if key == 'walkthrough' else 'music/upbeat.m4a'


def lang_ui(P, lang):
    """ui_<lang>.json: chapter titles, label translations, FAQ, end-card words. English needs none."""
    if lang in (P.get('base_lang', 'en'), 'ad'):
        return None
    return jload(P, 'script', f'ui_{lang}.json')


def out_name(P, *bits):
    return '-'.join([P.get('slug', P.get('name', 'video'))] + [b for b in bits if b])
