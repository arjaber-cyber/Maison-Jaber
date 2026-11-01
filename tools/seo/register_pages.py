"""Register new public Hikaya pages everywhere search engines need them.

Usage (from the repo root):
    python3 tools/seo/register_pages.py tools/seo/guide_seo.json [priority] [changefreq] [--update]
    (--update also rewrites the title/description of pages that are already registered)

The JSON maps file name -> {"en": [title, description], "ar": [title, description]}
(gen_guides.py / gen_countries.py write it). For every file NOT yet registered it adds:
  - netlify/edge-functions/hikaya-seo.js: PAGES entry (Google title/description, EN + AR) and its path
  - netlify/edge-functions/sitemap.js: live sitemap entry (EN + AR with hreflang)
  - sitemap.xml: fallback sitemap entry
  - pages-i18n.js: T.ttl titles used when a visitor switches language in the page
Files already registered are left alone, so it is safe to run again.
Arabic copy must carry no full stops (brand rule).
"""
import json, os, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
import re
args = [a for a in sys.argv[1:] if a != '--update']
UPDATE = '--update' in sys.argv  # also rewrite titles/descriptions of pages already registered
seo = json.load(open(args[0], encoding='utf-8'))
prio = args[1] if len(args) > 1 else '0.7'
freq = args[2] if len(args) > 2 else 'monthly'
J = lambda v: json.dumps(v, ensure_ascii=False)

def edit(rel, fn):
    p = os.path.join(ROOT, rel); s = open(p, encoding='utf-8').read(); n = fn(s)
    if n != s: open(p, 'w', encoding='utf-8').write(n)

added = []
for f, v in seo.items():
    edge = open(os.path.join(ROOT, 'netlify/edge-functions/hikaya-seo.js'), encoding='utf-8').read()
    if f'"/hikaya/{f}"' in edge:
        if UPDATE:
            def upd(s, f=f, v=v):
                for l in ('en', 'ar'):
                    m = re.search(re.escape(J(f)) + r': \{.*?' + l + r': \{\s*title: (".*?"),\s*desc: (".*?"),?\s*\}', s, re.S)
                    if m:
                        seg = m.group(0).replace(m.group(1), J(v[l][0]), 1).replace(m.group(2), J(v[l][1]), 1)
                        s = s[:m.start()] + seg + s[m.end():]
                return s
            edit('netlify/edge-functions/hikaya-seo.js', upd)
            key = f[:-5].replace('-', '_')
            edit('pages-i18n.js', lambda s, key=key, v=v: re.sub(r'(\n    ' + key + r': \{ en: )(".*?"|\'.*?\'), ar: (".*?"|\'.*?\')', lambda mm: mm.group(1) + J(v['en'][0]) + ', ar: ' + J(v['ar'][0]), s, count=1))
            added.append(f + ' (updated)')
        continue
    page = (f'  {J(f)}: {{\n    en: {{ title: {J(v["en"][0])}, desc: {J(v["en"][1])} }},\n'
            f'    ar: {{ title: {J(v["ar"][0])}, desc: {J(v["ar"][1])} }},\n  }},\n')
    edit('netlify/edge-functions/hikaya-seo.js', lambda s: s.replace('  // END PAGES', page + '  // END PAGES', 1)
         .replace('    // PATHS (tools/seo/register_pages.py adds new pages below this line)\n',
                  f'    // PATHS (tools/seo/register_pages.py adds new pages below this line)\n    "/hikaya/{f}",\n', 1))
    edit('netlify/edge-functions/sitemap.js', lambda s: s.replace('  // END STATIC_PAGES', f'  ["{f}", "{prio}", "{freq}"],\n  // END STATIC_PAGES', 1))
    edit('sitemap.xml', lambda s: s if f'/hikaya/{f}<' in s else s.replace('</urlset>', f'  <url><loc>https://maison-jaber.com/hikaya/{f}</loc></url>\n</urlset>', 1))
    key = f[:-5].replace('-', '_')
    edit('pages-i18n.js', lambda s: s if f'\n    {key}: {{' in s else s.replace("    '404': { en: 'Page not found | Hikaya'",
         f"    {key}: {{ en: {J(v['en'][0])}, ar: {J(v['ar'][0])} }},\n    '404': {{ en: 'Page not found | Hikaya'", 1))
    added.append(f)
print('registered:', added or 'nothing new')
