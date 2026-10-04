/* Hikaya — shared site chrome (2026 redesign).
   Every page includes:  <div id="hk-top"></div> ... <div id="hk-foot"></div>
   and loads this file (defer) after i18n.js / pages-i18n.js / region.js / cart.js.
   Provides: utility bar, header, mobile nav, footer, region + language
   switching, and window.Hikaya helpers for the story catalog and story cards. */
(function () {
  'use strict';

  const qsStr = () => window.__PREVIEW_QS != null ? window.__PREVIEW_QS : location.search;
  const params = new URLSearchParams(qsStr());
  if (params.get('dev') === '1') document.body.classList.add('dev');
  /* Sample stories from the brief only appear in development (?dev=1); the live site shows real stories only. */
  const DEV_PLACEHOLDERS = params.get('dev') === '1' || !!window.PREVIEW_IMAGES;

  const t = (key, fb) => (window.hikayaT && window.hikayaT(key)) || fb || '';
  const lang = () => (window.hikayaLang ? window.hikayaLang() : 'en');
  const isRTL = () => document.documentElement.dir === 'rtl';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ARR = '<span class="arr" aria-hidden="true">→</span>';
  const IMGSRC = f => (window.PREVIEW_IMAGES && window.PREVIEW_IMAGES[f]) || 'images/' + f;

  /* ---------------- Header / footer markup ---------------- */
  const ICON = {
    truck: '<svg viewBox="0 0 24 24" stroke-width="1.5" aria-hidden="true"><path d="M2 6h11v10H2zM13 9h4.5L21 12.5V16h-8"/><circle cx="6" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/></svg>',
    globe: '<svg class="globe" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/></svg>',
    chev: '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
    user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4.5 5-6.5 8-6.5s6.5 2 8 6.5"/></svg>',
    bag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>',
    menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  };

  function topHtml() {
    const nav = [['index.html', 'nav_home', 'Home'], ['stories.html', 'nav_stories', 'Stories'], ['age-groups.html', 'nav_ages', 'Age Groups'], ['our-world.html', 'nav_world', 'Our World'], ['about.html', 'nav_about', 'Our Story']];
    const here = location.pathname.split('/').pop() || 'index.html';
    const li = nav.map(([h, k, fb]) => `<li><a href="${h}"${here === h ? ' aria-current="page"' : ''} data-i18n="home6.${k}">${fb}</a></li>`).join('');
    return `
<a class="skip" href="#main" data-i18n="home6.skip">Skip to content</a>
<div class="utility" role="region" aria-label="Delivery and region"><div class="wrap">
  <p class="msg">${ICON.truck}<span id="delivery-msg">Free delivery across the UAE</span></p>
  <div class="controls">
    <div class="region">
      <button class="util-btn" id="region-btn" aria-haspopup="true" aria-expanded="false" aria-controls="region-menu">${ICON.globe}<span id="region-label">UAE (AED)</span>${ICON.chev}</button>
      <ul class="region-menu" id="region-menu" role="menu" hidden></ul>
    </div>
    <span class="util-sep" aria-hidden="true"></span>
    <button class="util-btn" data-lang="en" aria-pressed="true" lang="en" aria-label="English"><span class="lf">English</span><span class="ls">EN</span></button>
    <span class="util-sep" aria-hidden="true"></span>
    <button class="util-btn" data-lang="ar" aria-pressed="false" lang="ar" aria-label="العربية"><span class="lf">العربية</span><span class="ls">ع</span></button>
  </div>
</div></div>
<header class="site-header"><div class="wrap">
  <a class="wordmark logo" href="index.html" aria-label="Hikaya by Maison Jaber, home"><img src="${IMGSRC('logo-hikaya.webp')}" width="309" height="240" alt="Hikaya by Maison Jaber" /></a>
  <nav class="main-nav" aria-label="Main"><ul>${li}</ul></nav>
  <div class="header-actions">
    <a class="icon-btn hide-tab" href="search.html" aria-label="Search stories">${ICON.search}</a>
    <a class="icon-btn hide-tab" href="account.html" aria-label="Account">${ICON.user}</a>
    <a class="icon-btn" href="cart.html" aria-label="Cart">${ICON.bag}<span class="cart-badge">0</span></a>
    <a class="btn btn-primary" href="personalize.html"><span data-i18n="home6.cta_create">Create Their Story</span></a>
    <button class="icon-btn menu-btn" id="menu-btn" aria-expanded="false" aria-controls="mobile-nav" aria-label="Open menu">${ICON.menu}</button>
  </div>
</div>
<nav class="mobile-nav" id="mobile-nav" aria-label="Mobile" hidden><ul>
  ${li}
  <li><a href="help.html" data-i18n="home6.nav_faq">FAQs</a></li>
  <li><a href="search.html" data-i18n="home6.foot_search">Search</a></li>
  <li><a href="account.html" data-i18n="home6.nav_account">Account</a></li>
  <li><a class="btn btn-primary" href="personalize.html"><span data-i18n="home6.cta_create">Create Their Story</span> ${ARR}</a></li>
</ul></nav>
</header>`;
  }

  function footHtml() {
    return `
<footer class="site-footer"><div class="wrap">
  <div class="foot-grid">
    <div>
      <a class="wordmark logo" href="index.html" aria-label="Hikaya by Maison Jaber, home"><img src="${IMGSRC('logo-hikaya-cream.webp')}" width="309" height="240" alt="Hikaya by Maison Jaber" /></a>
      <p class="about" data-i18n="home6.foot_about">Personalised hardcover storybooks, made for one child at a time and delivered gift-boxed across the UAE and GCC.</p>
    </div>
    <div><h2 data-i18n="home6.foot_story">Our Story</h2><ul>
      <li><a href="about.html" data-i18n="home6.nav_about">Our Story</a></li>
      <li><a href="our-world.html" data-i18n="home6.nav_world">Our World</a></li>
      <li><a href="index.html#how-it-works" data-i18n="home6.foot_how">How it works</a></li>
    </ul></div>
    <div><h2 data-i18n="home6.foot_explore">Explore</h2><ul>
      <li><a href="stories.html" data-i18n="home6.nav_stories">Stories</a></li>
      <li><a href="age-groups.html" data-i18n="home6.nav_ages">Age Groups</a></li>
      <li><a href="search.html" data-i18n="home6.foot_search">Search</a></li>
    </ul></div>
    <div><h2 data-i18n="home6.foot_help">Help</h2><ul>
      <li><a href="help.html" data-i18n="home6.nav_faq">FAQs</a></li>
      <li><a href="contact.html" data-i18n="home6.foot_contact">Contact us</a></li>
      <li><a href="track-order.html" data-i18n="home6.foot_track">Track your order</a></li>
      <li><a href="refund-policy.html" data-i18n="home6.foot_refund">Returns and refunds</a></li>
    </ul></div>
    
  </div>
  <div class="foot-bottom">
    <span data-i18n="home6.foot_copy">© 2026 Maison Jaber. All rights reserved.</span>
    <span class="powered" data-i18n="pg.powered">Powered by Maison Jaber FZ-LLC</span>
    <span><a href="privacy.html" data-i18n="home6.foot_privacy">Privacy</a> &nbsp;·&nbsp; <a href="terms.html" data-i18n="home6.foot_terms">Terms</a></span>
    <span class="dev-note">Development build: add ?dev=1 to show stand-in tags.</span>
  </div>
</div></footer>`;
  }

  function mount() {
    const top = document.getElementById('hk-top');
    const foot = document.getElementById('hk-foot');
    if (top) top.outerHTML = topHtml();
    if (foot) foot.outerHTML = footHtml();
  }

  /* ---------------- Region + delivery ---------------- */
  const GCC_KEYS = ['UAE', 'Saudi', 'Qatar', 'Kuwait', 'Bahrain', 'Oman'];
  const regionKey = () => (window.hikayaRegionKey ? window.hikayaRegionKey() : 'UAE');
  const regionObj = k => (window.HIKAYA_REGIONS || {})[k || regionKey()];
  const countryName = k => t('home6_regions.' + k, k);
  const fmt = (amount, r) => window.hikayaFormatPrice ? window.hikayaFormatPrice(amount, r) : `${Number(amount).toFixed(2)} ${r ? r.symbol : 'AED'}`;
  function deliveryText(k) {
    const r = regionObj(k);
    if ((k || regionKey()) === 'UAE' || !r || !r.deliveryFee) return t('home6.del_uae', 'Free delivery across the UAE');
    return t('home6.del_gcc', 'Delivery to {country}: {fee}').replace('{country}', countryName(k || regionKey())).replace('{fee}', fmt(r.deliveryFee, r));
  }
  function renderRegion() {
    const k = regionKey(); const r = regionObj(k);
    const label = document.getElementById('region-label');
    if (label) label.textContent = `${countryName(k)} (${r ? r.currency : 'AED'})`;
    const msg = document.getElementById('delivery-msg');
    if (msg) msg.textContent = deliveryText(k);
    document.querySelectorAll('[data-hk-delivery]').forEach(el => { el.textContent = deliveryText(k); });
    const menu = document.getElementById('region-menu');
    if (menu) menu.innerHTML = GCC_KEYS.filter(key => regionObj(key)).map(key => `<li role="none"><button role="menuitemradio" aria-checked="${key === k}" data-region="${key}"><span>${esc(countryName(key))}</span><span class="cur">${esc(regionObj(key).currency)}</span></button></li>`).join('');
  }
  function initRegion() {
    const btn = document.getElementById('region-btn'); const menu = document.getElementById('region-menu');
    if (!btn || !menu) return;
    const close = () => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
    btn.addEventListener('click', e => {
      e.stopPropagation(); const open = menu.hidden; menu.hidden = !open; btn.setAttribute('aria-expanded', String(open));
      if (open) { const cur = menu.querySelector('[aria-checked="true"]') || menu.querySelector('button'); cur && cur.focus(); }
    });
    menu.addEventListener('click', e => {
      const item = e.target.closest('[data-region]'); if (!item) return;
      if (window.hikayaPickRegion) window.hikayaPickRegion(item.dataset.region);
      else { try { localStorage.setItem('hikaya_region', item.dataset.region); } catch (_) {} renderRegion(); document.dispatchEvent(new CustomEvent('hikaya:regionchange')); }
      close(); btn.focus();
    });
    menu.addEventListener('keydown', e => {
      const items = [...menu.querySelectorAll('button')]; const i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
      if (e.key === 'Escape') { close(); btn.focus(); }
    });
    document.addEventListener('click', e => { if (!e.target.closest('.region')) close(); });
    document.addEventListener('hikaya:regionchange', renderRegion);
  }

  /* ---------------- Language ---------------- */
  function renderLang() {
    const l = lang();
    document.querySelectorAll('.util-btn[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === l)));
    document.querySelectorAll('[data-i18n-alt]').forEach(img => { const v = t(img.getAttribute('data-i18n-alt')); if (v) img.alt = v; });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => { const v = t(el.getAttribute('data-i18n-ph')); if (v) el.placeholder = v; });
  }
  function initLang() {
    document.querySelectorAll('.util-btn[data-lang]').forEach(b => b.addEventListener('click', () => { if (window.hikayaSetLang) window.hikayaSetLang(b.dataset.lang); }));
    document.addEventListener('hikaya:langchange', () => { renderLang(); renderRegion(); });
  }

  /* ---------------- Mobile nav + sticky CTA ---------------- */
  function initNav() {
    const btn = document.getElementById('menu-btn'); const nav = document.getElementById('mobile-nav');
    if (!btn || !nav) return;
    const set = open => { nav.hidden = !open; btn.setAttribute('aria-expanded', String(open)); btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu'); };
    btn.addEventListener('click', () => set(nav.hidden));
    nav.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !nav.hidden) { set(false); btn.focus(); } });
  }
  function initSticky() {
    const bar = document.getElementById('sticky-cta'); if (!bar || !('IntersectionObserver' in window)) return;
    const start = document.querySelector('[data-sticky-after]'); const end = document.querySelector('[data-sticky-hide]');
    const seen = { a: !!start, b: false };
    const update = () => bar.classList.toggle('show', !seen.a && !seen.b);
    if (start) new IntersectionObserver(([e]) => { seen.a = e.isIntersecting; update(); }).observe(start);
    if (end) new IntersectionObserver(([e]) => { seen.b = e.isIntersecting; update(); }).observe(end);
    update();
  }

  /* ---------------- Catalog + story cards ---------------- */
  const SAMPLE_COVERS = window.PREVIEW_COVERS || Array.from({ length: 9 }, (_, i) => `images/cover-sample-${i + 1}.webp`);
  const FALLBACK_STORIES = [
    { slug: 'door-of-a-thousand-stars', title: 'Door of a Thousand Stars', age_bands: ['2-4', '4-6'], moments: ['adventure'], featured: true, page_count: 22, card_note: { en: 'A big adventure', ar: 'مغامرة كبيرة' } },
    { slug: 'bravest-little-one', title: 'The Bravest Little One', age_bands: ['2-4', '4-6', '6-8'], moments: ['confidence', 'new'], premise: { en: "For the child facing something new and a little scary — and discovering they're braver than they knew.", ar: 'لطفلك الذي يواجه شيئًا جديدًا ومخيفًا قليلًا — ويكتشف أنه أشجع مما كان يظن.' } },
    { slug: 'cloud-ship', title: 'The Cloud Ship', age_bands: ['2-4', '4-6', '6-8'], moments: ['adventure'], premise: { en: 'For the dreamer who wants to sail among the stars on a ship made of soft cloud.', ar: 'للحالم الذي يريد الإبحار بين النجوم على سفينة من الغيوم الناعمة.' } },
    { slug: 'star-who-couldnt-sleep', title: "The Star Who Couldn't Sleep", age_bands: ['2-4', '4-6', '6-8'], moments: ['bedtime'], premise: { en: 'A gentle wind-down story where your child teaches a sleepy star their own bedtime trick.', ar: 'قصة هادئة لختام اليوم يعلّم فيها طفلك نجمة نعسانة حيلته الخاصة في النوم.' } },
  ];
  const PLACEHOLDERS = [
    ['Maya Can Help Too!', 'مايا تستطيع المساعدة أيضًا!', ['2-4'], ['kindness'], 'new', 'For the little helper who wants to join in with the grown-ups, and discovers how much they can do.'],
    ['Captain [NAME] and the Storm Above the City', 'الكابتن [NAME] والعاصفة فوق المدينة', ['4-6'], ['courage'], 'new', 'When a storm rolls over the city, a brave young captain keeps everyone safe.'],
    ['Salma and the Last Box', 'سلمى والصندوق الأخير', ['4-6'], ['change'], 'new', 'A gentle story about moving house, saying goodbye and finding home again.'],
    ['Just One More Video', 'فيديو واحد بعد', ['4-6'], ['screen'], 'new', 'A funny, kind story about screen time and the adventures waiting off-screen.'],
    ["[NAME] and Grandpa's Wild Safari", '[NAME] ورحلة السفاري مع جدّو', ['6-8'], ['family'], 'new', 'A wild day out with Grandpa, full of animals, questions and big laughs.'],
    ['Joining In', 'هيا نلعب معًا', ['4-6'], ['friendship'], 'new', 'For the child who watches from the side, and finds the courage to join the game.'],
    ["Tom & Teddy's Night Adventure", 'مغامرة توم وتيدي الليلية', ['2-4'], ['bedtime'], 'best', 'A cosy night-time adventure with a very brave teddy.'],
    ['[NAME] and the Cracked Blue Vase', '[NAME] والمزهرية الزرقاء المكسورة', ['4-6'], ['honesty'], 'best', 'A heartfelt story about mistakes, honesty and finding the courage to make things right.'],
    ['[NAME] and the House of Missing Things', '[NAME] وبيت الأشياء الضائعة', ['6-8'], ['responsibility'], 'best', 'Where do lost things go? A curious search that ends with a lesson in looking after what we love.'],
  ].map(([title, ar, age_bands, moments, shelf, premise], i) => ({ slug: 'sample-' + (i + 1), title, ar, age_bands, moments, shelf, premise: { en: premise }, placeholder: true, cover: SAMPLE_COVERS[(i + 2) % SAMPLE_COVERS.length] }));

  let catalogPromise = null;
  function loadCatalog() {
    if (catalogPromise) return catalogPromise;
    catalogPromise = (async () => {
      let rows = FALLBACK_STORIES;
      try {
        const res = await fetch('/.netlify/functions/get-stories', { headers: { Accept: 'application/json' } });
        if (res.ok) { const data = await res.json(); const r = Array.isArray(data) ? data : data.stories; if (Array.isArray(r) && r.length) rows = r.filter(s => s.active !== false); }
      } catch (_) { /* fallback */ }
      const real = rows.map((s, i) => ({ ...s, cover: s.cover_image_url || null, sampleCover: s.cover_image_url ? null : SAMPLE_COVERS[i % SAMPLE_COVERS.length] }));
      return DEV_PLACEHOLDERS ? real.concat(PLACEHOLDERS) : real;
    })();
    return catalogPromise;
  }

  /* One theme system for the whole site (Our World tiles, filters, age pages, story cards).
     Each story "moment" from the dashboard maps to one of these six. */
  const THEMES = {
    courage: ['confidence', 'courage', 'new'],
    kindness: ['kindness', 'friendship'],
    emotions: ['emotions', 'honesty'],
    imagination: ['adventure', 'bedtime', 'imagination'],
    family: ['family'],
    growing: ['growing', 'change', 'screen', 'responsibility'],
  };
  const groupOf = m => Object.keys(THEMES).find(g => THEMES[g].includes(m)) || null;
  const groupLabel = g => t('pg.w_' + g, g.charAt(0).toUpperCase() + g.slice(1));
  const THEME_KEYS = { screen: 'th_screen', growing: 'th_growing' };
  function bandNums(bands) { return (bands || []).flatMap(b => String(b).split('-').map(Number)).filter(n => !isNaN(n)); }
  function ageText(bands) { const n = bandNums(bands); return n.length ? `${t('home6.ages', 'Ages')} ${Math.min(...n)}–${Math.max(...n)}` : ''; }
  function themeLabel(m) { if (!m) return ''; const g = groupOf(m); return g ? groupLabel(g) : t('home6.' + (THEME_KEYS[m] || 'th_' + m), m.charAt(0).toUpperCase() + m.slice(1)); }
  function title(s) { return (lang() === 'ar' && s.ar) ? s.ar : s.title; }
  function titleHtml(s) {
    const slot = `<span class="name-slot">${esc(t('home6.name_slot', 'Name'))}</span>`;
    return esc(title(s)).replace(/\[NAME\]/g, slot);
  }
  function titlePlain(s) { return title(s).replace(/\[NAME\]/g, t('home6.name_slot', 'Name')); }
  function localized(v) { if (!v) return ''; if (typeof v === 'string') return v; return v[lang()] || v.en || ''; }
  function premise(s) { return localized(s.premise) || s.description || localized(s.card_note) || ''; }
  function storyHref(s) { return s.placeholder ? `story.html?s=${encodeURIComponent(s.slug)}` : (s.detail_url && !/^story-/.test(s.detail_url) ? s.detail_url : `story.html?s=${encodeURIComponent(s.slug)}`); }
  function coverHtml(s, extraClass) {
    const isSample = !s.cover_image_url;
    return `<div class="cover${extraClass ? ' ' + extraClass : ''}">
      ${isSample ? `<span class="dev-tag" style="top:auto;bottom:8px">${s.placeholder ? 'Placeholder story' : 'Sample cover'}</span>` : ''}
      <img src="${esc(s.cover || s.sampleCover)}" alt="" loading="lazy" width="560" height="560" />
      ${isSample ? `<div class="ttl" aria-hidden="true"><small>Hikaya</small><span>${titleHtml(s)}</span></div>` : ''}
    </div>`;
  }
  function cardHtml(s, tag) {
    const age = ageText(s.age_bands); const th = themeLabel((s.moments || [])[0]);
    return `<${tag || 'li'} class="story-card">${coverHtml(s)}
      <div class="body"><h3><a href="${esc(storyHref(s))}">${titleHtml(s)}</a></h3>
      <div class="meta">${age ? `<span class="age">${esc(age)}</span>` : ''}${th ? `<span class="theme">${esc(th)}</span>` : ''}</div></div></${tag || 'li'}>`;
  }
  function inBand(s, band) {
    if (!band) return true;
    const [lo, hi] = band.split('-').map(Number);
    const bands = (s.age_bands && s.age_bands.length) ? s.age_bands : ['2-8'];
    return bands.some(b => { const [a, z] = String(b).split('-').map(Number); return a < hi && z > lo; });
  }

  /* ---------------- Carousels (any .track with .arrow-btn[aria-controls]) ---------------- */
  function updateArrows(track) {
    const max = track.scrollWidth - track.clientWidth - 4; const pos = Math.abs(track.scrollLeft);
    document.querySelectorAll(`.arrow-btn[aria-controls="${track.id}"]`).forEach(btn => { btn.disabled = Number(btn.dataset.dir) < 0 ? pos < 4 : pos >= max; });
  }
  function initCarousels(root) {
    (root || document).querySelectorAll('.arrow-btn[aria-controls]').forEach(btn => {
      if (btn.dataset.bound) return; btn.dataset.bound = '1';
      btn.addEventListener('click', () => {
        const track = document.getElementById(btn.getAttribute('aria-controls')); if (!track) return;
        const card = track.firstElementChild; const w = card ? card.getBoundingClientRect().width + 18 : track.clientWidth;
        const per = Math.max(1, Math.round(track.clientWidth / w) - 1);
        track.scrollBy({ left: Number(btn.dataset.dir) * w * per * (isRTL() ? -1 : 1), behavior: 'smooth' });
      });
    });
    (root || document).querySelectorAll('.track').forEach(track => {
      if (track.dataset.bound) { updateArrows(track); return; } track.dataset.bound = '1';
      let raf; track.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => updateArrows(track)); }, { passive: true });
      updateArrows(track);
    });
  }
  window.addEventListener('resize', () => document.querySelectorAll('.track').forEach(updateArrows));

  /* ---------------- Price helpers ---------------- */
  function priceNow() { const r = regionObj(); return r ? fmt(r.bookNow, r) : '149.00 AED'; }
  function priceWas() { const r = regionObj(); return r && r.bookWas > r.bookNow ? fmt(r.bookWas, r) : ''; }

  function setQS(q) { if (window.__PREVIEW_QS != null) { window.__PREVIEW_QS = q; return; } try { history.replaceState(null, '', location.pathname + q); } catch (_) {} }
  window.Hikaya = { THEMES, groupOf, groupLabel, qs: () => new URLSearchParams(qsStr()), setQS, t, lang, esc, isRTL, loadCatalog, cardHtml, coverHtml, ageText, themeLabel, titleHtml, titlePlain, premise, localized, storyHref, inBand, initCarousels, deliveryText, priceNow, priceWas, regionKey, ARR };

  /* ---------------- Boot ---------------- */
  mount();
  function boot() {
    initRegion(); initLang(); initNav(); initSticky(); initCarousels();
    renderLang(); renderRegion();
    if (window.hikayaApplyRegion) window.hikayaApplyRegion();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
