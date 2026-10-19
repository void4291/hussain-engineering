"""Swap the site's base URL everywhere (canonical, OG, JSON-LD, sitemap, robots).

Usage:  python scripts/set-base-url.py https://hussain-engineering.vercel.app https://newdomain.com
Run from the project root, then commit and redeploy.
"""
import sys, pathlib

if len(sys.argv) != 3:
    sys.exit(__doc__)
old, new = (u.rstrip('/') for u in sys.argv[1:])
files = [*pathlib.Path('.').glob('*.html'), pathlib.Path('robots.txt'), pathlib.Path('sitemap.xml')]
for f in files:
    text = f.read_text(encoding='utf-8')
    if old in text:
        f.write_text(text.replace(old, new), encoding='utf-8')
        print('updated', f)
