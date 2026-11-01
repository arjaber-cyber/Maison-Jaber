"""SEO safety check for the Hikaya site. Run from the repo root before pushing:

    python3 tools/seo/check.py

Fails (exit 1) on anything that would hurt search or break the brand rules:
  - invalid JSON-LD structured data in any page
  - Arabic translation strings that contain a full stop (brand rule: none)
  - sitemap.xml that is not valid XML
  - the SEO edge functions failing to load
  - a page listed in the SEO layer that has no file
Warnings (not failures) for Google titles over 62 characters or descriptions over 165.
"""
import glob, json, os, re, subprocess, sys
import xml.dom.minidom

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
os.chdir(ROOT)
errors, warnings = [], []

for f in sorted(glob.glob('hikaya/*.html') + ['index.html']):
    s = open(f, encoding='utf-8').read()
    for m in re.finditer(r'<script type="application/ld\+json"[^>]*>(.*?)</script>', s, re.S):
        try:
            json.loads(m.group(1))
        except Exception as e:
            errors.append(f'invalid JSON-LD in {f}: {e}')

try:
    xml.dom.minidom.parse('sitemap.xml')
except Exception as e:
    errors.append(f'sitemap.xml is not valid XML: {e}')

node = r'''
global.window = {}; global.document = { addEventListener() {}, documentElement: {}, createElement() { return { style: {} }; }, head: { appendChild() {} } };
for (const f of ['./home6-i18n.js', './pages-i18n.js', './gifts-i18n.js', './guides-i18n.js', './countries-i18n.js']) require(f);
const T = window.HIKAYA_TRANSLATIONS, bad = [];
for (const ns in T) for (const k in T[ns]) { const ar = T[ns][k] && T[ns][k].ar; if (typeof ar !== 'string') continue;
  const c = ar.replace(/<[^>]+>/g, '').replace(/\d\.\d/g, '').replace(/\.\.\./g, '').replace(/[A-Za-z0-9@_-]+\.(com|ae|html|net|org)/gi, '');
  if (/\./.test(c)) bad.push(ns + '.' + k); }
console.log(JSON.stringify(bad));
'''
r = subprocess.run(['node', '-e', node], capture_output=True, text=True)
if r.returncode:
    errors.append('translation files failed to load: ' + r.stderr[-300:])
else:
    for k in json.loads(r.stdout.strip().splitlines()[-1]):
        errors.append(f'Arabic full stop in translation {k}')

js = r'''
const m = await import(process.cwd() + '/netlify/edge-functions/hikaya-seo.js');
await import(process.cwd() + '/netlify/edge-functions/sitemap.js');
console.log(JSON.stringify(Object.entries(m.PAGES).map(([f, v]) => [f, v.en.title.length, v.en.desc.length])));
'''
r = subprocess.run(['node', '--input-type=module', '-e', js], capture_output=True, text=True)
if r.returncode:
    errors.append('SEO edge functions failed to load: ' + r.stderr[-300:])
else:
    for f, tl, dl in json.loads(r.stdout.strip().splitlines()[-1]):
        if not os.path.exists('hikaya/' + f):
            errors.append(f'SEO layer lists {f} but hikaya/{f} does not exist')
        if tl > 62: warnings.append(f'{f}: Google title is {tl} characters (aim for 60)')
        if dl > 165: warnings.append(f'{f}: description is {dl} characters (aim for 155)')

# Arabic headings / FAQ data served by the SEO layer must match the current page copy.
_ar = 'netlify/shared/ar-seo-data.js'
_before = open(_ar, encoding='utf-8').read() if os.path.exists(_ar) else ''
r = subprocess.run(['node', 'tools/seo/gen_ar_seo.js'], capture_output=True, text=True)
if r.returncode:
    errors.append('Arabic SEO data: ' + (r.stdout + r.stderr)[-400:])
elif open(_ar, encoding='utf-8').read() != _before:
    errors.append('ar-seo-data.js was out of date and has been regenerated; review and commit it')

for w in warnings: print('warning:', w)
for e in errors: print('ERROR:', e)
print('SEO check:', 'FAILED' if errors else 'passed', f'({len(errors)} errors, {len(warnings)} warnings)')
sys.exit(1 if errors else 0)
