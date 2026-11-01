import json, html, re, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from guides_content import GUIDES
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
SITE = 'https://maison-jaber.com/hikaya/'
DATE = '2026-11-01'
e = lambda s: html.escape(s, quote=True)
T = {}
def k(name, en, ar):
    T[name] = {'en': en, 'ar': ar}
    return 'gdg.' + name

COMMON = dict(crumb_home=('Home', 'الرئيسية'), crumb=('Gift guides', 'أدلة الهدايا'), date=('1 November 2026', '1 نوفمبر 2026'),
              mins=('{n} min read', '{n} دقائق قراءة'), cta_t=('Make them the hero of their own story', 'اجعل طفلك بطل قصته'),
              cta_d=('A personalised hardcover storybook with their name and face, gift-boxed and delivered across the UAE and GCC.', 'كتاب قصة مخصص بغلاف مقوّى باسمه وملامحه، في علبة هدية مع التوصيل في الإمارات ودول الخليج'),
              cta_gift=('See the gift ideas', 'شاهد أفكار الهدايا'), more=('More guides', 'أدلة أخرى'), read=('Read the guide', 'اقرأ الدليل'),
              idx_title=('Gift guides and tips for parents', 'أدلة الهدايا ونصائح للأهل'),
              idx_lede=('Ideas for birthdays, Eid and big childhood moments, from the Hikaya by Maison Jaber team.', 'أفكار لأعياد الميلاد والعيد ولحظات الطفولة الكبيرة، من فريق حكاية من ميزون جابر'))
for n, (en, ar) in COMMON.items(): k(n, en, ar)

head_tpl = open(ROOT + '/hikaya/our-world.html', encoding='utf-8').read().split('<link rel="canonical"')[0]
FONTS = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Manrope:wght@400;500;600;700&family=Caveat:wght@500;600&family=Amiri:wght@400;700&display=swap'
assets = f'''<link rel="icon" type="image/png" href="images/favicon-star.png" />
<link rel="apple-touch-icon" href="images/apple-touch-icon.png" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<!-- Fonts load without blocking the first paint. -->
<link href="{FONTS}" rel="stylesheet" media="print" onload="this.media='all'" />
<noscript><link href="{FONTS}" rel="stylesheet" /></noscript>
<link rel="stylesheet" href="hikaya.css" />'''
scripts = '\n'.join(f'<script src="{s}" defer></script>' for s in ['/i18n.js', '/home6-i18n.js', '/pages-i18n.js', '/guides-i18n.js', '/site-photos.js', '/consent.js', '/analytics.js', '/region.js', '/cart.js', 'chrome.js'])
foot_html = f'''</main>
<div id="hk-foot"></div>
{scripts}
</body>
</html>
'''

def head(url, title, desc, img, ld):
    return head_tpl + f'''<link rel="canonical" href="{url}" />
<meta property="og:url" content="{url}" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="Hikaya by Maison Jaber" />
<meta property="og:image" content="{SITE}images/{img}.webp" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}" />
<meta property="og:title" content="{e(title)}" />
<meta property="og:description" content="{e(desc)}" />
{assets}
''' + ''.join(f'<script type="application/ld+json">{json.dumps(o, ensure_ascii=False)}</script>\n' for o in ld) + '</head>'

seo = {}
for G in GUIDES:
    key, file = G['key'], G['file']
    k(key + '_title', *G['title']); k(key + '_intro', *G['intro']); k(key + '_desc', *G['desc'])
    for i, (he, ha, be, ba) in enumerate(G['sections']):
        k(f'{key}_s{i}_h', he, ha); k(f'{key}_s{i}_b', be, ba)
    t_en = G.get('seo_title_en') or (G['title'][0] + ' | Hikaya')  # keep under ~60 characters
    t_ar = G['title'][1] + ' | حكاية'
    seo[file] = dict(en=(t_en, G['desc'][0]), ar=(t_ar, G['desc'][1]))

# ---- article pages ----
for G in GUIDES:
    key, file, img = G['key'], G['file'], G['img']
    url = SITE + file
    art = {"@context": "https://schema.org", "@type": "Article", "headline": G['title'][0], "description": G['desc'][0],
           "image": SITE + 'images/' + img + '.webp', "datePublished": DATE, "dateModified": DATE, "inLanguage": "en",
           "author": {"@type": "Organization", "name": "Hikaya by Maison Jaber", "url": SITE},
           "publisher": {"@type": "Organization", "name": "Hikaya by Maison Jaber", "logo": {"@type": "ImageObject", "url": SITE + 'images/logo-hikaya.png'}},
           "mainEntityOfPage": url}
    bc = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Hikaya", "item": SITE},
        {"@type": "ListItem", "position": 2, "name": "Gift guides", "item": SITE + 'guides.html'},
        {"@type": "ListItem", "position": 3, "name": G['title'][0], "item": url}]}
    secs = ''.join(f'<section><h2 data-i18n="gdg.{key}_s{i}_h">{e(he)}</h2><div data-i18n-html="gdg.{key}_s{i}_b">{be}</div></section>' for i, (he, ha, be, ba) in enumerate(G['sections']))
    others = ''.join(f'<li><a href="{o["file"]}" data-i18n="gdg.{o["key"]}_title">{e(o["title"][0])}</a></li>' for o in GUIDES if o['key'] != key)
    body = f'''
<body data-page="guide">
<div id="hk-top"></div>
<main id="main" tabindex="-1">
<article class="guide">
  <div class="guide-hero"><img src="images/{img}.webp" srcset="images/{img}-900.webp 900w, images/{img}.webp {G['w']}w" sizes="(max-width: 900px) 100vw, 900px" width="{G['w']}" height="{G['h']}" fetchpriority="high" alt="" /></div>
  <div class="guide-wrap">
    <nav class="crumbs" aria-label="Breadcrumb" data-i18n-aria="a11y.breadcrumb"><ol><li><a href="index.html" data-i18n="gdg.crumb_home">Home</a></li><li><a href="guides.html" data-i18n="gdg.crumb">Gift guides</a></li></ol></nav>
    <h1 data-i18n="gdg.{key}_title">{e(G['title'][0])}</h1>
    <p class="guide-meta"><time datetime="{DATE}" data-i18n="gdg.date">1 November 2026</time> · <span data-gdg-mins="{G['mins']}">{G['mins']} min read</span></p>
    <p class="lede" data-i18n="gdg.{key}_intro">{e(G['intro'][0])}</p>
    <div class="guide-body">{secs}</div>
    <aside class="guide-cta">
      <h2 data-i18n="gdg.cta_t">Make them the hero of their own story</h2>
      <p data-i18n="gdg.cta_d">A personalised hardcover storybook with their name and face, gift-boxed and delivered across the UAE and GCC.</p>
      <p class="guide-cta-btns"><a class="btn btn-primary" href="personalize.html"><span data-i18n="home6.cta_create">Create Their Story</span> <span class="arr" aria-hidden="true">→</span></a> <a class="text-link" href="{G['gift']}"><span data-i18n="gdg.cta_gift">See the gift ideas</span> <span aria-hidden="true">→</span></a></p>
    </aside>
    <nav class="guide-more" aria-labelledby="more-h"><h2 id="more-h" data-i18n="gdg.more">More guides</h2><ul>{others}</ul></nav>
  </div>
</article>
''' + foot_html
    open(f'{ROOT}/hikaya/{file}', 'w', encoding='utf-8').write(head(url, seo[file]['en'][0], seo[file]['en'][1], img, [art, bc]) + body)

# ---- index ----
url = SITE + 'guides.html'
seo['guides.html'] = dict(en=('Gift Guides & Tips for Parents | Hikaya by Maison Jaber', 'Gift ideas for birthdays and Eid, plus gentle tips for big childhood moments like a new sibling or the first day of school, from Hikaya by Maison Jaber.'),
                          ar=('أدلة الهدايا ونصائح للأهل | حكاية من ميزون جابر', 'أفكار هدايا لأعياد الميلاد والعيد، ونصائح لطيفة للحظات الطفولة الكبيرة مثل قدوم مولود جديد أو أول يوم في المدرسة، من حكاية من ميزون جابر'))
cards = ''.join(f'''<li class="guide-card"><a href="{G['file']}"><div class="img"><img src="images/{G['img']}-900.webp" width="900" height="{round(900*G['h']/G['w'])}" loading="lazy" alt="" /></div>
<div class="txt"><h2 data-i18n="gdg.{G['key']}_title">{e(G['title'][0])}</h2><p data-i18n="gdg.{G['key']}_desc">{e(G['desc'][0])}</p><span class="text-link"><span data-i18n="gdg.read">Read the guide</span> <span aria-hidden="true">→</span></span></div></a></li>''' for G in GUIDES)
bc = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
    {"@type": "ListItem", "position": 1, "name": "Hikaya", "item": SITE}, {"@type": "ListItem", "position": 2, "name": "Gift guides", "item": url}]}
body = f'''
<body data-page="guides">
<div id="hk-top"></div>
<main id="main" tabindex="-1">
<div class="wrap">
  <header style="padding-block:34px 24px;max-width:760px">
    <nav class="crumbs" aria-label="Breadcrumb" data-i18n-aria="a11y.breadcrumb"><ol><li><a href="index.html" data-i18n="gdg.crumb_home">Home</a></li><li aria-current="page" data-i18n="gdg.crumb">Gift guides</li></ol></nav>
    <h1 style="font-size:clamp(2.2rem,3.6vw,3.3rem);margin:10px 0" data-i18n="gdg.idx_title">Gift guides and tips for parents</h1>
    <p class="lede" data-i18n="gdg.idx_lede">Ideas for birthdays, Eid and big childhood moments, from the Hikaya by Maison Jaber team.</p>
  </header>
  <ul class="guide-grid">{cards}</ul>
</div>
''' + foot_html
open(f'{ROOT}/hikaya/guides.html', 'w', encoding='utf-8').write(head(url, seo['guides.html']['en'][0], seo['guides.html']['en'][1], 'hom-sty-01', [bc]).replace('og:type" content="article"', 'og:type" content="website"') + body)

js = '/* Gift guides (SEO phase 3, Nov 2026): EN + AR copy. Generated with the pages; Arabic carries no full stops. */\n(function () {\n  const T = window.HIKAYA_TRANSLATIONS = window.HIKAYA_TRANSLATIONS || {};\n  T.gdg = ' + json.dumps(T, ensure_ascii=False, indent=1) + ''';
  /* reading-time label follows the page language */
  function mins() { const ar = document.documentElement.lang === 'ar'; document.querySelectorAll('[data-gdg-mins]').forEach(el => { el.textContent = T.gdg.mins[ar ? 'ar' : 'en'].replace('{n}', el.dataset.gdgMins); }); }
  document.addEventListener('DOMContentLoaded', () => setTimeout(mins, 0));
  document.addEventListener('hikaya:langchange', () => setTimeout(mins, 0));
})();
'''
open(ROOT + '/guides-i18n.js', 'w', encoding='utf-8').write(js)
json.dump(seo, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'guide_seo.json'), 'w'), ensure_ascii=False, indent=1)
# Arabic sanity: no full stops in Arabic strings
bad = [n for n, v in T.items() if '.' in __import__('re').sub(r'<[^>]+>|\d\.\d|href="[^"]*"', '', v['ar'])]
print('ok', len(GUIDES), 'arabic-with-dots:', bad)
