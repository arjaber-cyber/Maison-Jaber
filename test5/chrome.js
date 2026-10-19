/* Hikaya — shared site chrome (2026 redesign).
   Every page includes:  <div id="hk-top"></div> ... <div id="hk-foot"></div>
   and loads this file (defer) after i18n.js / pages-i18n.js / region.js / cart.js.
   Provides: utility bar, header, mobile nav, footer, region + language
   switching, and window.Hikaya helpers for the story catalog and story cards. */
(function () {
  'use strict';

  const qsStr = () => window.__PREVIEW_QS != null ? window.__PREVIEW_QS : location.search;

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
<div class="utility" role="region" aria-label="Delivery and region" data-i18n-aria="a11y.utility"><div class="wrap">
  <p class="msg">${ICON.truck}<span id="delivery-msg">Free delivery across the UAE</span></p>
  <div class="controls">
    <div class="region">
      <button class="util-btn" id="region-btn" aria-haspopup="true" aria-expanded="false" aria-controls="region-menu" data-i18n-aria="a11y.region">${ICON.globe}<span id="region-label">UAE (AED)</span>${ICON.chev}</button>
      <ul class="region-menu" id="region-menu" role="menu" hidden></ul>
    </div>
    <span class="util-sep" aria-hidden="true"></span>
    <button class="util-btn" data-lang="en" aria-pressed="true" lang="en" aria-label="English"><span class="lf">English</span><span class="ls">EN</span></button>
    <span class="util-sep" aria-hidden="true"></span>
    <button class="util-btn" data-lang="ar" aria-pressed="false" lang="ar" aria-label="العربية"><span class="lf">العربية</span><span class="ls">ع</span></button>
  </div>
</div></div>
<header class="site-header"><div class="wrap">
  <a class="wordmark logo" href="index.html" aria-label="Hikaya by Maison Jaber, home" data-i18n-aria="a11y.home"><img src="${IMGSRC('logo-hikaya.webp')}" width="309" height="240" alt="Hikaya by Maison Jaber" /></a>
  <nav class="main-nav" aria-label="Main" data-i18n-aria="a11y.main_nav"><ul>${li}</ul></nav>
  <div class="header-actions">
    <a class="icon-btn hide-tab" href="search.html" aria-label="Search stories" data-i18n-aria="a11y.search">${ICON.search}</a>
    <a class="icon-btn hide-tab" href="account.html" aria-label="Account" data-i18n-aria="a11y.account">${ICON.user}</a>
    <a class="icon-btn" href="cart.html" aria-label="Cart" data-i18n-aria="a11y.cart">${ICON.bag}<span class="cart-badge">0</span></a>
    <a class="btn btn-primary" href="personalize.html"><span data-i18n="home6.cta_create">Create Their Story</span></a>
    <button class="icon-btn menu-btn" id="menu-btn" aria-expanded="false" aria-controls="mobile-nav" aria-label="Open menu">${ICON.menu}</button>
  </div>
</div>
<nav class="mobile-nav" id="mobile-nav" aria-label="Mobile" data-i18n-aria="a11y.mobile_nav" hidden><ul>
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
      <a class="wordmark logo" href="index.html" aria-label="Hikaya by Maison Jaber, home" data-i18n-aria="a11y.home"><img src="${IMGSRC('logo-hikaya-cream.webp')}" width="309" height="240" alt="Hikaya by Maison Jaber" /></a>
      <p class="about" data-i18n="home6.foot_about">Personalised hardcover storybooks, made for one child at a time and delivered gift-boxed across the UAE and GCC.</p>
      <p class="about foot-contact"><a href="mailto:hello@maison-jaber.com" dir="ltr">hello@maison-jaber.com</a><br><span id="hk-wa-foot" hidden><span class="wl"></span>: <a href="#" target="_blank" rel="noopener" dir="ltr"></a><br></span><span data-i18n="lx.foot_team">A real team, based in the UAE</span></p>
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
  <form class="foot-news" id="foot-news" novalidate>
    <div class="fn-copy"><h2 data-i18n="qa.news_t">New stories, first</h2><p data-i18n="qa.news_d">New stories and Eid, Ramadan and back-to-school editions. We write rarely and keep it short.</p></div>
    <div class="fn-row">
      <label class="sr-only" for="foot-news-email" data-i18n="qa.news_label">Your email</label>
      <input type="email" id="foot-news-email" required autocomplete="email" inputmode="email" dir="ltr" placeholder="you@email.com" />
      <button type="submit" class="btn btn-primary" data-i18n="qa.news_btn">Sign up</button>
    </div>
    <p class="fn-msg" id="foot-news-msg" role="status" aria-live="polite"></p>
  </form>
  <div class="foot-bottom">
    <span data-i18n="home6.foot_copy">© 2026 Maison Jaber. All rights reserved.</span>
    <span class="powered" data-i18n="pg.powered">Powered by Maison Jaber FZ-LLC</span>
    <span><a href="privacy.html" data-i18n="home6.foot_privacy">Privacy</a> &nbsp;·&nbsp; <a href="terms.html" data-i18n="home6.foot_terms">Terms</a></span>
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
  const fmt = (amount, r) => window.hikayaFormatPrice ? window.hikayaFormatPrice(amount, r) : `${r ? r.symbol : 'AED'} ${Number(amount)}`;
  /* Delivery estimate per country (working days): UAE and KSA about 5, the rest of the GCC about 7. */
  const ETA_DAYS = { UAE: 5, Saudi: 5, Qatar: 7, Kuwait: 7, Bahrain: 7, Oman: 7 };
  function etaDays(k) { return ETA_DAYS[k || regionKey()] || 7; }
  function etaText(k) { return t('lx.eta', 'Estimated delivery to {country}: about {n} working days').replace('{country}', countryName(k || regionKey())).replace('{n}', etaDays(k)); }
  function etaShort(k) { return t('lx.eta_short', 'About {n} working days').replace('{n}', etaDays(k)); }
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
    document.querySelectorAll('[data-hk-eta]').forEach(el => { el.textContent = etaText(k); });
    document.querySelectorAll('[data-hk-eta-short]').forEach(el => { el.textContent = etaShort(k); });
    document.querySelectorAll('[data-hk-price-now]').forEach(el => { el.innerHTML = priceHtml(); });
    document.querySelectorAll('[data-hk-price-line]').forEach(el => { const parts = t('lx.price_line', 'Personalised hardcover · {price} · Gift packaging included').split('{price}'); el.innerHTML = parts.map(esc).join(priceHtml()); });
    const menu = document.getElementById('region-menu');
    const regionWrap = document.querySelector('.utility .region');
    const available = GCC_KEYS.filter(key => regionObj(key));
    if (regionWrap) regionWrap.hidden = !available.length;
    if (menu) menu.innerHTML = GCC_KEYS.filter(key => regionObj(key)).map(key => `<li role="none"><button role="menuitemradio" aria-checked="${key === k}" data-region="${key}"><span>${esc(countryName(key))}</span><span class="cur">${esc(regionObj(key).currency)}</span></button></li>`).join('');
  }
  function initRegion() {
    const btn = document.getElementById('region-btn'); const menu = document.getElementById('region-menu');
    if (!btn || !menu) return;
    const close = () => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
    btn.addEventListener('click', e => {
      e.stopPropagation(); if (!menu.children.length) renderRegion(); if (!menu.children.length) return; const open = menu.hidden; menu.hidden = !open; btn.setAttribute('aria-expanded', String(open));
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
  const PAGE = (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '') || 'index';
  const BASE_TITLE = document.title;
  function menuLabel(open) { return open ? t('a11y.menu_close', 'Close menu') : t('a11y.menu_open', 'Open menu'); }
  function renderLang() {
    const l = lang();
    document.documentElement.lang = l; document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-i18n-aria]').forEach(el => { const v = t(el.getAttribute('data-i18n-aria')); if (v) el.setAttribute('aria-label', v); });
    const mb = document.getElementById('menu-btn'); if (mb) mb.setAttribute('aria-label', menuLabel(mb.getAttribute('aria-expanded') === 'true'));
    const pt = t('ttl.' + PAGE.replace(/-/g, '_'), ''); document.title = (l === 'ar' && pt) ? pt : BASE_TITLE; // English titles stay exactly as authored (SEO)
    document.querySelectorAll('.util-btn[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === l)));
    document.querySelectorAll('[data-i18n-alt]').forEach(img => { const v = t(img.getAttribute('data-i18n-alt')); if (v) img.alt = v; });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => { const v = t(el.getAttribute('data-i18n-ph')); if (v) el.placeholder = v; });
  }
  function initLang() {
    document.querySelectorAll('.util-btn[data-lang]').forEach(b => b.addEventListener('click', () => {
      if (window.hikayaSetLang) { window.hikayaSetLang(b.dataset.lang); return; }
      /* Safety net: if the translation engine failed to load, persist the choice and reload. */
      try { localStorage.setItem('hikaya_lang', b.dataset.lang); } catch (_) {}
      location.reload();
    }));
    document.addEventListener('hikaya:langchange', () => { renderLang(); renderRegion(); });
  }

  /* ---------------- Mobile nav + sticky CTA ---------------- */
  function initNav() {
    const btn = document.getElementById('menu-btn'); const nav = document.getElementById('mobile-nav');
    if (!btn || !nav) return;
    const set = open => { nav.hidden = !open; btn.setAttribute('aria-expanded', String(open)); btn.setAttribute('aria-label', menuLabel(open)); };
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

  /* ---------------- Newsletter sign-up (footer) ---------------- */
  document.addEventListener('submit', async e => {
    const form = e.target.closest && e.target.closest('#foot-news'); if (!form) return;
    e.preventDefault();
    const input = form.querySelector('input[type=email]'), msg = form.querySelector('.fn-msg'), btn = form.querySelector('button');
    const email = (input.value || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { msg.textContent = t('qa.news_bad', 'Please enter a valid email address.'); msg.className = 'fn-msg bad'; input.focus(); return; }
    btn.disabled = true; msg.className = 'fn-msg'; msg.textContent = t('qa.news_sending', 'Signing you up…');
    try {
      const r = await fetch('/.netlify/functions/subscribe-newsletter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, lang: lang() }) });
      if (!r.ok) throw new Error();
      msg.textContent = t('qa.news_ok', "You're on the list. Check your inbox for a welcome note."); msg.className = 'fn-msg ok'; input.value = '';
      if (window.hikayaTrackEvent) window.hikayaTrackEvent('newsletter_signup', {});
    } catch (_) { msg.textContent = t('qa.news_err', 'Something went wrong. Please try again.'); msg.className = 'fn-msg bad'; }
    btn.disabled = false;
  });

  /* ---------------- Photo privacy (modal) ---------------- */
  const PRIV_ROWS = [
    ['why', 'Why we ask for a photo', 'We need one clear photo so we can illustrate your child as the hero of their book. That is the only reason we ask for it.'],
    ['use', 'How the photo is used', 'It is used to create the illustrations for the book you order. Each photo gets an automatic check that a face is visible and the image is suitable, and we use trusted service providers to create the illustrations and print the book. They only receive what is needed to make your book.'],
    ['who', 'Who can see it', 'Only the Maison Jaber team preparing your order, plus those service providers. Your child’s photo is never shared with anyone else.'],
    ['public', 'Never public without your permission', 'We never use your child’s photo or book in advertising, on social media or in a public gallery unless you have given us written permission.'],
    ['keep', 'How long we keep it', 'Uploaded photos are deleted within 15 days. You can ask us to delete them sooner at any time.'],
    ['guardian', 'Who should upload', 'Only a parent or legal guardian, using a photo they have the right to share.'],
  ];
  function privacyHtml() {
    return `<div class="pv-dialog-inner">
      <button type="button" class="pv-x" data-pv-close aria-label="${esc(t('lx.close', 'Close'))}">×</button>
      <h2 id="pv-title">${esc(t('lx.pv_title', 'How we protect your child’s photo'))}</h2>
      <p class="pv-lede">${esc(t('lx.pv_lede', 'You are trusting us with something precious. Here is exactly what happens to the photo you upload.'))}</p>
      <dl>${PRIV_ROWS.map(([k, h, b]) => `<div><dt>${esc(t('lx.pv_' + k + '_t', h))}</dt><dd>${esc(t('lx.pv_' + k, b))}</dd></div>`).join('')}</dl>
      <p class="pv-contact">${esc(t('lx.pv_contact', 'Questions, or want a photo deleted now? Email us and a real person will reply, usually within a day.'))} <a href="mailto:hello@maison-jaber.com" dir="ltr">hello@maison-jaber.com</a></p>
      <p class="pv-more"><a href="privacy.html">${esc(t('lx.pv_policy', 'Read our full privacy policy'))}</a></p>
    </div>`;
  }
  let lastFocus = null;
  function openPrivacy() {
    let dlg = document.getElementById('pv-dialog');
    if (!dlg) {
      dlg = document.createElement('dialog'); dlg.id = 'pv-dialog'; dlg.className = 'pv-dialog'; dlg.setAttribute('aria-labelledby', 'pv-title');
      document.body.appendChild(dlg);
      dlg.addEventListener('click', e => { if (e.target === dlg || e.target.closest('[data-pv-close]')) dlg.close(); });
      dlg.addEventListener('close', () => { document.documentElement.classList.remove('pv-open'); if (lastFocus) lastFocus.focus(); });
    }
    dlg.innerHTML = privacyHtml();
    lastFocus = document.activeElement;
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    document.documentElement.classList.add('pv-open');
    const x = dlg.querySelector('.pv-x'); if (x) x.focus();
  }
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('[data-photo-privacy]');
    if (!a) return; e.preventDefault(); openPrivacy();
  });

  /* ---------------- Catalog + story cards ---------------- */
  /* Used only if the live catalogue cannot be reached. Mirrors the active stories in the dashboard (Oct 2026). */
  const SB = 'https://zxzlarlpoctpnnnvzced.supabase.co/storage/v1/object/public/site-photos/stories/';
  const FALLBACK_STORIES = [
    {"slug": "christmas-star", "title": "The Christmas Star That Went Missing", "title_ar": "نجمة الميلاد التي ضاعت", "age_bands": ["4-6", "6-8"], "moments": ["confidence", "kindness", "imagination"], "occasions": ["christmas", "birthday", "justbecause"], "cover_image_url": "https://maison-jaber.com/story-assets/christmas-star/cover.jpg", "back_cover_url": "https://maison-jaber.com/story-assets/christmas-star/back.jpg", "cover_image_url_ar": "https://maison-jaber.com/story-assets/christmas-star/cover-ar.jpg", "back_cover_url_ar": "https://maison-jaber.com/story-assets/christmas-star/back-ar.jpg", "preview_images_ar": ["https://maison-jaber.com/story-assets/christmas-star/l1-ar.jpg", "https://maison-jaber.com/story-assets/christmas-star/l2-ar.jpg", "https://maison-jaber.com/story-assets/christmas-star/l3-ar.jpg", "https://maison-jaber.com/story-assets/christmas-star/l4-ar.jpg"], "preview_images": ["https://maison-jaber.com/story-assets/christmas-star/l1.jpg", "https://maison-jaber.com/story-assets/christmas-star/l2.jpg", "https://maison-jaber.com/story-assets/christmas-star/l3.jpg", "https://maison-jaber.com/story-assets/christmas-star/l4.jpg"], "premise": {"en": "On Christmas Eve, the little star has fallen from the sky into the snow! A magical winter adventure about helping a friend find their way home and discovering that you shine brightest simply by being you.", "ar": "في ليلة الميلاد، سقطت النجمة الصغيرة من السماء إلى الثلج! مغامرة شتوية ساحرة عن مساعدة صديق في العودة إلى مكانه، واكتشاف أنك تتألق أكثر حين تكون نفسك"}, "card_note": {"en": "A magical Christmas story", "ar": "قصة ميلادية ساحرة"}, "sort_order": 1},
    {"slug": "door-of-a-thousand-stars", "title": "Door of a Thousand Stars", "title_ar": "باب الألف نجمة", "age_bands": ["4-6", "6-8"], "moments": ["courage", "new", "confidence", "adventure"], "occasions": ["school", "birthday", "eid", "justbecause"], "cover_image_url": "https://maison-jaber.com/story-assets/door-of-a-thousand-stars/cover.jpg", "back_cover_url": "https://maison-jaber.com/story-assets/door-of-a-thousand-stars/back.jpg", "cover_image_url_ar": "https://maison-jaber.com/story-assets/door-of-a-thousand-stars/cover-ar.jpg", "back_cover_url_ar": "https://maison-jaber.com/story-assets/door-of-a-thousand-stars/back-ar.jpg", "preview_images_ar": ["https://maison-jaber.com/story-assets/door-of-a-thousand-stars/l1-ar.jpg", "https://maison-jaber.com/story-assets/door-of-a-thousand-stars/l2-ar.jpg", "https://maison-jaber.com/story-assets/door-of-a-thousand-stars/l3-ar.jpg", "https://maison-jaber.com/story-assets/door-of-a-thousand-stars/l4-ar.jpg"], "preview_images": ["https://maison-jaber.com/story-assets/door-of-a-thousand-stars/l1.jpg", "https://maison-jaber.com/story-assets/door-of-a-thousand-stars/l2.jpg", "https://maison-jaber.com/story-assets/door-of-a-thousand-stars/l3.jpg", "https://maison-jaber.com/story-assets/door-of-a-thousand-stars/l4.jpg"], "premise": {"en": "A talking star, a magical doorway and an adventure beyond the clouds! Help your child discover the courage to take one more step, even when a new beginning feels scary.", "ar": "نجمة تتكلّم، وباب سحري، ومغامرة فوق الغيوم! قصة تساعد طفلك على اكتشاف شجاعته ليخطو خطوة أخرى، حتى حين تبدو البداية الجديدة مخيفة"}, "card_note": {"en": "Perfect before a new school", "ar": "مثالية قبل بداية المدرسة"}, "sort_order": 2},
    {"slug": "storm-above-the-city", "title": "The Storm Above the City", "title_ar": "العاصفة فوق المدينة", "age_bands": ["4-6", "6-8"], "moments": ["adventure", "courage", "imagination", "friendship"], "occasions": ["birthday", "eid", "justbecause"], "cover_image_url": "https://maison-jaber.com/story-assets/storm-above-the-city/cover.jpg", "back_cover_url": "https://maison-jaber.com/story-assets/storm-above-the-city/back.jpg", "cover_image_url_ar": "https://maison-jaber.com/story-assets/storm-above-the-city/cover-ar.jpg", "back_cover_url_ar": "https://maison-jaber.com/story-assets/storm-above-the-city/back-ar.jpg", "preview_images_ar": ["https://maison-jaber.com/story-assets/storm-above-the-city/l1-ar.jpg", "https://maison-jaber.com/story-assets/storm-above-the-city/l2-ar.jpg", "https://maison-jaber.com/story-assets/storm-above-the-city/l3-ar.jpg", "https://maison-jaber.com/story-assets/storm-above-the-city/l4-ar.jpg"], "preview_images": ["https://maison-jaber.com/story-assets/storm-above-the-city/l1.jpg", "https://maison-jaber.com/story-assets/storm-above-the-city/l2.jpg", "https://maison-jaber.com/story-assets/storm-above-the-city/l3.jpg", "https://maison-jaber.com/story-assets/storm-above-the-city/l4.jpg"], "premise": {"en": "Rubber ducks are falling from the sky and a strange storm is spinning over the city! A superhero adventure about staying calm, thinking cleverly and learning that even heroes need a helping hand.", "ar": "بطّات مطاطية تتساقط من السماء، وعاصفة غريبة تدور فوق المدينة! مغامرة بطولية عن الهدوء والتفكير الذكي، وعن أن الأبطال أيضًا يحتاجون إلى يد تساعدهم"}, "card_note": {"en": "A superhero adventure", "ar": "مغامرة بطولية"}, "sort_order": 3},
    {"slug": "to-the-rescue", "title": "To the Rescue!", "title_ar": "إلى الإنقاذ!", "age_bands": ["2-4", "4-6"], "moments": ["kindness", "friendship", "confidence"], "occasions": ["birthday", "eid", "justbecause"], "cover_image_url": "https://maison-jaber.com/story-assets/to-the-rescue/cover.jpg", "back_cover_url": "https://maison-jaber.com/story-assets/to-the-rescue/back.jpg", "cover_image_url_ar": "https://maison-jaber.com/story-assets/to-the-rescue/cover-ar.jpg", "back_cover_url_ar": "https://maison-jaber.com/story-assets/to-the-rescue/back-ar.jpg", "preview_images_ar": ["https://maison-jaber.com/story-assets/to-the-rescue/l1-ar.jpg", "https://maison-jaber.com/story-assets/to-the-rescue/l2-ar.jpg", "https://maison-jaber.com/story-assets/to-the-rescue/l3-ar.jpg", "https://maison-jaber.com/story-assets/to-the-rescue/l4-ar.jpg"], "preview_images": ["https://maison-jaber.com/story-assets/to-the-rescue/l1.jpg", "https://maison-jaber.com/story-assets/to-the-rescue/l2.jpg", "https://maison-jaber.com/story-assets/to-the-rescue/l3.jpg", "https://maison-jaber.com/story-assets/to-the-rescue/l4.jpg"], "premise": {"en": "A stuck ball, three little ducklings and a runaway kite! A cheerful neighbourhood adventure showing that you don't need a cape to be a hero, and that small hands can make a big difference.", "ar": "كرة عالقة، وثلاث بطّات صغيرة، وطائرة ورقية هاربة! مغامرة مبهجة في الحيّ تُظهر أنك لا تحتاج إلى عباءة لتكون بطلًا، وأن اليدين الصغيرتين تصنعان فرقًا كبيرًا"}, "card_note": {"en": "Small help, big difference", "ar": "مساعدة صغيرة وفرق كبير"}, "sort_order": 4},
    {"slug": "why-is-baby-looking-at-me", "title": "Why Is Baby Looking at Me?", "title_ar": "لماذا ينظر إليّ المولود الصغير؟", "age_bands": ["2-4", "4-6"], "moments": ["family", "emotions", "growing"], "occasions": ["newbaby", "birthday", "eid", "justbecause"], "cover_image_url": "https://maison-jaber.com/story-assets/why-is-baby-looking-at-me/cover.jpg", "back_cover_url": "https://maison-jaber.com/story-assets/why-is-baby-looking-at-me/back.jpg", "cover_image_url_ar": "https://maison-jaber.com/story-assets/why-is-baby-looking-at-me/cover-ar.jpg", "back_cover_url_ar": "https://maison-jaber.com/story-assets/why-is-baby-looking-at-me/back-ar.jpg", "preview_images_ar": ["https://maison-jaber.com/story-assets/why-is-baby-looking-at-me/l1-ar.jpg", "https://maison-jaber.com/story-assets/why-is-baby-looking-at-me/l2-ar.jpg", "https://maison-jaber.com/story-assets/why-is-baby-looking-at-me/l3-ar.jpg", "https://maison-jaber.com/story-assets/why-is-baby-looking-at-me/l4-ar.jpg"], "preview_images": ["https://maison-jaber.com/story-assets/why-is-baby-looking-at-me/l1.jpg", "https://maison-jaber.com/story-assets/why-is-baby-looking-at-me/l2.jpg", "https://maison-jaber.com/story-assets/why-is-baby-looking-at-me/l3.jpg", "https://maison-jaber.com/story-assets/why-is-baby-looking-at-me/l4.jpg"], "premise": {"en": "A new baby brings big changes and lots of questions! A warm, playful story about finding your place, sharing little moments and discovering the joy of being an older sibling.", "ar": "مولود جديد يعني تغييرات كبيرة وأسئلة كثيرة! قصة دافئة ومرحة عن إيجاد مكانك في العائلة، ومشاركة اللحظات الصغيرة، واكتشاف فرحة أن تصبح الأخ الأكبر أو الأخت الكبرى"}, "card_note": {"en": "For new big brothers and sisters", "ar": "للإخوة الكبار الجدد"}, "sort_order": 5},
    {"slug": "grandpas-wild-safari", "title": "Grandpa's Wild Safari", "title_ar": "رحلة السفاري البرية مع الجد", "age_bands": ["2-4", "4-6"], "moments": ["family", "adventure", "growing"], "occasions": ["birthday", "eid", "justbecause"], "cover_image_url": "https://maison-jaber.com/story-assets/grandpas-wild-safari/cover.jpg", "back_cover_url": "https://maison-jaber.com/story-assets/grandpas-wild-safari/back.jpg", "cover_image_url_ar": "https://maison-jaber.com/story-assets/grandpas-wild-safari/cover-ar.jpg", "back_cover_url_ar": "https://maison-jaber.com/story-assets/grandpas-wild-safari/back-ar.jpg", "preview_images_ar": ["https://maison-jaber.com/story-assets/grandpas-wild-safari/l1-ar.jpg", "https://maison-jaber.com/story-assets/grandpas-wild-safari/l2-ar.jpg", "https://maison-jaber.com/story-assets/grandpas-wild-safari/l3-ar.jpg", "https://maison-jaber.com/story-assets/grandpas-wild-safari/l4-ar.jpg"], "preview_images": ["https://maison-jaber.com/story-assets/grandpas-wild-safari/l1.jpg", "https://maison-jaber.com/story-assets/grandpas-wild-safari/l2.jpg", "https://maison-jaber.com/story-assets/grandpas-wild-safari/l3.jpg", "https://maison-jaber.com/story-assets/grandpas-wild-safari/l4.jpg"], "premise": {"en": "Elephants, giraffes, zebras and hidden cheetah cubs! A warm safari adventure with Grandpa about slowing down, looking closely and sharing a day you'll both remember.", "ar": "فيلة وزرافات وحمير وحشية، وأشبال فهد مختبئة! مغامرة سفاري دافئة مع الجد عن التمهّل والنظر بعناية، ومشاركة يوم لن تنسياه أبدًا"}, "card_note": {"en": "An adventure with Grandpa", "ar": "مغامرة مع الجد"}, "sort_order": 6},
    {"slug": "silver-wing-mission", "title": "The Silver-Wing Mission", "title_ar": "مهمة الجناح الفضي", "age_bands": ["6-8"], "moments": ["kindness", "friendship", "courage", "honesty"], "occasions": ["school", "birthday", "eid", "justbecause"], "cover_image_url": "https://maison-jaber.com/story-assets/silver-wing-mission/cover.jpg", "back_cover_url": "https://maison-jaber.com/story-assets/silver-wing-mission/back.jpg", "cover_image_url_ar": "https://maison-jaber.com/story-assets/silver-wing-mission/cover-ar.jpg", "back_cover_url_ar": "https://maison-jaber.com/story-assets/silver-wing-mission/back-ar.jpg", "preview_images_ar": ["https://maison-jaber.com/story-assets/silver-wing-mission/l1-ar.jpg", "https://maison-jaber.com/story-assets/silver-wing-mission/l2-ar.jpg", "https://maison-jaber.com/story-assets/silver-wing-mission/l3-ar.jpg", "https://maison-jaber.com/story-assets/silver-wing-mission/l4-ar.jpg"], "preview_images": ["https://maison-jaber.com/story-assets/silver-wing-mission/l1.jpg", "https://maison-jaber.com/story-assets/silver-wing-mission/l2.jpg", "https://maison-jaber.com/story-assets/silver-wing-mission/l3.jpg", "https://maison-jaber.com/story-assets/silver-wing-mission/l4.jpg"], "premise": {"en": "A spaceship, a playground mission and one brave choice. An exciting school adventure about standing beside a friend, welcoming others and discovering how kindness can change the day.", "ar": "سفينة فضاء، ومهمة في ساحة اللعب، وقرار شجاع واحد، مغامرة مدرسية مشوّقة عن الوقوف إلى جانب صديق، والترحيب بالآخرين، واكتشاف كيف يغيّر اللطف يومًا كاملًا"}, "card_note": {"en": "Kindness at school", "ar": "اللطف في المدرسة"}, "sort_order": 7},
    {"slug": "the-last-box", "title": "The Last Box", "title_ar": "الصندوق الأخير", "age_bands": ["2-4", "4-6"], "moments": ["change", "family", "emotions"], "occasions": ["birthday", "eid", "justbecause"], "cover_image_url": "https://maison-jaber.com/story-assets/the-last-box/cover.jpg", "back_cover_url": "https://maison-jaber.com/story-assets/the-last-box/back.jpg", "cover_image_url_ar": "https://maison-jaber.com/story-assets/the-last-box/cover-ar.jpg", "back_cover_url_ar": "https://maison-jaber.com/story-assets/the-last-box/back-ar.jpg", "preview_images_ar": [], "preview_images": ["https://maison-jaber.com/story-assets/the-last-box/l1.jpg", "https://maison-jaber.com/story-assets/the-last-box/l2.jpg", "https://maison-jaber.com/story-assets/the-last-box/l3.jpg", "https://maison-jaber.com/story-assets/the-last-box/l4.jpg"], "premise": {"en": "Boxes in every room and one very important box still open! A gentle, heart-warming story about saying goodbye to an old home, keeping your favourite memories close and helping a new house start to feel like home.", "ar": "صناديق في كل غرفة، وصندوق واحد مهم جدًا ما زال مفتوحًا! قصة دافئة ولطيفة عن وداع البيت القديم، والاحتفاظ بأجمل الذكريات، ومساعدة البيت الجديد على أن يصبح بيتًا حقيقيًا"}, "card_note": {"en": "For a move to a new home", "ar": "لمن ينتقل إلى بيت جديد"}, "sort_order": 8},
    {"slug": "the-cracked-blue-vase", "title": "The Cracked Blue Vase", "title_ar": "المزهرية الزرقاء المكسورة", "age_bands": ["2-4", "4-6"], "moments": ["honesty", "emotions", "responsibility"], "occasions": ["birthday", "eid", "justbecause"], "cover_image_url": "https://maison-jaber.com/story-assets/the-cracked-blue-vase/cover.jpg", "back_cover_url": "https://maison-jaber.com/story-assets/the-cracked-blue-vase/back.jpg", "cover_image_url_ar": "https://maison-jaber.com/story-assets/the-cracked-blue-vase/cover-ar.jpg", "back_cover_url_ar": "https://maison-jaber.com/story-assets/the-cracked-blue-vase/back-ar.jpg", "preview_images_ar": ["https://maison-jaber.com/story-assets/the-cracked-blue-vase/l1-ar.jpg", "https://maison-jaber.com/story-assets/the-cracked-blue-vase/l2-ar.jpg", "https://maison-jaber.com/story-assets/the-cracked-blue-vase/l3-ar.jpg", "https://maison-jaber.com/story-assets/the-cracked-blue-vase/l4-ar.jpg"], "preview_images": ["https://maison-jaber.com/story-assets/the-cracked-blue-vase/l1.jpg", "https://maison-jaber.com/story-assets/the-cracked-blue-vase/l2.jpg", "https://maison-jaber.com/story-assets/the-cracked-blue-vase/l3.jpg", "https://maison-jaber.com/story-assets/the-cracked-blue-vase/l4.jpg"], "premise": {"en": "One tiny crack, a mountain of soggy napkins and a very sticky plan! A funny, gentle story about little mistakes, the worry of keeping a secret and how much lighter everything feels once you ask for help.", "ar": "شرخ صغير، وجبل من المناديل المبلّلة، وخطة لاصقة جدًا! قصة مرحة ولطيفة عن الأخطاء الصغيرة، وثقل القلق حين نخفي سرًّا، وكم يخفّ كل شيء حين نطلب المساعدة"}, "card_note": {"en": "Owning up, gently", "ar": "عن الصدق بلطف"}, "sort_order": 9},
    {"slug": "the-christmas-list", "title": "The Christmas List That Grew and Grew", "title_ar": "قائمة الميلاد التي كبرت وكبرت", "age_bands": ["4-6", "6-8"], "moments": ["kindness", "family", "growing"], "occasions": ["christmas", "birthday", "justbecause"], "cover_image_url": "https://maison-jaber.com/story-assets/the-christmas-list/cover.jpg", "back_cover_url": "https://maison-jaber.com/story-assets/the-christmas-list/back.jpg", "cover_image_url_ar": "https://maison-jaber.com/story-assets/the-christmas-list/cover-ar.jpg", "back_cover_url_ar": "https://maison-jaber.com/story-assets/the-christmas-list/back-ar.jpg", "preview_images_ar": ["https://maison-jaber.com/story-assets/the-christmas-list/l1-ar.jpg", "https://maison-jaber.com/story-assets/the-christmas-list/l2-ar.jpg", "https://maison-jaber.com/story-assets/the-christmas-list/l3-ar.jpg", "https://maison-jaber.com/story-assets/the-christmas-list/l4-ar.jpg"], "preview_images": ["https://maison-jaber.com/story-assets/the-christmas-list/l1.jpg", "https://maison-jaber.com/story-assets/the-christmas-list/l2.jpg", "https://maison-jaber.com/story-assets/the-christmas-list/l3.jpg", "https://maison-jaber.com/story-assets/the-christmas-list/l4.jpg"], "premise": {"en": "A Christmas list so long it curls right out of the bedroom door! A warm, funny festive story about wanting, giving and discovering that the best part of Christmas is making someone smile.", "ar": "قائمة ميلاد طويلة جدًا حتى خرجت من باب غرفة النوم! قصة ميلادية دافئة ومضحكة عن الرغبة والعطاء، واكتشاف أن أجمل ما في الميلاد هو أن ترسم ابتسامة على وجه أحدهم"}, "card_note": {"en": "A Christmas story about giving", "ar": "قصة ميلادية عن العطاء"}, "sort_order": 10},
    {"slug": "teddys-night-adventure", "title": "Teddy's Night Adventure", "title_ar": "مغامرة تيدي الليلية", "age_bands": ["2-4", "4-6"], "moments": ["bedtime", "courage", "friendship"], "occasions": ["birthday", "eid", "justbecause"], "cover_image_url": "https://maison-jaber.com/story-assets/teddys-night-adventure/cover.jpg", "back_cover_url": "https://maison-jaber.com/story-assets/teddys-night-adventure/back.jpg", "cover_image_url_ar": "https://maison-jaber.com/story-assets/teddys-night-adventure/cover-ar.jpg", "back_cover_url_ar": "https://maison-jaber.com/story-assets/teddys-night-adventure/back-ar.jpg", "preview_images_ar": ["https://maison-jaber.com/story-assets/teddys-night-adventure/l1-ar.jpg", "https://maison-jaber.com/story-assets/teddys-night-adventure/l2-ar.jpg", "https://maison-jaber.com/story-assets/teddys-night-adventure/l3-ar.jpg", "https://maison-jaber.com/story-assets/teddys-night-adventure/l4-ar.jpg"], "preview_images": ["https://maison-jaber.com/story-assets/teddys-night-adventure/l1.jpg", "https://maison-jaber.com/story-assets/teddys-night-adventure/l2.jpg", "https://maison-jaber.com/story-assets/teddys-night-adventure/l3.jpg", "https://maison-jaber.com/story-assets/teddys-night-adventure/l4.jpg"], "premise": {"en": "When Teddy starts talking, bedtime becomes an adventure! A cosy, gently funny story about following a tiny clue through a dark bedroom, finding familiar surprises and discovering that being brave can mean feeling a little scared together.", "ar": "عندما يبدأ تيدي بالكلام، يتحوّل وقت النوم إلى مغامرة! قصة دافئة ومرحة عن تتبّع خيط صغير في غرفة مظلمة، واكتشاف مفاجآت مألوفة، وأن الشجاعة قد تعني أحيانًا أن نشعر ببعض الخوف معًا"}, "card_note": {"en": "For little ones afraid of the dark", "ar": "للصغار الذين يخافون الظلام"}, "sort_order": 11}
  ];

  let catalogPromise = null;
  function loadCatalog() {
    if (catalogPromise) return catalogPromise;
    catalogPromise = (async () => {
      let rows = FALLBACK_STORIES;
      try {
        const res = await fetch('/.netlify/functions/get-stories', { headers: { Accept: 'application/json' } });
        if (res.ok) { const data = await res.json(); const r = Array.isArray(data) ? data : data.stories; if (Array.isArray(r) && r.length) rows = r.filter(s => s.active !== false); }
      } catch (_) { /* fallback */ }
      return rows.map(localizeStory);
    })();
    return catalogPromise;
  }

  /* Arabic artwork: when the site is in Arabic, a story's cover, back cover and "Look inside" pages
     come from the *_ar fields (uploaded in the dashboard), falling back to the English artwork for any
     story that has no Arabic version yet. Getters, so switching language re-renders with the right images. */
  function localizeStory(s) {
    if (!s || s.__localized) return s;
    const o = { ...s, cover_image_url_en: s.cover_image_url || null };
    const en = { cover_image_url: s.cover_image_url || null, back_cover_url: s.back_cover_url || null, preview_images: Array.isArray(s.preview_images) ? s.preview_images : [] };
    const ar = { cover_image_url: s.cover_image_url_ar || null, back_cover_url: s.back_cover_url_ar || null, preview_images: Array.isArray(s.preview_images_ar) ? s.preview_images_ar.filter(Boolean) : [] };
    const pick = k => (lang() === 'ar' && (Array.isArray(ar[k]) ? ar[k].length : ar[k])) ? ar[k] : en[k];
    ['cover_image_url', 'back_cover_url', 'preview_images'].forEach(k => Object.defineProperty(o, k, { get: () => pick(k), enumerable: true, configurable: true }));
    Object.defineProperty(o, 'cover', { get: () => pick('cover_image_url'), enumerable: true, configurable: true });
    Object.defineProperty(o, '__localized', { value: true });
    return o;
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
  function rangeText(a, b) { return t('a11y.age_range', 'Ages {a}–{b}').replace('{a}', a).replace('{b}', b); }
  function ageText(bands) { const n = bandNums(bands); return n.length ? rangeText(Math.min(...n), Math.max(...n)) : ''; }
  function themeLabel(m) { if (!m) return ''; const g = groupOf(m); return g ? groupLabel(g) : t('home6.' + (THEME_KEYS[m] || 'th_' + m), m.charAt(0).toUpperCase() + m.slice(1)); }
  function arTitle(s) { return s.title_ar || (s.title_i18n && s.title_i18n.ar) || s.ar || ''; }
  function title(s) { return (lang() === 'ar' && arTitle(s)) ? arTitle(s) : s.title; }
  function tIn(key, l) { const [ns, k] = key.split('.'); const e = ((window.HIKAYA_TRANSLATIONS || {})[ns] || {})[k]; return e ? (e[l] || e.en || '') : ''; }
  function titleHtml(s) {
    const slot = `<span class="name-slot">${esc(t('home6.name_slot', 'Name'))}</span>`;
    return esc(title(s)).replace(/\[NAME\]/g, slot);
  }
  function titlePlain(s) { return title(s).replace(/\[NAME\]/g, t('home6.name_slot', 'Name')); }
  function localized(v) { if (!v) return ''; if (typeof v === 'string') return v; return v[lang()] || v.en || ''; }
  /* Brand rule: no full stops in Arabic copy (dashboard text included). */
  function arPunct(v) { return lang() === 'ar' ? String(v).replace(/([\u0600-\u06FF)»])\.\s+(?=[\u0600-\u06FF«])/g, '$1، ').replace(/\.\s*$/, '') : v; }
  function premise(s) { return arPunct(localized(s.premise) || s.description || localized(s.card_note) || ''); }
  function storyHref(s) { return `story.html?s=${encodeURIComponent(s.slug)}`; }
  function personaliseHref(s) { return `personalize.html?story=${encodeURIComponent(s.slug)}`; }
  /* One short emotional line for cards: the first sentence of the story's premise. */
  function oneLiner(s) {
    const p = premise(s); if (!p) return '';
    const m = p.match(/^.+?[.!?؟](?=\s|$)/); return (m ? m[0] : p).replace(/[.]$/, lang() === 'ar' ? '' : '.');
  }
  function coverHtml(s, extraClass, opts) {
    opts = opts || {};
    const alt = opts.alt ? esc(tpl(t('lx.cover_alt', 'Cover of {title}'), { title: titlePlain(s) })) : '';
    /* QA-09: cards use the 600px cover (cover-600.jpg) when it exists next to the full-size file; the story page keeps the large cover. */
    const small = !opts.eager && /\/story-assets\/[^/]+\/cover(-ar)?\.jpg$/.test(s.cover || '') ? s.cover.replace(/\.jpg$/, '-600.jpg') : '';
    const srcset = small ? ` srcset="${esc(small)} 600w, ${esc(s.cover)} 1200w" sizes="(max-width: 520px) 92vw, (max-width: 900px) 46vw, 300px"` : '';
    const img = s.cover ? `<img src="${esc(small || s.cover)}"${srcset} alt="${alt}"${opts.eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async" width="560" height="560" />` : '';
    return `<div class="cover${extraClass ? ' ' + extraClass : ''}">${img}${s.cover ? '' : `<div class="ttl" aria-hidden="true"><small>Hikaya</small><span>${titleHtml(s)}</span></div>`}</div>`;
  }
  function tpl(str, o) { return Object.keys(o).reduce((a, k) => a.split('{' + k + '}').join(o[k]), str); }
  function cardHtml(s, tag) {
    const age = ageText(s.age_bands); const th = themeLabel((s.moments || [])[0]); const line = oneLiner(s);
    tag = tag || 'li';
    return `<${tag} class="story-card">${coverHtml(s)}
      <div class="body"><h3><a href="${esc(storyHref(s))}">${titleHtml(s)}</a></h3>
      <div class="meta">${age ? `<span class="age">${esc(age)}</span>` : ''}${th ? `<span class="theme">${esc(th)}</span>` : ''}</div>
      ${line ? `<p class="line">${esc(line)}</p>` : ''}
      <p class="card-price" data-hk-price-now>${priceHtml()}</p>
      <div class="card-ctas"><a class="btn btn-primary btn-sm" href="${esc(personaliseHref(s))}">${esc(t('lx.personalise', 'Personalise this story'))}</a><a class="card-link" href="${esc(storyHref(s))}#inside">${esc(t('lx.see_inside', 'See inside'))}</a></div>
      </div></${tag}>`;
  }
  function skeletonHtml(n, tag) { tag = tag || 'li'; return Array.from({ length: n }, () => `<${tag} class="story-card is-skeleton" aria-hidden="true"><div class="cover"></div><div class="body"><span class="sk sk-t"></span><span class="sk sk-m"></span><span class="sk sk-l"></span></div></${tag}>`).join(''); }
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
  function priceNow() { const r = regionObj(); return r ? fmt(r.bookNow, r) : 'AED 169'; }
  function priceWas() { const r = regionObj(); return r && r.bookWas > r.bookNow ? fmt(r.bookWas, r) : ''; }
  /* "Was X, now Y" markup used everywhere a book price is shown (struck-through was + bold now). */
  function priceHtml() {
    const was = priceWas(), now = priceNow();
    return was ? `<s class="hk-was"><span class="sr-only">${esc(t('lx.was', 'Was'))} </span><bdi>${esc(was)}</bdi></s> <span class="hk-now"><span class="sr-only">${esc(t('lx.now', 'now'))} </span><bdi>${esc(now)}</bdi></span>` : `<span class="hk-now"><bdi>${esc(now)}</bdi></span>`;
  }

  /* ---------------- Shop by occasion ---------------- */
  /* Every Hikaya book suits any gifting moment, so most occasions show the whole collection.
     A few narrow it by story slug or "moments". A story can also carry its own `occasions` array from the dashboard. */
  const OCCASIONS = [
    { key: 'birthday', icon: '<path d="M5 21h14v-8H5z"/><path d="M3.5 21h17M5 16.5c1.2 1 2.3 1 3.5 0s2.3-1 3.5 0 2.3 1 3.5 0 2.3-1 3.5 0"/><path d="M8 13V10M12 13V10M16 13V10"/><path d="M8 7.5c-.7-.8-.7-1.6 0-2.5.7.9.7 1.7 0 2.5zM12 7.5c-.7-.8-.7-1.6 0-2.5.7.9.7 1.7 0 2.5zM16 7.5c-.7-.8-.7-1.6 0-2.5.7.9.7 1.7 0 2.5z"/>' },
    { key: 'eid', icon: '<path d="M15.5 3.5a8.5 8.5 0 1 0 5 13.2A7 7 0 0 1 15.5 3.5z"/><path d="M18 6.5l.7 1.4 1.5.2-1.1 1 .3 1.5-1.4-.7-1.4.7.3-1.5-1.1-1 1.5-.2z"/>' },
    { key: 'christmas', icon: '<path d="M12 3l3.5 5h-2L17 13h-2.5l3.5 5H6l3.5-5H7l3.5-5h-2z"/><path d="M12 18v3"/>' },
    { key: 'newbaby', slugs: ['why-is-baby-looking-at-me'], icon: '<circle cx="12" cy="7.5" r="3.5"/><path d="M6 20c.8-4.2 3.2-6.5 6-6.5s5.2 2.3 6 6.5"/><path d="M10.6 7.6h.01M13.4 7.6h.01"/>' },
    { key: 'school', moments: ['new', 'courage', 'confidence', 'friendship'], icon: '<path d="M6 8h12a1 1 0 0 1 1 1v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a1 1 0 0 1 1-1z"/><path d="M9 8V6a3 3 0 0 1 6 0v2M9 13h6"/>' },
    { key: 'justbecause', icon: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>' },
  ];
  const occasion = k => OCCASIONS.find(o => o.key === k) || null;
  const occasionLabel = k => t('occ.' + k, k);
  function inOccasion(s, k) {
    const o = occasion(k); if (!o) return true;
    if (Array.isArray(s.occasions) && s.occasions.length) return s.occasions.includes(k);
    if (o.slugs) return o.slugs.includes(s.slug);
    return !o.moments || (s.moments || []).some(m => o.moments.includes(m));
  }
  const occIcon = o => `<span class="occ-ico" aria-hidden="true"><svg viewBox="0 0 24 24">${o.icon}</svg></span>`;

  /* ---------------- WhatsApp help ---------------- */
  /* Business WhatsApp number in international format, digits only (e.g. '9715XXXXXXXX').
     Leave empty and the WhatsApp button stays hidden everywhere. */
  const WHATSAPP_NUMBER = '971508011769';
  const WHATSAPP_DISPLAY = '+971 50 801 1769';
  const WA_SKIP = ['admin', 'login', 'invoice'];
  function waHref() {
    /* QA-02: pages that know their subject (story detail) set data-wa-topic once their data has
       rendered, in the current language. Never read a heading: the hidden "not found" h1 comes first. */
    const story = (document.body && document.body.dataset.waTopic || '').trim();
    const msg = story ? t('wa.msg_page', 'Hi Hikaya, I have a question about {page}').replace('{page}', story) : t('wa.msg', 'Hi Hikaya, I have a question');
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  }
  const WA_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.2A9.8 9.8 0 0 0 3.6 17l-1.4 4.8 5-1.3A9.8 9.8 0 1 0 12 2.2zm0 17.8a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 20zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8 1c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.3-.4.8-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1l-.5-.3z"/></svg>';
  function renderWhatsApp() {
    if (!WHATSAPP_NUMBER || WA_SKIP.includes(PAGE)) return;
    let a = document.getElementById('hk-wa');
    if (!a) {
      a = document.createElement('a'); a.id = 'hk-wa'; a.className = 'hk-wa'; a.target = '_blank'; a.rel = 'noopener';
      a.addEventListener('click', () => { try { window.hikayaTrackEvent && window.hikayaTrackEvent('whatsapp_click', { page: PAGE }); } catch (_) {} });
      document.body.appendChild(a);
      /* QA-01: step the floating button aside while the footer's legal row (Privacy · Terms) is on screen,
         so it never covers those links; WhatsApp stays reachable from the footer contact line. */
      const legal = document.querySelector('.site-footer .foot-bottom');
      if (legal && 'IntersectionObserver' in window) new IntersectionObserver(([e]) => a.classList.toggle('is-docked', e.isIntersecting), { rootMargin: '0px 0px 40px 0px' }).observe(legal);
    }
    const footWa = document.getElementById('hk-wa-foot');
    if (footWa) { footWa.hidden = false; footWa.querySelector('a').href = waHref(); footWa.querySelector('a').textContent = WHATSAPP_DISPLAY; footWa.querySelector('.wl').textContent = t('wa.label', 'WhatsApp'); }
    a.href = waHref(); a.setAttribute('aria-label', t('wa.btn', 'Chat on WhatsApp'));
    a.innerHTML = `${WA_SVG}<span class="hk-wa-txt">${esc(t('wa.short', 'Need help?'))}</span>`;
    /* Pages can also offer it inline (e.g. Contact us): <div data-hk-whatsapp hidden>…</div> */
    document.querySelectorAll('[data-hk-whatsapp]').forEach(el => {
      el.hidden = false;
      el.innerHTML = `<dt>${esc(t('wa.label', 'WhatsApp'))}</dt><dd><a href="${esc(waHref())}" target="_blank" rel="noopener" dir="ltr">${esc(WHATSAPP_DISPLAY)}</a><br><small>${esc(t('wa.hours', 'A real person replies, usually within a few hours'))}</small></dd>`;
    });
  }

  function setQS(q) { if (window.__PREVIEW_QS != null) { window.__PREVIEW_QS = q; return; } try { history.replaceState(null, '', location.pathname + q); } catch (_) {} }
  window.Hikaya = { refreshWhatsApp: () => renderWhatsApp(), priceHtml, arPunct, tpl, oneLiner, personaliseHref, skeletonHtml, etaText, etaShort, etaDays, openPhotoPrivacy: () => openPrivacy(), tIn, arTitle, rangeText, title, THEMES, groupOf, groupLabel, qs: () => new URLSearchParams(qsStr()), setQS, t, lang, esc, isRTL, loadCatalog, localizeStory, cardHtml, coverHtml, ageText, themeLabel, titleHtml, titlePlain, premise, localized, storyHref, inBand, initCarousels, deliveryText, priceNow, priceWas, regionKey, ARR, OCCASIONS, occasion, occasionLabel, inOccasion, occIcon };

  /* ---------------- Boot ---------------- */
  mount();
  function boot() {
    initRegion(); initLang(); initNav(); initSticky(); initCarousels();
    renderLang(); renderRegion(); renderWhatsApp();
    document.addEventListener('hikaya:langchange', renderWhatsApp);
    if (window.hikayaApplyRegion) window.hikayaApplyRegion();
    /* Arabic visitors: translations are now applied, so reveal the page (instead of waiting for the 2.5 s safety timeout). */
    requestAnimationFrame(() => document.documentElement.classList.remove('i18n-wait'));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
