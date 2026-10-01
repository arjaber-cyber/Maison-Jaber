/* Hikaya v2 — shared runtime.
   Load AFTER /i18n.js, /region.js and /cart.js (all deferred, in that order):
     <script src="/i18n.js" defer><\/script>
     <script src="/region.js" defer><\/script>
     <script src="/cart.js" defer><\/script>
     <script src="/v2/assets/v2.js" defer><\/script>

   What lives here:
   1. V2 config — routes (v2 pages fall back to the current /test5 pages until
      they are rebuilt), feature flags, product facts.
   2. Strings — merged into the existing HIKAYA_TRANSLATIONS under "v2", so the
      existing i18n engine (EN/DE/AR + RTL) keeps doing all the work.
   3. Header + footer — rendered once, identical on every v2 page.
   4. Story catalogue — reads the same /.netlify/functions/get-stories feed the
      live shop uses, plus a small editorial layer (premise, moments) until
      those fields move into Supabase.
   5. Helpers — icons, tracking hook, price formatting.
   Nothing here changes cart, checkout, payment or photo logic. */

(function () {
  'use strict';

  /* ------------------------------------------------------------------
     1. Config
  ------------------------------------------------------------------ */
  const V2 = window.HIKAYA_V2 = window.HIKAYA_V2 || {};

  V2.config = {
    // Preview mode shows the "preview" banner and dashed markers on anything
    // that still needs real content. Flip to false before going live.
    preview: false,
    showTestimonials: false,   // no real reviews yet — section stays hidden live
    productionDays: null,      // not used separately; delivery promise below covers it
    deliveryDays: 7,           // "delivered within about a week"
    photoRetentionDays: 15,    // photos auto-deleted after 15 days
    giftPackagingIncluded: true,
    canShipAsGift: true,
  };

  // Every link on v2 goes through here. When a page is rebuilt in /v2,
  // change its entry and every header/footer/card link follows.
  const LIVE = '/v2/';
  V2.routes = {
    home: '/v2/',
    stories: LIVE + 'stories.html',
    story: (s) => (s && s.detail_url ? LIVE + s.detail_url : LIVE + 'story.html?s=' + encodeURIComponent(s ? s.slug : '')),
    personalise: (slug) => LIVE + 'personalize.html' + (slug ? '?story=' + encodeURIComponent(slug) : ''),
    howItWorks: '/v2/#how-it-works',
    gifting: '/v2/#gift',
    ourStory: LIVE + 'about.html',
    cart: LIVE + 'cart.html',
    faq: LIVE + 'help.html',
    contact: LIVE + 'contact.html',
    track: LIVE + 'track-order.html',
    account: LIVE + 'account.html',
    privacy: LIVE + 'privacy.html',
    terms: LIVE + 'terms.html',
    refunds: LIVE + 'refund-policy.html',
  };

  // Age bands the product is written for.
  V2.ageBands = ['2-4', '4-6', '6-8'];
  // The live catalogue still stores the old bands; map them until the data
  // migration (Milestone 3) lands. Old 5-7 → 4-6, old 8-10 → 6-8.
  const AGE_MAP = { '2-4': '2-4', '4-6': '4-6', '6-8': '6-8', '5-7': '4-6', '8-10': '6-8' };
  V2.normaliseAges = (str) => {
    const out = [];
    String(str || '').split(',').map(s => s.trim()).forEach(a => { const m = AGE_MAP[a]; if (m && !out.includes(m)) out.push(m); });
    return out.sort((a, b) => V2.ageBands.indexOf(a) - V2.ageBands.indexOf(b));
  };

  /* ------------------------------------------------------------------
     2. Strings (EN / AR / DE)
  ------------------------------------------------------------------ */
  const S = {
    preview_banner: { en: 'Preview of the new Hikaya site — not live', ar: 'معاينة لموقع حكاية الجديد — غير منشور', de: 'Vorschau der neuen Hikaya-Website — nicht live' },
    skip: { en: 'Skip to content', ar: 'انتقل إلى المحتوى', de: 'Zum Inhalt springen' },
    nav_stories: { en: 'Stories', ar: 'القصص', de: 'Geschichten' },
    nav_how: { en: 'How It Works', ar: 'كيف تعمل', de: "So funktioniert's" },
    nav_gifting: { en: 'Gifting', ar: 'الإهداء', de: 'Geschenke' },
    nav_ourstory: { en: 'Our Story', ar: 'قصتنا', de: 'Über uns' },
    cta_explore: { en: 'Explore Stories', ar: 'اكتشف القصص', de: 'Geschichten entdecken' },
    cta_see_how: { en: 'See How It Works', ar: 'شاهد كيف تعمل', de: "So funktioniert's" },
    cta_explore_story: { en: 'Explore Story', ar: 'اكتشف القصة', de: 'Geschichte ansehen' },
    cta_view_all: { en: 'View All Stories', ar: 'عرض كل القصص', de: 'Alle Geschichten' },
    cart: { en: 'Cart', ar: 'السلة', de: 'Warenkorb' },
    menu: { en: 'Menu', ar: 'القائمة', de: 'Menü' },
    close: { en: 'Close', ar: 'إغلاق', de: 'Schließen' },
    language: { en: 'Language', ar: 'اللغة', de: 'Sprache' },

    // footer
    f_tagline: { en: 'Personalised hardcover stories that turn your child into the hero. Made especially for them, wrapped as a gift.', ar: 'قصص بغلاف مقوّى تجعل طفلك بطل الحكاية. تُصنع خصيصًا له وتصل مغلّفة كهدية.', de: 'Personalisierte Hardcover-Geschichten, in denen Ihr Kind die Hauptrolle spielt. Eigens gefertigt, als Geschenk verpackt.' },
    f_shop: { en: 'Hikaya', ar: 'حكاية', de: 'Hikaya' },
    f_help: { en: 'Help', ar: 'المساعدة', de: 'Hilfe' },
    f_legal: { en: 'Policies', ar: 'السياسات', de: 'Richtlinien' },
    f_faq: { en: 'Questions & answers', ar: 'الأسئلة الشائعة', de: 'Häufige Fragen' },
    f_contact: { en: 'Contact us', ar: 'تواصل معنا', de: 'Kontakt' },
    f_track: { en: 'Track an order', ar: 'تتبّع طلبك', de: 'Bestellung verfolgen' },
    f_account: { en: 'Your account', ar: 'حسابك', de: 'Ihr Konto' },
    f_privacy: { en: 'Privacy', ar: 'الخصوصية', de: 'Datenschutz' },
    f_terms: { en: 'Terms', ar: 'الشروط', de: 'AGB' },
    f_refunds: { en: 'Returns & refunds', ar: 'الإرجاع والاسترداد', de: 'Rückgabe & Erstattung' },
    f_news_title: { en: 'New stories, first', ar: 'القصص الجديدة أولًا', de: 'Neue Geschichten zuerst' },
    f_news_copy: { en: 'New stories, thoughtful gifting ideas and little moments worth celebrating. A few emails a year.', ar: 'قصص جديدة، وأفكار هدايا مدروسة، ولحظات صغيرة تستحق الاحتفال. بضع رسائل في السنة.', de: 'Neue Geschichten, durchdachte Geschenkideen und kleine Momente, die es wert sind. Nur wenige E-Mails im Jahr.' },
    f_news_placeholder: { en: 'Your email', ar: 'بريدك الإلكتروني', de: 'Ihre E-Mail' },
    f_news_btn: { en: 'Sign up', ar: 'اشترك', de: 'Anmelden' },
    f_news_ok: { en: "You're on the list. We'll write when there's a new story.", ar: 'تمت إضافتك. سنراسلك عند صدور قصة جديدة.', de: 'Sie sind dabei. Wir melden uns bei einer neuen Geschichte.' },
    f_news_bad: { en: 'Check the email address and try again.', ar: 'تحقّق من البريد الإلكتروني وحاول مرة أخرى.', de: 'Bitte prüfen Sie die E-Mail-Adresse.' },
    f_news_fail: { en: "That didn't go through. Try again in a moment.", ar: 'لم يتم الإرسال. حاول مرة أخرى بعد قليل.', de: 'Das hat nicht geklappt. Bitte gleich noch einmal versuchen.' },
    f_region: { en: 'Shipping to', ar: 'الشحن إلى', de: 'Versand nach' },
    f_copy: { en: '© 2026 Maison Jaber. Hikaya by Maison Jaber.', ar: '© 2026 Maison Jaber. حكاية من Maison Jaber.', de: '© 2026 Maison Jaber. Hikaya by Maison Jaber.' },

    // shared product facts
    fact_hardcover: { en: 'Hardcover', ar: 'غلاف مقوّى', de: 'Hardcover' },
    fact_personalised: { en: 'Personalised', ar: 'مخصّص', de: 'Personalisiert' },
    fact_giftready: { en: 'Gift-ready', ar: 'جاهز للإهداء', de: 'Geschenkfertig' },
    ages: { en: 'Ages', ar: 'الأعمار', de: 'Alter' },
    from: { en: 'from', ar: 'من', de: 'ab' },

    // themes / moments
    m_bedtime: { en: 'Bedtime & big feelings', ar: 'وقت النوم والمشاعر الكبيرة', de: 'Schlafenszeit & große Gefühle' },
    m_bedtime_h: { en: 'For winding down and settling worries', ar: 'للاسترخاء وتهدئة المخاوف', de: 'Zum Runterkommen und Beruhigen' },
    m_confidence: { en: 'Confidence', ar: 'الثقة بالنفس', de: 'Selbstvertrauen' },
    m_confidence_h: { en: 'For finding out they can', ar: 'ليكتشف أنه قادر', de: 'Für das Gefühl: Ich kann das' },
    m_new: { en: 'Starting something new', ar: 'بداية جديدة', de: 'Etwas Neues beginnen' },
    m_new_h: { en: 'School, a move, a first time', ar: 'المدرسة، انتقال، أول مرة', de: 'Schule, Umzug, ein erstes Mal' },
    m_responsibility: { en: 'Responsibility', ar: 'المسؤولية', de: 'Verantwortung' },
    m_responsibility_h: { en: 'For little helpers', ar: 'للمساعدين الصغار', de: 'Für kleine Helfer' },
    m_friendship: { en: 'Friendship', ar: 'الصداقة', de: 'Freundschaft' },
    m_friendship_h: { en: 'Sharing, kindness, belonging', ar: 'المشاركة واللطف والانتماء', de: 'Teilen, Freundlichkeit, Dazugehören' },
    m_adventure: { en: 'Pure adventure', ar: 'مغامرة خالصة', de: 'Reines Abenteuer' },
    m_adventure_h: { en: 'Just for the joy of it', ar: 'للمتعة فقط', de: 'Einfach aus Freude' },

    // story editorial (approved copy reused from the live site)
    s_bravest_title: { en: 'The Bravest Little One', ar: 'الصغير الشجاع', de: 'Der Tapferste Kleine' },
    s_bravest_premise: { en: "For the child facing something new and a little scary — and discovering they're braver than they knew.", ar: 'لطفلك الذي يواجه شيئًا جديدًا ومخيفًا قليلًا — ويكتشف أنه أشجع مما كان يظن.', de: 'Für das Kind, das sich etwas Neuem und leicht Furchteinflößendem stellt — und entdeckt, dass es mutiger ist, als es dachte.' },
    s_bravest_note: { en: 'A gentle confidence story', ar: 'قصة لطيفة عن الثقة', de: 'Eine sanfte Mut-Geschichte' },
    s_cloud_title: { en: 'The Cloud Ship', ar: 'سفينة الغيوم', de: 'Das Wolkenschiff' },
    s_cloud_premise: { en: 'For the dreamer who wants to sail among the stars on a ship made of soft cloud.', ar: 'للحالم الذي يريد الإبحار بين النجوم على سفينة من الغيوم الناعمة.', de: 'Für den Träumer, der auf einem Schiff aus weicher Wolke zwischen den Sternen segeln möchte.' },
    s_cloud_note: { en: 'A big adventure', ar: 'مغامرة كبيرة', de: 'Ein großes Abenteuer' },
    s_star_title: { en: "The Star Who Couldn't Sleep", ar: 'النجمة التي لم تستطع النوم', de: 'Der Stern, der nicht schlafen konnte' },
    s_star_premise: { en: 'A gentle wind-down story where your child teaches a sleepy star their own bedtime trick.', ar: 'قصة هادئة لختام اليوم يعلّم فيها طفلك نجمة نعسانة حيلته الخاصة في النوم.', de: 'Eine sanfte Einschlafgeschichte, in der Ihr Kind einem müden Stern seinen eigenen Einschlaftrick beibringt.' },
    s_star_note: { en: 'Great for bedtime', ar: 'مثالية لوقت النوم', de: 'Ideal zum Einschlafen' },
    s_door_title: { en: 'Door of a Thousand Stars', ar: 'باب الألف نجمة', de: 'Die Tür der tausend Sterne' },
    s_door_premise: { en: 'A star-lit adventure with your child at the heart of it.', ar: 'مغامرة تحت ضوء النجوم وطفلك في قلبها.', de: 'Ein Abenteuer unter Sternen, mit Ihrem Kind im Mittelpunkt.' },
    s_door_note: { en: 'A big adventure', ar: 'مغامرة كبيرة', de: 'Ein großes Abenteuer' },

    // states
    st_no_match_title: { en: 'No story for this yet', ar: 'لا توجد قصة لهذا بعد', de: 'Noch keine Geschichte dafür' },
    st_no_match_copy: { en: 'New stories are on the way. In the meantime, these are closest.', ar: 'قصص جديدة في الطريق. إلى ذلك الحين، هذه الأقرب.', de: 'Neue Geschichten sind unterwegs. Bis dahin passen diese am besten.' },
    st_show_all: { en: 'Show all stories', ar: 'عرض كل القصص', de: 'Alle Geschichten zeigen' },
    dev_needs_art: { en: 'Needs real cover art', ar: 'Needs real cover art', de: 'Needs real cover art' },
    dev_needs_copy: { en: 'Premise needs approval', ar: 'Premise needs approval', de: 'Premise needs approval' },
  };

  function mergeStrings(extra) {
    window.HIKAYA_TRANSLATIONS = window.HIKAYA_TRANSLATIONS || {};
    window.HIKAYA_TRANSLATIONS.v2 = Object.assign(window.HIKAYA_TRANSLATIONS.v2 || {}, extra);
  }
  mergeStrings(S);
  V2.addStrings = mergeStrings;

  V2.lang = () => (window.hikayaLang ? window.hikayaLang() : (localStorage.getItem('hikaya_lang') || 'en'));
  V2.t = (key) => {
    const entry = (window.HIKAYA_TRANSLATIONS.v2 || {})[key];
    if (!entry) return key;
    return entry[V2.lang()] || entry.en;
  };
  // Re-render dynamic pieces when the language changes.
  V2.onLang = (fn) => document.addEventListener('hikaya:langchange', fn);
  V2.onRegion = (fn) => document.addEventListener('hikaya:regionchange', fn);

  /* ------------------------------------------------------------------
     5. Icons + helpers (declared early; header uses them)
  ------------------------------------------------------------------ */
  const ICON = {
    star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0c.6 6.3 5.7 11.4 12 12-6.3.6-11.4 5.7-12 12-.6-6.3-5.7-11.4-12-12C6.3 11.4 11.4 6.3 12 0z"/></svg>',
    arrow: '<svg class="icon-arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8h11M9 4l4 4-4 4"/></svg>',
    bag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
    menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h16M4 16h16"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  };
  V2.icon = (name) => ICON[name] || '';
  V2.star = () => '<span class="star">' + ICON.star + '</span>';
  V2.esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Funnel events. No provider is wired here: events go to window.dataLayer
  // only if analytics.js has already set it up after cookie consent.
  V2.track = (event, props) => {
    const payload = Object.assign({ event: 'hikaya_' + event, v2: true }, props || {});
    if (Array.isArray(window.dataLayer)) window.dataLayer.push(payload);
    document.dispatchEvent(new CustomEvent('hikaya:track', { detail: payload }));
    if (V2.config.preview && window.console) console.debug('[track]', payload);
  };

  V2.priceFrom = () => (window.hikayaPriceHtml ? window.hikayaPriceHtml() : '');

  /* ------------------------------------------------------------------
     3. Header + footer
  ------------------------------------------------------------------ */
  const R = V2.routes;
  const i = (k) => 'data-i18n="v2.' + k + '"';

  function currentNav() {
    const p = location.pathname + location.hash;
    if (/stories|story/.test(p)) return 'stories';
    if (/how-it-works/.test(p)) return 'how';
    if (/#gift/.test(p)) return 'gifting';
    return '';
  }

  function headerHtml() {
    const cur = currentNav();
    const nav = [
      ['stories', R.stories, 'nav_stories'],
      ['how', R.howItWorks, 'nav_how'],
      ['gifting', R.gifting, 'nav_gifting'],
      ['ourstory', R.ourStory, 'nav_ourstory'],
    ].map(([id, href, key]) => `<a href="${href}" ${id === cur ? 'aria-current="page"' : ''} ${i(key)}>${V2.t(key)}</a>`).join('');

    return `
      <a class="skip-link" href="#main" ${i('skip')}>${V2.t('skip')}</a>
      ${V2.config.preview ? `<div class="v2-banner" ${i('preview_banner')}>${V2.t('preview_banner')}</div>` : ''}
      <header class="site-header">
        <div class="wrap site-header__inner">
          <a class="wordmark" href="${R.home}" aria-label="Hikaya by Maison Jaber — home">
            <span class="wordmark__text">HIKAYA</span>
          </a>
          <nav class="site-nav" aria-label="Main">${nav}</nav>
          <div class="site-header__actions">
            <button class="lang-pill" type="button" aria-label="${V2.t('language')}">EN</button>
            <a class="icon-btn" href="${R.cart}" aria-label="${V2.t('cart')}">${ICON.bag}<span class="cart-badge" style="display:none">0</span></a>
            <a class="btn btn--primary btn--sm site-header__cta" href="${R.stories}" data-track="explore_stories_clicked" data-track-from="header" ${i('cta_explore')}>${V2.t('cta_explore')}</a>
            <button class="icon-btn menu-toggle" type="button" aria-expanded="false" aria-controls="mobile-menu" aria-label="${V2.t('menu')}">${ICON.menu}</button>
          </div>
        </div>
      </header>
      <div class="mobile-menu" id="mobile-menu" aria-hidden="true">
        <div class="mobile-menu__scrim" data-close-menu></div>
        <div class="mobile-menu__panel" role="dialog" aria-modal="true" aria-label="${V2.t('menu')}">
          <div class="mobile-menu__top">
            <span class="wordmark__text">HIKAYA</span>
            <button class="icon-btn" type="button" data-close-menu aria-label="${V2.t('close')}">${ICON.close}</button>
          </div>
          <nav aria-label="Main">${nav}</nav>
          <div class="mobile-menu__foot">
            <a class="btn btn--primary btn--block" href="${R.stories}" data-track="explore_stories_clicked" data-track-from="menu" ${i('cta_explore')}>${V2.t('cta_explore')}</a>
          </div>
        </div>
      </div>`;
  }

  function footerHtml() {
    return `
      <footer class="site-footer">
        <div class="wrap">
          <div class="site-footer__grid">
            <div class="site-footer__brand">
              <span class="wordmark__text">HIKAYA</span>
              <p ${i('f_tagline')}>${V2.t('f_tagline')}</p>
              <h2 ${i('f_news_title')}>${V2.t('f_news_title')}</h2>
              <p class="meta" style="margin:0 0 12px" ${i('f_news_copy')}>${V2.t('f_news_copy')}</p>
              <form class="inline-form" id="newsletter" novalidate>
                <label class="visually-hidden" for="nl-email" ${i('f_news_placeholder')}>${V2.t('f_news_placeholder')}</label>
                <input class="input" id="nl-email" type="email" autocomplete="email" required data-i18n-placeholder="v2.f_news_placeholder" placeholder="${V2.t('f_news_placeholder')}">
                <button class="btn btn--secondary" type="submit" ${i('f_news_btn')}>${V2.t('f_news_btn')}</button>
              </form>
              <p class="meta" id="nl-msg" role="status" style="margin-top:10px"></p>
            </div>
            <div>
              <h2 ${i('f_shop')}>Hikaya</h2>
              <ul>
                <li><a href="${R.stories}" ${i('nav_stories')}>${V2.t('nav_stories')}</a></li>
                <li><a href="${R.howItWorks}" ${i('nav_how')}>${V2.t('nav_how')}</a></li>
                <li><a href="${R.gifting}" ${i('nav_gifting')}>${V2.t('nav_gifting')}</a></li>
                <li><a href="${R.ourStory}" ${i('nav_ourstory')}>${V2.t('nav_ourstory')}</a></li>
              </ul>
            </div>
            <div>
              <h2 ${i('f_help')}>${V2.t('f_help')}</h2>
              <ul>
                <li><a href="${R.faq}" ${i('f_faq')}>${V2.t('f_faq')}</a></li>
                <li><a href="${R.contact}" ${i('f_contact')}>${V2.t('f_contact')}</a></li>
                <li><a href="${R.track}" ${i('f_track')}>${V2.t('f_track')}</a></li>
                <li><a href="${R.account}" ${i('f_account')}>${V2.t('f_account')}</a></li>
              </ul>
            </div>
            <div>
              <h2 ${i('f_legal')}>${V2.t('f_legal')}</h2>
              <ul>
                <li><a href="${R.privacy}" ${i('f_privacy')}>${V2.t('f_privacy')}</a></li>
                <li><a href="${R.terms}" ${i('f_terms')}>${V2.t('f_terms')}</a></li>
                <li><a href="${R.refunds}" ${i('f_refunds')}>${V2.t('f_refunds')}</a></li>
              </ul>
            </div>
          </div>
          <div class="site-footer__bottom">
            <span ${i('f_copy')}>${V2.t('f_copy')}</span>
            <span class="footer-zone"><span ${i('f_region')}>${V2.t('f_region')}</span> <button type="button" class="zone-pill">UAE</button></span>
          </div>
        </div>
      </footer>`;
  }

  function mountChrome() {
    const h = document.getElementById('v2-header');
    const f = document.getElementById('v2-footer');
    if (h) h.outerHTML = headerHtml();
    if (f) f.outerHTML = footerHtml();

    // scrolled state
    const header = document.querySelector('.site-header');
    const onScroll = () => header && header.classList.toggle('is-scrolled', window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

    // mobile menu
    const menu = document.getElementById('mobile-menu');
    const toggle = document.querySelector('.menu-toggle');
    const setMenu = (open) => {
      if (!menu) return;
      menu.classList.toggle('is-open', open);
      menu.setAttribute('aria-hidden', String(!open));
      toggle && toggle.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
      if (open) { const c = menu.querySelector('[data-close-menu].icon-btn'); c && c.focus(); } else { toggle && toggle.focus(); }
    };
    toggle && toggle.addEventListener('click', () => setMenu(true));
    menu && menu.querySelectorAll('[data-close-menu]').forEach(el => el.addEventListener('click', () => setMenu(false)));
    menu && menu.querySelectorAll('nav a').forEach(a => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu && menu.classList.contains('is-open')) setMenu(false); });

    // newsletter — same function the live site uses
    const form = document.getElementById('newsletter');
    form && form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('nl-email');
      const msg = document.getElementById('nl-msg');
      const email = (input.value || '').trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg.textContent = V2.t('f_news_bad'); input.focus(); return; }
      try {
        const res = await fetch('/.netlify/functions/subscribe-newsletter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, lang: V2.lang() }) });
        if (!res.ok) throw new Error();
        msg.textContent = V2.t('f_news_ok'); form.reset(); V2.track('newsletter_signup');
      } catch { msg.textContent = V2.t('f_news_fail'); }
    });

    // declarative tracking: any element with data-track
    document.addEventListener('click', (e) => {
      const el = e.target.closest && e.target.closest('[data-track]');
      if (el) V2.track(el.dataset.track, { from: el.dataset.trackFrom || '', story: el.dataset.trackStory || '' });
    });
  }

  /* ------------------------------------------------------------------
     4. Story catalogue
  ------------------------------------------------------------------ */
  // Editorial layer keyed by slug. Moves into Supabase columns in Milestone 3.
  V2.storyMeta = {
    'bravest-little-one': { title: 's_bravest_title', premise: 's_bravest_premise', note: 's_bravest_note', moments: ['confidence', 'new'] },
    'cloud-ship': { title: 's_cloud_title', premise: 's_cloud_premise', note: 's_cloud_note', moments: ['adventure'] },
    'star-who-couldnt-sleep': { title: 's_star_title', premise: 's_star_premise', note: 's_star_note', moments: ['bedtime'] },
    'door-of-a-thousand-stars': { title: 's_door_title', premise: 's_door_premise', note: 's_door_note', moments: ['adventure'], needsCopy: true },
  };
  // Theme → default moment, for stories added in admin before they get meta.
  const THEME_MOMENT = { courage: 'confidence', adventure: 'adventure', lullaby: 'bedtime' };

  V2.moments = [
    { id: 'bedtime', name: 'm_bedtime', hint: 'm_bedtime_h' },
    { id: 'confidence', name: 'm_confidence', hint: 'm_confidence_h' },
    { id: 'new', name: 'm_new', hint: 'm_new_h' },
    { id: 'responsibility', name: 'm_responsibility', hint: 'm_responsibility_h' },
    { id: 'friendship', name: 'm_friendship', hint: 'm_friendship_h' },
    { id: 'adventure', name: 'm_adventure', hint: 'm_adventure_h' },
  ];

  const FALLBACK = [
    { slug: 'bravest-little-one', title: 'The Bravest Little One', theme: 'courage', age_ranges: '2-4,5-7,8-10', cover_gradient: 'courage', detail_url: 'story-bravest-little-one.html' },
    { slug: 'cloud-ship', title: 'The Cloud Ship', theme: 'adventure', age_ranges: '2-4,5-7,8-10', cover_gradient: 'adventure', detail_url: 'story-cloud-ship.html' },
    { slug: 'star-who-couldnt-sleep', title: "The Star Who Couldn't Sleep", theme: 'lullaby', age_ranges: '2-4,5-7,8-10', cover_gradient: 'lullaby', detail_url: 'story-star-who-couldnt-sleep.html' },
  ];

  function enrich(s) {
    const meta = V2.storyMeta[s.slug] || {};
    return Object.assign({}, s, {
      ages: V2.normaliseAges(s.age_ranges),
      moments: meta.moments || [THEME_MOMENT[s.theme] || 'adventure'],
      titleText: () => (meta.title ? V2.t(meta.title) : s.title),
      premiseText: () => (meta.premise ? V2.t(meta.premise) : (s.description || '')),
      noteText: () => (meta.note ? V2.t(meta.note) : ''),
      needsCopy: !!meta.needsCopy || (!meta.premise && !s.description),
      previews: Array.isArray(s.preview_images) ? s.preview_images : [],
    });
  }

  let storiesPromise = null;
  V2.getStories = () => {
    if (storiesPromise) return storiesPromise;
    const seed = window.HIKAYA_V2_SEED_STORIES; // used by the offline preview only
    storiesPromise = (seed ? Promise.resolve({ stories: seed })
      : fetch('/.netlify/functions/get-stories').then(r => (r.ok ? r.json() : { stories: FALLBACK })).catch(() => ({ stories: FALLBACK })))
      .then(d => (d.stories && d.stories.length ? d.stories : FALLBACK).filter(s => s.active !== false).map(enrich)
        // stories with real cover art lead; otherwise keep the admin's order
        .map((s, n) => [s, n]).sort((a, b) => (!!b[0].cover_image_url - !!a[0].cover_image_url) || a[1] - b[1]).map(x => x[0]));
    return storiesPromise;
  };

  V2.storyCardHtml = (s) => {
    const title = V2.esc(s.titleText());
    const cover = s.cover_image_url
      ? `<img src="${V2.esc(s.cover_image_url)}" alt="${title} — cover" loading="lazy" decoding="async" width="800" height="600">`
      : `<div class="cover-placeholder cover-placeholder--${V2.esc(s.cover_gradient || s.theme || 'courage')}"><span>${title}</span></div>`;
    const devArt = V2.config.preview && !s.cover_image_url ? `<span class="dev-tag">${V2.t('dev_needs_art')}</span>` : '';
    const devCopy = V2.config.preview && s.needsCopy ? `<span class="dev-tag" style="top:auto;bottom:10px">${V2.t('dev_needs_copy')}</span>` : '';
    const ages = s.ages.length ? `${V2.t('ages')} ${s.ages[0].split('-')[0]}–${s.ages[s.ages.length - 1].split('-')[1]}` : '';
    const note = s.noteText();
    return `
      <a class="story-card" href="${V2.routes.story(s)}" data-track="story_card_clicked" data-track-story="${V2.esc(s.slug)}">
        <div class="story-card__media ${devArt || devCopy ? 'dev-placeholder' : ''}">${cover}${devArt}${devCopy}</div>
        <div class="story-card__body">
          ${note ? `<span class="story-card__theme">${V2.star()}${V2.esc(note)}</span>` : ''}
          <h3 class="story-card__title">${title}</h3>
          <p class="story-card__premise">${V2.esc(s.premiseText())}</p>
          <div class="story-card__foot">
            <span>${ages}</span>
            <span class="link">${V2.t('cta_explore_story')} ${ICON.arrow}</span>
          </div>
        </div>
      </a>`;
  };

  /* ------------------------------------------------------------------
     Boot
  ------------------------------------------------------------------ */
  mountChrome();

  // i18n.js translates text + placeholders; v2 also translates image alt text.
  function applyAlts() {
    document.querySelectorAll('[data-i18n-alt]').forEach(el => {
      const key = el.getAttribute('data-i18n-alt').replace(/^v2\./, '');
      const v = V2.t(key); if (v && v !== key) el.setAttribute('alt', v);
    });
    const lp = document.querySelector('.site-header .lang-pill');
    if (lp) lp.setAttribute('aria-label', V2.t('language'));
  }
  document.addEventListener('DOMContentLoaded', applyAlts);
  V2.onLang(applyAlts);

  // i18n.js sets lang/dir on DOMContentLoaded; keep html[dir] correct early too
  document.documentElement.dir = V2.lang() === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = V2.lang();
})();
