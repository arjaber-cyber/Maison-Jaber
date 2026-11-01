import json, html, re, sys, os
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
SITE = 'https://maison-jaber.com/hikaya/'
e = lambda s: html.escape(s, quote=True)

C = [
 dict(key='UAE', file='personalised-books-uae.html', cc='AE', cur='AED', cur_ar='درهم', now='169', was='199', fee=0, eta=5,
      name=('the UAE', 'الإمارات'), short=('UAE', 'الإمارات'), cities=('Dubai, Abu Dhabi, Sharjah, Ajman, Ras Al Khaimah, Fujairah, Umm Al Quwain and Al Ain', 'دبي وأبوظبي والشارقة وعجمان ورأس الخيمة والفجيرة وأم القيوين والعين'),
      img='gft-child-reading-closeup', w=1254, h=1254,
      intro=("Hikaya by Maison Jaber is a UAE family business making personalised storybooks where your child is the hero. Choose a story, add their name, age and one photo, and we illustrate them on every page, print a hardcover book and deliver it gift-boxed to {cities}. Delivery is free anywhere in the Emirates, and you can pay by card or split the price into four payments with Tabby.",
             'حكاية من ميزون جابر مشروع عائلي إماراتي يصنع قصصًا مخصصة يكون طفلك بطلها، اختر قصة وأضف اسمه وعمره وصورة واحدة، ونحن نرسمه في كل صفحة ونطبع كتابًا بغلاف مقوّى ونوصله في علبة هدية إلى {cities}، والتوصيل مجاني في جميع الإمارات ويمكنك الدفع بالبطاقة أو تقسيم المبلغ على أربع دفعات مع تابي'),
      seo=dict(en=("Personalised Children's Books UAE | Dubai & Abu Dhabi | Hikaya", "Personalised storybooks with your child as the hero, in Arabic or English. AED 169 with free UAE delivery in about 5 working days. Gift-boxed; pay by card or Tabby."),
               ar=("قصص أطفال مخصصة باسم طفلك في الإمارات | دبي وأبوظبي | حكاية", "قصص مخصصة يكون طفلك بطلها بالعربية أو الإنجليزية، 169 درهمًا مع توصيل مجاني في جميع الإمارات خلال نحو 5 أيام عمل، في علبة هدية والدفع بالبطاقة أو تابي"))),
 dict(key='Saudi', file='personalised-books-saudi-arabia.html', cc='SA', cur='SAR', cur_ar='ريال سعودي', now='169', was='199', fee='30', eta=5,
      name=('Saudi Arabia', 'السعودية'), short=('Saudi Arabia', 'السعودية'), cities=('Riyadh, Jeddah, Dammam, Khobar, Makkah and Madinah', 'الرياض وجدة والدمام والخبر ومكة المكرمة والمدينة المنورة'),
      img='hom-sty-01', w=2000, h=1125,
      intro=("Give a child in Saudi Arabia a book where they are the hero. Every Hikaya story is available in Arabic or English, with your child's name and illustrated likeness on every page and your own message on the first. We print each hardcover book to order and deliver it gift-boxed to homes in {cities}, usually in about 5 working days.",
             'قدّم لطفل في السعودية كتابًا يكون هو بطله، فكل قصة من حكاية متوفرة بالعربية أو الإنجليزية، باسم طفلك وملامحه المرسومة في كل صفحة ورسالتك في الصفحة الأولى، نطبع كل كتاب بغلاف مقوّى حسب الطلب ونوصله في علبة هدية إلى المنازل في {cities} خلال نحو 5 أيام عمل عادةً'),
      seo=dict(en=("Personalised Children's Books in Saudi Arabia | Hikaya", "Personalised storybooks with your child as the hero, in Arabic or English. SAR 169, delivered across Saudi Arabia in about 5 working days, gift-boxed."),
               ar=("قصص أطفال مخصصة باسم طفلك في السعودية | حكاية", "قصص مخصصة يكون طفلك بطلها بالعربية أو الإنجليزية، 169 ريالًا مع التوصيل في السعودية، الرياض وجدة والدمام، خلال نحو 5 أيام عمل في علبة هدية"))),
 dict(key='Qatar', file='personalised-books-qatar.html', cc='QA', cur='QAR', cur_ar='ريال قطري', now='169', was='199', fee='30', eta=7,
      name=('Qatar', 'قطر'), short=('Qatar', 'قطر'), cities=('Doha, Al Wakrah, Al Rayyan and Lusail', 'الدوحة والوكرة والريان ولوسيل'),
      img='gft-bookshelf-scene', w=1060, h=1024,
      intro=("Looking for a gift that a child in Qatar will keep for years? Hikaya turns any of our stories into a book about them, in Arabic or English: their name, their age and an illustrated version of their face, with your message on the first page. Each hardcover book is printed to order and delivered gift-boxed to {cities} in about 7 working days.",
             'تبحث عن هدية يحتفظ بها طفل في قطر لسنوات؟ حكاية تحوّل أي قصة من قصصنا إلى كتاب عنه بالعربية أو الإنجليزية، باسمه وعمره وملامحه المرسومة مع رسالتك في الصفحة الأولى، يُطبع كل كتاب بغلاف مقوّى حسب الطلب ويصل في علبة هدية إلى {cities} خلال نحو 7 أيام عمل'),
      seo=dict(en=("Personalised Kids' Books in Qatar | Doha Delivery | Hikaya", "Personalised storybooks with your child as the hero, in Arabic or English. QAR 169, delivered to Doha and across Qatar in about 7 working days. Gift-boxed."),
               ar=("قصص أطفال مخصصة باسم طفلك في قطر | التوصيل للدوحة | حكاية", "قصص مخصصة يكون طفلك بطلها بالعربية أو الإنجليزية، 169 ريالًا قطريًا مع التوصيل إلى الدوحة وجميع أنحاء قطر خلال نحو 7 أيام عمل في علبة هدية"))),
 dict(key='Kuwait', file='personalised-books-kuwait.html', cc='KW', cur='KWD', cur_ar='دينار كويتي', now='14.25', was='16.75', fee='2.5', eta=7,
      name=('Kuwait', 'الكويت'), short=('Kuwait', 'الكويت'), cities=('Kuwait City, Hawalli, Salmiya and Ahmadi', 'مدينة الكويت وحولي والسالمية والأحمدي'),
      img='gft-eid', w=930, h=941,
      intro=("Hikaya makes storybooks where a child in Kuwait is the hero. Pick a story for their age, add their name and one photo, and choose an Arabic or English edition. We illustrate them on every page, print the book in hardcover and send it gift-boxed to {cities}, usually in about 7 working days. A thoughtful gift for birthdays, Eid or no reason at all.",
             'حكاية تصنع قصصًا يكون فيها طفل في الكويت هو البطل، اختر قصة تناسب عمره وأضف اسمه وصورة واحدة واختر النسخة العربية أو الإنجليزية، ونحن نرسمه في كل صفحة ونطبع الكتاب بغلاف مقوّى ونرسله في علبة هدية إلى {cities} خلال نحو 7 أيام عمل عادةً، هدية مميزة لأعياد الميلاد والعيد أو بلا مناسبة'),
      seo=dict(en=("Personalised Children's Books in Kuwait | Hikaya", "Personalised storybooks with your child as the hero, in Arabic or English. KWD 14.25, delivered across Kuwait in about 7 working days. Gift-boxed."),
               ar=("قصص أطفال مخصصة باسم طفلك في الكويت | حكاية", "قصص مخصصة يكون طفلك بطلها بالعربية أو الإنجليزية، 14.25 دينار كويتي مع التوصيل في جميع أنحاء الكويت خلال نحو 7 أيام عمل في علبة هدية"))),
 dict(key='Bahrain', file='personalised-books-bahrain.html', cc='BH', cur='BHD', cur_ar='دينار بحريني', now='17.25', was='20.5', fee='3', eta=7,
      name=('Bahrain', 'البحرين'), short=('Bahrain', 'البحرين'), cities=('Manama, Muharraq, Riffa and Isa Town', 'المنامة والمحرق والرفاع ومدينة عيسى'),
      img='gft-fantasy-night-scene', w=1536, h=1024,
      intro=("Make a child in Bahrain the hero of their own story. Every Hikaya book is personalised with the child's name and illustrated face, comes in Arabic or English, and opens with a message you write. We print each one in hardcover and deliver it gift-boxed to {cities} in about 7 working days.",
             'اجعل طفلًا في البحرين بطل قصته، فكل كتاب من حكاية مخصص باسم الطفل وملامحه المرسومة، ومتوفر بالعربية أو الإنجليزية، ويبدأ برسالة تكتبها أنت، نطبع كل كتاب بغلاف مقوّى ونوصله في علبة هدية إلى {cities} خلال نحو 7 أيام عمل'),
      seo=dict(en=("Personalised Children's Books in Bahrain | Hikaya", "Personalised storybooks with your child as the hero, in Arabic or English. BHD 17.25, delivered across Bahrain in about 7 working days. Gift-boxed."),
               ar=("قصص أطفال مخصصة باسم طفلك في البحرين | حكاية", "قصص مخصصة يكون طفلك بطلها بالعربية أو الإنجليزية، 17.25 دينار بحريني مع التوصيل في جميع أنحاء البحرين خلال نحو 7 أيام عمل في علبة هدية"))),
 dict(key='Oman', file='personalised-books-oman.html', cc='OM', cur='OMR', cur_ar='ريال عماني', now='17.75', was='21', fee='3', eta=7,
      name=('Oman', 'عُمان'), short=('Oman', 'عُمان'), cities=('Muscat, Salalah, Sohar and Nizwa', 'مسقط وصلالة وصحار ونزوى'),
      img='age-hero-03', w=2000, h=1333,
      intro=("Hikaya personalised storybooks put a child in Oman at the centre of the story, with their name and illustrated likeness on every page. Choose an Arabic or English edition, add your own message on the first page, and we print the book in hardcover and deliver it gift-boxed to {cities} in about 7 working days.",
             'قصص حكاية المخصصة تضع الطفل في عُمان في قلب القصة، باسمه وملامحه المرسومة في كل صفحة، اختر النسخة العربية أو الإنجليزية وأضف رسالتك في الصفحة الأولى، ونحن نطبع الكتاب بغلاف مقوّى ونوصله في علبة هدية إلى {cities} خلال نحو 7 أيام عمل'),
      seo=dict(en=("Personalised Kids' Books in Oman | Muscat Delivery | Hikaya", "Personalised storybooks with your child as the hero, in Arabic or English. OMR 17.75, delivered to Muscat and across Oman in about 7 working days. Gift-boxed."),
               ar=("قصص أطفال مخصصة باسم طفلك في عُمان | التوصيل لمسقط | حكاية", "قصص مخصصة يكون طفلك بطلها بالعربية أو الإنجليزية، 17.75 ريال عماني مع التوصيل إلى مسقط وجميع أنحاء عُمان خلال نحو 7 أيام عمل في علبة هدية"))),
]

T = {}
def k(name, en, ar):
    T[name] = {'en': en, 'ar': ar}
COMMON = dict(crumb_home=('Home', 'الرئيسية'), crumb=('Delivery', 'التوصيل'),
  facts=('At a glance', 'باختصار'), f_price=('Price per book', 'سعر الكتاب'), f_del=('Delivery', 'التوصيل'), f_time=('Delivery time', 'مدة التوصيل'),
  f_lang=('Book language', 'لغة الكتاب'), f_lang_v=('Arabic or English', 'العربية أو الإنجليزية'), f_pack=('Packaging', 'التغليف'), f_pack_v=('Gift-boxed, ready to give', 'في علبة هدية جاهزة للإهداء'),
  f_free=('Free', 'مجاني'), f_days=('About {n} working days', 'نحو {n} أيام عمل'), f_bundle=('Free on 2 or more books', 'مجاني عند طلب كتابين أو أكثر'),
  bundles=('2 books save 10% and 3 or more save 15%, with free delivery.', 'وفّر 10% على كتابين و15% على ثلاثة كتب أو أكثر، مع توصيل مجاني'),
  shelf=('Stories you can personalise', 'قصص يمكنك تخصيصها'), browse=('Browse all stories', 'تصفّح جميع القصص'),
  occ=('Gift ideas', 'أفكار هدايا'), faq=('Questions about delivery to {country}', 'أسئلة عن التوصيل إلى {country}'),
  also=('We also deliver to', 'نوصل أيضًا إلى'), show=('Show prices in {cur}', 'اعرض الأسعار بعملة {cur_ar}'))
for n, (en, ar) in COMMON.items(): k(n, en, ar)
OCC = [('gifts.html', 'Personalised gifts', 'هدايا مخصصة'), ('gift-birthday.html', 'Birthday', 'عيد الميلاد'), ('gift-eid-ramadan.html', 'Eid & Ramadan', 'العيد ورمضان'),
       ('gift-new-sibling.html', 'New sibling', 'مولود جديد'), ('gift-first-day-of-school.html', 'First day of school', 'أول يوم في المدرسة'), ('gift-christmas.html', 'Christmas', 'الكريسماس')]
for f, en, ar in OCC: k('o_' + f[:-5].replace('-', '_'), en, ar)

def faqs(c):
    n_en, n_ar = c['name']
    uae = c['key'] == 'UAE'
    out = [
      (f"How long does delivery to {n_en} take?", f"كم يستغرق التوصيل إلى {n_ar}؟",
       f"About {c['eta']} working days from your order. Each book is made to order, so for birthdays and Eid we suggest ordering at least a week ahead.",
       f"نحو {c['eta']} أيام عمل من تاريخ الطلب، وكل كتاب يُصنع حسب الطلب، لذلك ننصح بالطلب قبل أعياد الميلاد والعيد بأسبوع على الأقل"),
      ("How much is delivery?", "كم تكلفة التوصيل؟",
       "Delivery is free anywhere in the UAE." if uae else f"{c['cur']} {c['fee']}, or free when you order 2 or more books.",
       "التوصيل مجاني في أي مكان داخل الإمارات" if uae else f"{c['fee']} {c['cur_ar']}، أو مجانًا عند طلب كتابين أو أكثر"),
      ("How do I pay?", "كيف أدفع؟",
       "Pay securely by card, or split the price into 4 interest-free payments with Tabby." if uae else
       f"Prices are shown in {c['cur']}. Card payments are processed in UAE dirhams (AED) at the equivalent amount, so your bank statement may show the charge in AED.",
       "ادفع بأمان بالبطاقة، أو قسّم المبلغ على 4 دفعات بدون فوائد مع تابي" if uae else
       f"الأسعار معروضة بعملة {c['cur_ar']}، وتتم معالجة الدفع بالبطاقة بالدرهم الإماراتي بالمبلغ المعادل، لذلك قد يظهر المبلغ في كشف حسابك بالدرهم"),
      ("Can I order the book in Arabic?", "هل يمكن طلب الكتاب بالعربية؟",
       "Yes. Every story comes in Arabic or English. Arabic editions have their own covers and read right to left.",
       "نعم، كل قصة متوفرة بالعربية أو الإنجليزية، وللنسخة العربية أغلفتها الخاصة وتُقرأ من اليمين إلى اليسار"),
      (f"Can I send a book as a gift to someone in {n_en}?", f"هل يمكنني إرسال كتاب هدية لشخص في {n_ar}؟",
       "Yes. Enter their address at checkout and the book arrives gift-boxed, ready to give.",
       "نعم، أدخل عنوانه عند إتمام الطلب وسيصل الكتاب في علبة هدية جاهزة للإهداء"),
    ]
    return out

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
scripts = '\n'.join(f'<script src="{s}" defer></script>' for s in ['/i18n.js', '/home6-i18n.js', '/pages-i18n.js', '/countries-i18n.js', '/site-photos.js', '/consent.js', '/analytics.js', '/region.js', '/cart.js', 'chrome.js', 'gifts.js'])

seo = {}
for c in C:
    key, file = c['key'], c['file']; kk = key.lower()
    n_en, n_ar = c['name']
    intro_en = c['intro'][0].replace('{cities}', c['cities'][0]); intro_ar = c['intro'][1].replace('{cities}', c['cities'][1])
    h1 = (f"Personalised children's books in {n_en}", f"قصص أطفال مخصصة باسم طفلك في {n_ar}")
    lede = (f"Your child as the hero of a hardcover storybook, in Arabic or English. {c['cur']} {c['now']} per book, gift-boxed and delivered in about {c['eta']} working days.",
            f"طفلك بطل كتاب قصة بغلاف مقوّى بالعربية أو الإنجليزية، {c['now']} {c['cur_ar']} للكتاب، في علبة هدية مع التوصيل خلال نحو {c['eta']} أيام عمل")
    k(kk + '_h1', *h1); k(kk + '_lede', *lede); k(kk + '_intro', intro_en, intro_ar); k(kk + '_name', n_en[4:] if n_en.startswith('the ') else n_en, n_ar)
    fq = faqs(c)
    for i, (qe, qa, ae, aa) in enumerate(fq): k(f'{kk}_q{i}', qe, qa); k(f'{kk}_a{i}', ae, aa)
    seo[file] = dict(en=c['seo']['en'], ar=c['seo']['ar'])
    url = SITE + file
    fee_en = 'Free' if c['fee'] == 0 else f"{c['cur']} {c['fee']}"
    # structured data
    product = {"@context": "https://schema.org", "@type": "Product", "name": "Hikaya personalised children's storybook", "brand": {"@type": "Brand", "name": "Hikaya by Maison Jaber"},
               "description": f"A personalised hardcover storybook with the child as the hero, in Arabic or English, delivered gift-boxed in {n_en}.",
               "image": SITE + 'images/' + c['img'] + '.webp', "category": "Personalised children's books",
               "offers": {"@type": "Offer", "url": url, "price": c['now'], "priceCurrency": c['cur'], "availability": "https://schema.org/InStock", "itemCondition": "https://schema.org/NewCondition",
                          "eligibleRegion": {"@type": "Country", "name": c['cc']},
                          "shippingDetails": {"@type": "OfferShippingDetails", "shippingRate": {"@type": "MonetaryAmount", "value": 0 if c['fee'] == 0 else float(c['fee']), "currency": c['cur']},
                                              "shippingDestination": {"@type": "DefinedRegion", "addressCountry": c['cc']},
                                              "deliveryTime": {"@type": "ShippingDeliveryTime", "handlingTime": {"@type": "QuantitativeValue", "minValue": 1, "maxValue": 3, "unitCode": "DAY"},
                                                               "transitTime": {"@type": "QuantitativeValue", "minValue": 1, "maxValue": c['eta'] - 2, "unitCode": "DAY"}}}}}
    faq_ld = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q[0], "acceptedAnswer": {"@type": "Answer", "text": q[2]}} for q in fq]}
    bc = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Hikaya", "item": SITE}, {"@type": "ListItem", "position": 2, "name": h1[0], "item": url}]}
    head = head_tpl + f'''<link rel="canonical" href="{url}" />
<meta property="og:url" content="{url}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Hikaya by Maison Jaber" />
<meta property="og:image" content="{SITE}images/{c['img']}.webp" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>{e(c['seo']['en'][0])}</title>
<meta name="description" content="{e(c['seo']['en'][1])}" />
<meta property="og:title" content="{e(c['seo']['en'][0])}" />
<meta property="og:description" content="{e(c['seo']['en'][1])}" />
{assets}
''' + ''.join(f'<script type="application/ld+json">{json.dumps(o, ensure_ascii=False)}</script>\n' for o in [product, faq_ld, bc]) + '</head>'
    fee_html = f'<span data-i18n="ctry.f_free">Free</span>' if c['fee'] == 0 else f'<bdi dir="ltr">{c["cur"]} {c["fee"]}</bdi> · <span data-i18n="ctry.f_bundle">Free on 2 or more books</span>'
    facts = f'''<dl class="ctry-facts">
      <div><dt data-i18n="ctry.f_price">Price per book</dt><dd><s><bdi dir="ltr">{c['cur']} {c['was']}</bdi></s> <strong><bdi dir="ltr">{c['cur']} {c['now']}</bdi></strong></dd></div>
      <div><dt data-i18n="ctry.f_del">Delivery</dt><dd>{fee_html}</dd></div>
      <div><dt data-i18n="ctry.f_time">Delivery time</dt><dd data-ctry-days="{c['eta']}">About {c['eta']} working days</dd></div>
      <div><dt data-i18n="ctry.f_lang">Book language</dt><dd data-i18n="ctry.f_lang_v">Arabic or English</dd></div>
      <div><dt data-i18n="ctry.f_pack">Packaging</dt><dd data-i18n="ctry.f_pack_v">Gift-boxed, ready to give</dd></div>
    </dl>
    <p class="ctry-note" data-i18n="ctry.bundles">2 books save 10% and 3 or more save 15%, with free delivery.</p>'''
    faq_html = ''.join(f'<details><summary><span data-i18n="ctry.{kk}_q{i}">{e(q[0])}</span></summary><div class="faq-a"><p data-i18n="ctry.{kk}_a{i}">{e(q[2])}</p></div></details>' for i, q in enumerate(fq))
    others = ''.join(f'<a class="pill" href="{o["file"]}" data-i18n="ctry.{o["key"].lower()}_name">{e(o["name"][0][4:] if o["name"][0].startswith("the ") else o["name"][0])}</a>' for o in C if o['key'] != key)
    occ = ''.join(f'<a class="pill" href="{f}" data-i18n="ctry.o_{f[:-5].replace("-", "_")}">{e(en)}</a>' for f, en, ar in OCC)
    body = f'''
<body data-page="country" data-occasion="" data-country="{key}">
<div id="hk-top"></div>
<main id="main" tabindex="-1">

<section class="page-hero" aria-labelledby="ctry-title">
  <div class="hero-media"><img src="images/{c['img']}.webp" srcset="images/{c['img']}-900.webp 900w, images/{c['img']}.webp {c['w']}w" sizes="100vw" width="{c['w']}" height="{c['h']}" fetchpriority="high" alt="" /></div>
  <div class="wrap"><div class="hero-copy">
    <nav class="crumbs" aria-label="Breadcrumb" data-i18n-aria="a11y.breadcrumb"><ol><li><a href="index.html" data-i18n="ctry.crumb_home">Home</a></li><li aria-current="page" data-i18n="ctry.{kk}_name">{e(n_en[4:] if n_en.startswith('the ') else n_en)}</li></ol></nav>
    <h1 id="ctry-title" data-i18n="ctry.{kk}_h1">{e(h1[0])}</h1>
    <p class="lede" data-i18n="ctry.{kk}_lede">{e(lede[0])}</p>
    <p class="ctry-cta"><a class="btn btn-primary" href="personalize.html"><span data-i18n="home6.cta_create">Create Their Story</span> <span class="arr" aria-hidden="true">→</span></a> <button type="button" class="text-link ctry-region" data-region="{key}" hidden></button></p>
  </div></div>
</section>
<section class="wrap gift-intro"><p data-i18n="ctry.{kk}_intro">{e(intro_en)}</p></section>
<section class="sec wrap" aria-labelledby="facts-h">
  <div class="sec-head"><h2 id="facts-h" class="small" data-i18n="ctry.facts">At a glance</h2></div>
  {facts}
</section>
<section class="sec wrap" aria-labelledby="shelf-h">
  <div class="sec-head"><h2 id="shelf-h" class="small" data-i18n="ctry.shelf">Stories you can personalise</h2></div>
  <ul class="sgrid" id="gift-shelf" aria-busy="true"></ul>
  <p style="margin-top:22px"><a class="text-link" href="stories.html"><span data-i18n="ctry.browse">Browse all stories</span> <span aria-hidden="true">→</span></a></p>
</section>
<section class="sec wrap" aria-labelledby="occ-h">
  <div class="sec-head"><h2 id="occ-h" class="small" data-i18n="ctry.occ">Gift ideas</h2></div>
  <nav class="gift-links" aria-labelledby="occ-h">{occ}</nav>
</section>
<section class="sec wrap gift-faq faq-group" aria-labelledby="faq-h">
  <h2 id="faq-h" data-ctry-faq="{kk}">Questions about delivery to {e(n_en)}</h2>
  {faq_html}
</section>
<section class="sec wrap" aria-labelledby="also-h">
  <div class="sec-head"><h2 id="also-h" class="small" data-i18n="ctry.also">We also deliver to</h2></div>
  <nav class="gift-links" aria-labelledby="also-h">{others}</nav>
</section>
<section class="final section-gap" aria-labelledby="final-title" style="padding-top:var(--sec)">
  <div class="wrap"><div class="band">
    <div class="band-media"><img src="images/hom-cta-01.webp" srcset="images/hom-cta-01-900.webp 900w, images/hom-cta-01.webp 2000w" sizes="(max-width: 767px) 100vw, 60vw" width="1400" height="933" loading="lazy" alt="" /></div>
    <div class="band-copy"><h2 id="final-title" data-i18n-html="home6.final_title">Every child has a story.<br>Let's make theirs unforgettable.</h2>
      <a class="btn btn-primary" href="personalize.html"><span data-i18n="home6.cta_create">Create Their Story</span> <span class="arr" aria-hidden="true">→</span></a></div>
  </div></div>
</section>
</main>
<div id="hk-foot"></div>
{scripts}
</body>
</html>
'''
    open(f'{ROOT}/hikaya/{file}', 'w', encoding='utf-8').write(head + body)

COUNTRY_META = {c['key']: {'cur': c['cur'], 'cur_ar': c['cur_ar'], 'name': c['name'], 'kk': c['key'].lower()} for c in C}
js = '/* Country delivery pages (SEO, Nov 2026): EN + AR copy. Generated with the pages; Arabic carries no full stops. */\n(function () {\n  const T = window.HIKAYA_TRANSLATIONS = window.HIKAYA_TRANSLATIONS || {};\n  T.ctry = ' + json.dumps(T, ensure_ascii=False, indent=1) + ';\n  const META = ' + json.dumps(COUNTRY_META, ensure_ascii=False) + ''';
  const L = () => (document.documentElement.lang === 'ar' ? 'ar' : 'en');
  function render() {
    const l = L();
    document.querySelectorAll('[data-ctry-days]').forEach(el => { el.textContent = T.ctry.f_days[l].replace('{n}', el.dataset.ctryDays); });
    document.querySelectorAll('[data-ctry-faq]').forEach(el => { const m = META[Object.keys(META).find(k => META[k].kk === el.dataset.ctryFaq)]; el.textContent = T.ctry.faq[l].replace('{country}', m.name[l === 'ar' ? 1 : 0]); });
    /* "Show prices in SAR": only when the visitor's shop currency differs from this country's. */
    document.querySelectorAll('.ctry-region').forEach(btn => {
      const key = btn.dataset.region; const m = META[key];
      const cur = window.hikayaRegionKey ? window.hikayaRegionKey() : key;
      btn.hidden = !window.hikayaPickRegion || cur === key;
      btn.textContent = T.ctry.show[l].replace('{cur}', m.cur).replace('{cur_ar}', m.cur_ar);
      if (!btn.dataset.bound) { btn.dataset.bound = '1'; btn.addEventListener('click', () => { window.hikayaPickRegion(key); render(); }); }
    });
  }
  document.addEventListener('DOMContentLoaded', () => setTimeout(render, 0));
  document.addEventListener('hikaya:langchange', () => setTimeout(render, 0));
  document.addEventListener('hikaya:regionchange', () => setTimeout(render, 0));
})();
'''
open(ROOT + '/countries-i18n.js', 'w', encoding='utf-8').write(js)
json.dump(seo, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'country_seo.json'), 'w'), ensure_ascii=False, indent=1)
bad = [n for n, v in T.items() if '.' in re.sub(r'\d\.\d', '', v['ar'])]
print('ok', len(C), 'arabic-with-dots:', bad)
