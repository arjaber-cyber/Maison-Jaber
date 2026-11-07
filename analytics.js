/* Hikaya by Maison Jaber — shared analytics loader.
   Include with: <script src="/analytics.js" defer></script>
   Load consent.js BEFORE this file on every page.

   SETUP (one-time):
     1. GA4 property "Hikaya - maison-jaber.com" (account: Maison Jaber).
        Microsoft Clarity project "Hikaya - maison-jaber.com" (heatmaps +
        session recordings). Both IDs are set below.
     2. Create a Meta Pixel at business.facebook.com/events_manager, get
        your Pixel ID (a plain number).
     3. Replace the two placeholder IDs below with your real ones.
     4. That's it — every page that includes this file will start tracking
        page views automatically, plus the key conversion events already
        wired up on Personalize and Checkout (see trackEvent() calls in
        those pages).

   Until you replace the placeholders, this file loads but sends nothing
   (it checks for the literal placeholder strings and skips loading the
   real GA/Pixel scripts), so there's no broken network requests or errors
   in the meantime.

   CONSENT (Google Consent Mode v2, advanced, Nov 2026): Google's tag loads on every page, but
   until the visitor accepts it runs with all Google consent set to "denied": no cookies are
   written or read, and Google only receives cookieless signals it uses for modelled reporting
   and modelled Google Ads conversions. "Analytics" in the banner grants analytics_storage;
   "Marketing" grants ad_storage, ad_user_data and ad_personalization. A choice made later in
   the visit is passed to Google immediately. Clarity and the Meta Pixel still load only after
   their category is accepted.
*/

window.HIKAYA_ANALYTICS_CONFIG = {
  GA_MEASUREMENT_ID: 'G-5L1750Y0YL',   // GA4: Hikaya - maison-jaber.com
  CLARITY_PROJECT_ID: 'yu5qjkitji',    // Microsoft Clarity: Hikaya - maison-jaber.com
  META_PIXEL_ID: '000000000000000',    // <-- replace with your real Pixel ID
};

(function () {
  /* Privacy (Nov 2026): a saved-order link (cart.html?resume=<private token>) must never reach
     Google Analytics, Clarity or Meta. Move the token out of the address bar into this tab's
     sessionStorage before anything reads the URL; recovery.js picks it up from there. */
  try {
    const u = new URL(location.href);
    const tok = u.searchParams.get('resume');
    if (tok) {
      try { sessionStorage.setItem('hk_resume_pending', tok); } catch (e) {}
      u.searchParams.delete('resume');
      history.replaceState(history.state, '', u.pathname + (u.search || '') + u.hash);
    }
  } catch (e) {}
  const cfg = window.HIKAYA_ANALYTICS_CONFIG;
  const gaConfigured = cfg.GA_MEASUREMENT_ID && cfg.GA_MEASUREMENT_ID !== 'G-XXXXXXXXXX';
  const pixelConfigured = cfg.META_PIXEL_ID && cfg.META_PIXEL_ID !== '000000000000000';
  const clarityConfigured = !!cfg.CLARITY_PROJECT_ID;
  let gaLoaded = false;
  const earlyEvents = []; // GA events fired before consent, replayed if GA loads later
  let pixelLoaded = false;
  let clarityLoaded = false;
  const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  // Internal / personal-document pages are never tracked.
  const untracked = /^(admin|invoice)(\.html)?$/.test(page); // also /hikaya/admin without .html

  /* Privacy: anything showing a child's photo or name, or an account's
     personal details, is hidden from Clarity recordings and heatmaps.
     (Clarity also masks every text input by default.) Elements rendered
     later from templates carry data-clarity-mask in the markup itself. */
  const MASK_SELECTORS = [
    '#photo-upload', '#photo-thumbs', '#extra-photo-upload', '#extra-photo-thumbs',
    '#child-name', '#item-meta', '#od-sub', '#od-number',
  ];
  const MASK_WHOLE_PAGE = /^(account|track-order|login)(\.html)?$/.test(page);
  function applyMasks() {
    if (MASK_WHOLE_PAGE && document.body) document.body.setAttribute('data-clarity-mask', 'true');
    MASK_SELECTORS.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) { el.setAttribute('data-clarity-mask', 'true'); });
    });
  }

  function hasConsent(category) {
    // If consent.js hasn't loaded for some reason, fail closed (no tracking)
    // rather than silently ignoring the missing consent check.
    return typeof window.hikayaHasConsent === 'function' && window.hikayaHasConsent(category);
  }

  // The visitor's banner choice in Google's consent terms (nothing chosen yet = all denied).
  function googleConsent() {
    const a = hasConsent('analytics') ? 'granted' : 'denied';
    const m = hasConsent('marketing') ? 'granted' : 'denied';
    return { analytics_storage: a, ad_storage: m, ad_user_data: m, ad_personalization: m };
  }
  let lastGoogleConsent = '';
  function updateGoogleConsent() {
    if (!gaLoaded || !window.gtag) return;
    const c = googleConsent(), key = JSON.stringify(c);
    if (key === lastGoogleConsent) return;
    lastGoogleConsent = key;
    window.gtag('consent', 'update', c);
  }

  function loadGA() {
    // consent.js missing: fail closed (no Google tag at all) rather than guess the visitor's choice.
    if (gaLoaded || !gaConfigured || typeof window.hikayaHasConsent !== 'function') return;
    gaLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    // Consent Mode v2: the defaults must reach Google before anything else.
    const c0 = googleConsent();
    lastGoogleConsent = JSON.stringify(c0);
    window.gtag('consent', 'default', c0);
    window.gtag('set', 'ads_data_redaction', true); // no ad identifiers while ad consent is denied
    window.gtag('set', 'url_passthrough', true);    // keeps the ad click id across pages without cookies
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${cfg.GA_MEASUREMENT_ID}`;
    document.head.appendChild(s);
    window.gtag('js', new Date());
    // The landing page's own address, with its campaign tags (they are removed from the address bar).
    const gaCfg = { page_location: landingHref };
    /* Tracking repair (Nov 2026): if cookies were accepted on a later page than the ad landing page,
       the gclid / utm tags are already gone from the address bar. Give GA the tags saved on landing
       (this tab only), so the visit stays credited to the ad or post that brought it. */
    try {
      const stash = sessionStorage.getItem('hk_ga_campaign');
      if (stash && !/[?&](gclid|utm_source|fbclid|ttclid)=/.test(landingHref)) {
        const u = new URL(landingHref); new URLSearchParams(stash).forEach(function (v, k) { if (!u.searchParams.has(k)) u.searchParams.set(k, v); });
        gaCfg.page_location = u.href;
      }
      sessionStorage.removeItem('hk_ga_campaign');
    } catch (e) {}
    /* Coming back from Tabby / Tamara / Ziina (or a sign-in page) is the same visit, not a new
       referral: report our own checkout as the referrer so the original source is kept. */
    if (isPaymentReturn()) gaCfg.page_referrer = location.origin + '/hikaya/checkout.html';
    window.gtag('config', cfg.GA_MEASUREMENT_ID, gaCfg);
    // Shop steps that happened before the visitor accepted cookies.
    earlyEvents.forEach(function (ev) { window.gtag('event', ev[0], ev[1]); });
    earlyEvents.length = 0;
  }

  function loadClarity() {
    if (clarityLoaded || !clarityConfigured || !hasConsent('analytics')) return;
    clarityLoaded = true;
    applyMasks();
    /* eslint-disable */
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
      (l.head || l.documentElement).appendChild(t);
    })(window, document, 'clarity', 'script', cfg.CLARITY_PROJECT_ID);
    /* eslint-enable */
    window.clarity('consent'); // visitor accepted analytics in our banner
    try { window.clarity('set', 'site_language', localStorage.getItem('hikaya_lang') || 'en'); } catch (e) {}
    try {
      const a = readAttr();
      const t = a && a.last;
      if (t) window.clarity('set', 'came_from', t.hk ? 'link ' + t.hk : (t.src || t.rh || 'direct') + (t.cmp ? ' / ' + t.cmp : ''));
      const ord = sessionStorage.getItem('hk_clarity_order');
      if (ord) window.hikayaTagOrder(ord);
    } catch (e) {}
  }

  /* Funnel steps, so GA4 can show where shoppers drop off (rules fixed Nov 2026):
     view_item      story page, only once the story is known to exist
     personalize_step (story/details/photo/extra/review)
     add_to_cart    personalize.html, only after the book is really in the cart
     view_cart      cart page, only with at least one book in it
     begin_checkout only when the shopper clicks through to checkout with books in the cart
                    (never on a checkout page load, never on a return from Tabby / Tamara / Ziina)
     purchase       only for a payment our server has confirmed (hikayaTrackPurchase below);
                    AED 0 creator / gift orders send complimentary_order_complete instead,
                    sandbox test orders send nothing. */
  let pageEventsFired = false;
  function firePageEvents() {
    if (pageEventsFired) return;
    pageEventsFired = true;
    const q = new URLSearchParams(location.search);
    if (page === 'story.html' && q.get('s')) {
      const slug = q.get('s');
      const cat = window.Hikaya && window.Hikaya.loadCatalog ? window.Hikaya.loadCatalog() : (window.hikayaCart ? window.hikayaCart.loadStories() : Promise.resolve([]));
      Promise.resolve(cat).then(function (all) {
        const s = (all || []).find(function (x) { return x.slug === slug; });
        if (!s) return; // unknown / deleted story: not a product view
        const r = region();
        window.hikayaTrackEvent('view_item', { story: slug, currency: r.currency, value: r.bookNow, items: [ecomItem({ slug: slug, story: s.title }, r)] });
      }).catch(function () {});
    }
    if (page === 'cart.html') {
      // The cart can be restored from a saved-order link a moment after load: check after that.
      setTimeout(function () {
        const p = cartPayload();
        if (p) window.hikayaTrackEvent('view_cart', p);
      }, 1200);
    }
    if (page === 'personalize.html') watchWizardSteps();
  }

  /* ---------- Ecommerce data (GA4 standard shape) ---------- */
  function region() {
    try { const r = window.hikayaRegion && window.hikayaRegion(); if (r && r.currency) return r; } catch (e) {}
    return { currency: 'AED', bookNow: 169, deliveryFee: 0 };
  }
  function ecomItem(item, r) {
    return {
      item_id: String(item.slug || item.story || 'story').slice(0, 100),
      item_name: String(item.story || item.slug || 'Story').slice(0, 100),
      item_category: 'Personalised storybook',
      item_variant: [item.bookLanguage, item.ageEdition].filter(Boolean).join(' / ') || undefined,
      price: r.bookNow, quantity: 1,
    };
  }
  function cartPayload() {
    const cart = window.hikayaCart ? window.hikayaCart.getCart() : [];
    if (!cart.length) return null;
    const r = region();
    let total = r.bookNow * cart.length;
    try { total = Math.round(window.hikayaCart.computeCartPricing(r).total * 100) / 100; } catch (e) {}
    return { currency: r.currency, value: total, items: cart.map(function (i) { return ecomItem(i, r); }) };
  }
  window.hikayaEcom = { item: function (i) { return ecomItem(i, region()); }, cart: cartPayload };

  /* begin_checkout: the shopper clicks any "Checkout" link (cart, book-added, welcome banner) with
     books in the cart. Once per cart contents per tab, so going back and forth isn't counted twice. */
  document.addEventListener('click', function (e) {
    const a = e.target && e.target.closest && e.target.closest('a[href]');
    if (!a || untracked) return;
    let path = ''; try { path = new URL(a.href, location.href).pathname; } catch (err) { return; }
    if (!/\/checkout\.html$/.test(path) || page === 'checkout.html') return;
    const p = cartPayload(); if (!p) return;
    const sig = (window.hikayaCart.getCart() || []).map(function (i) { return i.id; }).sort().join(',');
    try { if (sessionStorage.getItem('hk_bc_sig') === sig) return; sessionStorage.setItem('hk_bc_sig', sig); } catch (err) {}
    window.hikayaTrackEvent('begin_checkout', p);
  }, true);

  /* ---------- purchase: exactly once per confirmed, paid order (reworked Nov 2026) ----------
     s = the server's order summary (_gaSummary.js, from the order-status / free-order reply):
         { confirmed: true, kind: 'purchase' | 'complimentary' | 'none', transaction_id, value, currency,
           coupon, shipping, items: [{ item_id, item_name, price, quantity }] } (+ payment_method)
     Only a server-built summary can produce a purchase; nothing is taken from the URL or the cart.

     Delivery is a small outbox on this device (localStorage), keyed by order number:
       1. the order goes into the outbox once (the first server summary wins);
       2. it is sent to GA once Google's tag has really loaded (cookieless if the visitor hasn't
          accepted cookies, per Consent Mode), and only marked "sent" once GA's callback confirms it;
       3. if the page is refreshed, closed or left before that, it is retried on the next page view
          (a payment-return revisit or a refresh), for up to 72 h;
       4. a refusal of cookies is respected: Google gets no cookies or identifiers, only the
          anonymous cookieless purchase signal used for modelled conversions.
     GA itself also ignores a second purchase with the same transaction_id. The Meta Pixel (marketing
     consent) is tracked separately, with the order number as its de-duplication event id. */
  const SENT_KEY = 'hk_ga_sent_orders';        // order numbers GA has confirmed (kept from the old version)
  const OUTBOX_KEY = 'hk_purchase_outbox_v1';   // confirmed orders still waiting to reach GA / Meta
  const OUTBOX_TTL = 72 * 3600 * 1000;
  const ORDER_RE = /^HK-\d{6,12}$/;
  function readList(k) { try { const l = JSON.parse(localStorage.getItem(k) || '[]'); return Array.isArray(l) ? l : []; } catch (e) { return []; } }
  function alreadySent(id) { return readList(SENT_KEY).indexOf(id) !== -1; }
  function markSent(id) {
    try { const l = readList(SENT_KEY); if (l.indexOf(id) === -1) l.push(id); localStorage.setItem(SENT_KEY, JSON.stringify(l.slice(-50))); } catch (e) {}
  }
  function readOutbox() { try { const o = JSON.parse(localStorage.getItem(OUTBOX_KEY) || '{}'); return o && typeof o === 'object' && !Array.isArray(o) ? o : {}; } catch (e) { return {}; } }
  function writeOutbox(o) { try { if (Object.keys(o).length) localStorage.setItem(OUTBOX_KEY, JSON.stringify(o)); else localStorage.removeItem(OUTBOX_KEY); } catch (e) {} }
  function updateEntry(id, fn) { const o = readOutbox(); if (!o[id]) return; fn(o[id]); if (o[id].ga && (o[id].px || !pixelConfigured)) delete o[id]; writeOutbox(o); }
  // Google's tag library has actually loaded and set up our property (not just our queue stub).
  function gaLibReady() { try { return !!(window.google_tag_manager && window.google_tag_manager[cfg.GA_MEASUREMENT_ID]); } catch (e) { return false; } }
  const inFlight = {}; // this page view: GA sends waiting for their callback

  function buildPurchase(s) {
    const id = String(s.transaction_id);
    const currency = String(s.currency || '').toUpperCase();
    const value = Math.round((Number(s.value) || 0) * 100) / 100;
    const items = (s.items || []).map(function (i) {
      const it = { item_id: String(i.item_id || 'story').slice(0, 100), item_name: String(i.item_name || i.item_id || 'Story').slice(0, 100), item_category: 'Personalised storybook', quantity: Number(i.quantity) > 0 ? Number(i.quantity) : 1 };
      if (Number.isFinite(Number(i.price)) && i.price !== null && i.price !== '') it.price = Math.round(Number(i.price) * 100) / 100;
      const v = [i.book_language, i.age_edition].filter(Boolean).join(' / '); if (v) it.item_variant = v;
      return it;
    });
    if (s.kind === 'complimentary' || !(value > 0)) {
      // Creator / gift / AED 0 order: never a purchase, never a Google Ads conversion.
      return { ev: 'complimentary_order_complete', p: { order_id: id, creator_code: s.coupon ? String(s.coupon) : '', value: 0, currency: currency || 'AED', story_name: items.map(function (i) { return i.item_name; }).join(', ').slice(0, 100) } };
    }
    if (!/^[A-Z]{3}$/.test(currency)) return null; // never guess the currency of real money
    const p = { transaction_id: id, value: value, currency: currency, shipping: Math.min(value, Math.max(0, Number(s.shipping) || 0)), items: items };
    if (s.coupon) p.coupon = String(s.coupon).slice(0, 100);
    if (s.payment_method) p.payment_method = String(s.payment_method).slice(0, 40);
    return { ev: 'purchase', p: p };
  }

  function flushPurchases() {
    if (untracked) return;
    const o = readOutbox(); let changed = false; const now = Date.now();
    Object.keys(o).forEach(function (id) {
      const e = o[id];
      if (!e || !e.ev || !e.p || now - (e.ts || 0) > OUTBOX_TTL) { delete o[id]; changed = true; return; }
      if (!e.ga && alreadySent(id)) { e.ga = 1; changed = true; }
      // GA4: needs the real Google tag; marked sent only from GA's callback.
      if (!e.ga && !inFlight[id] && gaLoaded && window.gtag) { // sent cookieless until consent (Consent Mode)
        inFlight[id] = true;
        const params = Object.assign({}, e.p, {
          transport_type: 'beacon', event_timeout: 4000,
          event_callback: function () {
            delete inFlight[id];
            if (gaLibReady()) { markSent(id); updateEntry(id, function (x) { x.ga = 1; }); }
          },
        });
        window.gtag('event', e.ev, params);
      }
      // Meta Pixel: marketing consent only; the order number is the event id shared with the Conversions API.
      if (!e.px && pixelLoaded && window.fbq && hasConsent('marketing')) {
        if (e.ev === 'purchase') window.fbq('track', 'Purchase', { value: e.p.value, currency: e.p.currency, content_type: 'product', content_ids: e.p.items.map(function (i) { return i.item_id; }), num_items: e.p.items.length }, { eventID: id });
        else window.fbq('trackCustom', e.ev, e.p, { eventID: id });
        e.px = 1; changed = true;
      }
      if (e.ga && (e.px || !pixelConfigured)) { delete o[id]; changed = true; }
    });
    if (changed) writeOutbox(o);
  }

  window.hikayaTrackPurchase = function (s) {
    if (untracked || !s || !s.transaction_id || !ORDER_RE.test(String(s.transaction_id))) return false;
    const id = String(s.transaction_id);
    if (s.kind === 'none') return false;                         // sandbox / owner test order: nothing at all
    if (s.kind === 'purchase' && s.confirmed !== true) return false; // a paid purchase must come from our server
    const o = readOutbox();
    if (!o[id] && !alreadySent(id)) {
      const built = buildPurchase(s);
      if (!built) return false;
      o[id] = { ev: built.ev, p: built.p, ts: Date.now(), ga: 0, px: 0 };
      writeOutbox(o);
      // Cookie-free counter and Clarity: once per order, when it is first confirmed on this device.
      countEvent(built.ev === 'purchase' ? 'purchase' : 'complimentary_order_complete', { value: built.p.value });
      if (clarityLoaded && window.clarity) window.clarity('event', built.ev);
    }
    flushPurchases();
    return true;
  };
  window.hikayaFlushPurchases = flushPurchases;

  function watchWizardSteps() {
    let last = '';
    function check() {
      const active = document.querySelector('.wizard-step.active[data-step]');
      const step = active && active.getAttribute('data-step');
      if (step && step !== last) {
        last = step;
        window.hikayaTrackEvent('personalize_step', { step: step });
        if (window.clarity) window.clarity('event', 'personalize_' + step);
      }
    }
    check();
    document.querySelectorAll('.wizard-step[data-step]').forEach(function (el) {
      new MutationObserver(check).observe(el, { attributes: true, attributeFilter: ['class'] });
    });
  }

  function loadPixel() {
    if (pixelLoaded || !pixelConfigured || !hasConsent('marketing')) return;
    pixelLoaded = true;
    /* eslint-disable */
    (function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = true; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    // Ad click id saved on landing (the address bar no longer has fbclid): give it to the Pixel.
    try {
      const a = readAttr();
      const fbc = (a && a.last && a.last.fbc) || (a && a.first && a.first.fbc);
      if (fbc && !cookie('_fbc')) document.cookie = '_fbc=' + encodeURIComponent(fbc) + '; path=/; max-age=' + 90 * 86400 + '; SameSite=Lax; Secure';
    } catch (e) {}
    window.fbq('init', cfg.META_PIXEL_ID);
    window.fbq('track', 'PageView');
    /* eslint-enable */
  }

  /* Cookie-free visitor counter (netlify/functions/visit.js). Counts every
     visitor, consent or not, because nothing here identifies anyone: no
     cookies, nothing stored on the device, and the server only keeps an
     anonymous daily hash. Page views + shop steps only. */
  const COUNTED = { pageview: 1, view_item: 1, personalize_step: 1, add_to_cart: 1, view_cart: 1, begin_checkout: 1, purchase: 1, whatsapp_click: 1, newsletter_signup: 1 };
  let noCount = false;
  try { noCount = localStorage.getItem('hikaya_nocount') === '1'; } catch (e) {}
  function countEvent(name, params) {
    if (untracked || noCount || !COUNTED[name] || /^\/test/.test(location.pathname)) return; // staging copies are not real visitors
    params = params || {};
    let q = null; try { q = new URLSearchParams(location.search); } catch (e) {}
    const body = JSON.stringify({
      e: name,
      p: location.pathname,
      r: document.referrer || '',
      us: q && q.get('utm_source'), um: q && q.get('utm_medium'), uc: q && q.get('utm_campaign'),
      ck: !!(q && (q.get('fbclid') || q.get('gclid'))),
      l: (document.documentElement.lang || '').slice(0, 5),
      s: params.step || null, st: params.story || null, v: params.value != null ? params.value : null,
    });
    try {
      if (navigator.sendBeacon && navigator.sendBeacon('/.netlify/functions/visit', new Blob([body], { type: 'text/plain' }))) return;
    } catch (e) {}
    try { fetch('/.netlify/functions/visit', { method: 'POST', body: body, keepalive: true, headers: { 'Content-Type': 'text/plain' } }).catch(function () {}); } catch (e) {}
  }
  countEvent('pageview');

  /* ---------- Where this customer came from (Oct 2026) ----------
     Remembers, on this device only, how the visitor first found us and how
     they arrived most recently: the tagged link / ad / post (utm_* or our own
     short link code "hk"), the site that sent them, and the page they landed
     on. Checkout sends it with the order so the dashboard can show
     "Order HK-123 came from: Instagram, Eid reel".
     No names, emails or anything personal; kept 90 days. The tags are then
     removed from the address bar so links look clean. */
  const ATTR_KEY = 'hikaya_attr_v1';
  const ATTR_DAYS = 90;
  const TRACK_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_id', 'hk', 'fbclid', 'gclid', 'ttclid', 'igshid'];
  const landingHref = location.href;
  /* Payment providers and sign-in pages send shoppers back to us; they are never a traffic source.
     (Also add these as "unwanted referrals" in GA4: Admin > Data streams > Configure tag settings.) */
  const PAY_HOSTS = /(^|\.)(tabby\.ai|tabby\.sa|tamara\.co|ziina\.com|paytabs\.com|supabase\.co|accounts\.google\.com|checkout\.stripe\.com)$/i;
  function isPaymentReturn() {
    try {
      const q = new URLSearchParams(location.search);
      if (q.get('order') && (q.has('ziina') || q.has('tabby') || q.has('tamara'))) return true;
      return !!document.referrer && PAY_HOSTS.test(new URL(document.referrer).hostname);
    } catch (e) { return false; }
  }
  // Ad / campaign tags seen on landing, kept for this tab in case cookies are accepted on a later page.
  try {
    const lq = new URLSearchParams(location.search), keep = new URLSearchParams();
    ['gclid', 'gbraid', 'wbraid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_id'].forEach(function (k) { if (lq.get(k)) keep.set(k, lq.get(k).slice(0, 200)); });
    if (keep.toString()) sessionStorage.setItem('hk_ga_campaign', keep.toString());
  } catch (e) {}
  const clip = (v, n) => (v == null || v === '' ? null : String(v).slice(0, n || 120));
  function readAttr() {
    try {
      const a = JSON.parse(localStorage.getItem(ATTR_KEY) || 'null');
      if (a && a.first && Date.now() - (a.first.ts || 0) < ATTR_DAYS * 864e5) return a;
    } catch (e) {}
    return null;
  }
  (function captureTouch() {
    if (untracked || /^\/test/.test(location.pathname)) return;
    let q; try { q = new URLSearchParams(location.search); } catch (e) { return; }
    let refHost = null;
    try { if (document.referrer) refHost = new URL(document.referrer).hostname.toLowerCase(); } catch (e) {}
    const external = refHost && !/(^|\.)maison-jaber\.com$|netlify\.app$/.test(refHost) && !PAY_HOSTS.test(refHost);
    const tagged = TRACK_PARAMS.some(function (k) { return q.get(k); });
    const prev = readAttr();
    if (!tagged && !external && prev) return; // moving around the site, or a plain return visit
    const fbclid = q.get('fbclid');
    const touch = {
      src: clip(q.get('utm_source'), 60), med: clip(q.get('utm_medium'), 60), cmp: clip(q.get('utm_campaign')),
      cnt: clip(q.get('utm_content')), trm: clip(q.get('utm_term')), hk: clip(q.get('hk'), 40),
      rh: external ? clip(refHost) : null, lp: clip(location.pathname + (q.get('s') ? '?s=' + q.get('s') : ''), 160),
      clk: fbclid ? 'meta' : q.get('gclid') ? 'google' : q.get('ttclid') ? 'tiktok' : null,
      fbc: fbclid ? 'fb.1.' + Date.now() + '.' + clip(fbclid, 500) : null,
      ts: Date.now(),
    };
    const next = { first: prev ? prev.first : touch, last: touch, n: ((prev && prev.n) || 0) + 1 };
    try { localStorage.setItem(ATTR_KEY, JSON.stringify(next)); } catch (e) {}
  })();
  // Clean the address bar (the visit counter above has already read the tags).
  (function stripTags() {
    try {
      const u = new URL(location.href);
      let changed = false;
      TRACK_PARAMS.forEach(function (k) { if (u.searchParams.has(k)) { u.searchParams.delete(k); changed = true; } });
      if (changed) history.replaceState(history.state, '', u.pathname + (u.searchParams.toString() ? '?' + u.searchParams.toString() : '') + u.hash);
    } catch (e) {}
  })();

  function cookie(name) {
    const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }
  /* What checkout sends with the order. Clarity's visitor/session ids let the
     dashboard open this customer's recording; Meta's ids (fbc/fbp) are only
     included when the visitor accepted marketing cookies. */
  window.hikayaAttribution = function () {
    const a = readAttr() || {};
    const mk = hasConsent('marketing');
    const strip = function (t) { if (!t) return null; const c = Object.assign({}, t); if (!mk) delete c.fbc; return c; };
    const clck = (cookie('_clck') || '').split('|')[0] || null;
    const clsk = (cookie('_clsk') || '').split('|')[0] || null;
    return {
      first: strip(a.first), last: strip(a.last), visits: a.n || null,
      clarity: clck && clsk ? { u: clip(clck, 40), s: clip(clsk, 40) } : null,
      fbp: mk ? clip(cookie('_fbp'), 120) : null,
      marketing: mk, lang: (document.documentElement.lang || '').slice(0, 5),
    };
  };
  // Tags this visit's Clarity recording with the order, so it can be found from the dashboard.
  window.hikayaTagOrder = function (orderNumber) {
    if (!orderNumber) return;
    try { sessionStorage.setItem('hk_clarity_order', String(orderNumber)); } catch (e) {}
    if (window.clarity) {
      window.clarity('set', 'order_number', String(orderNumber));
      window.clarity('upgrade', 'order'); // keep this recording in full
    }
  };

  function tryLoadAll() {
    if (untracked) return;
    loadClarity();
    loadGA();
    updateGoogleConsent(); // a choice made on this page goes to Google straight away
    loadPixel();
    flushPurchases(); // confirmed orders not yet delivered (refresh, revisit, cookies accepted later)
  }

  document.addEventListener('DOMContentLoaded', function () {
    tryLoadAll();
    if (!untracked) firePageEvents(); // shop steps are counted with or without cookie consent
  });
  // Consent granted later in the same visit (e.g. via the banner, or
  // reopening Cookie Settings) should start tracking immediately, not
  // require a page reload.
  document.addEventListener('hikaya:consentchange', tryLoadAll);

  // Single entry point the rest of the site calls -- fires to whichever
  // of GA / Pixel are actually configured AND consented to; silently
  // no-ops otherwise.
  // Usage: window.hikayaTrackEvent('begin_checkout', { value: 149, currency: 'AED' })
  window.hikayaTrackEvent = function (eventName, params) {
    if (eventName === 'purchase' || eventName === 'complimentary_order_complete') return; // only via hikayaTrackPurchase
    params = Object.assign({}, params || {});
    // Optional id shared with the server (Meta Conversions API), so a purchase is never counted twice.
    const eventId = params.event_id || null;
    delete params.event_id;
    countEvent(eventName, params);
    if (gaLoaded && window.gtag) window.gtag('event', eventName, params);
    else if (earlyEvents.length < 30) earlyEvents.push([eventName, params]);
    if (clarityLoaded && window.clarity) window.clarity('event', eventName);
    if (pixelLoaded && window.fbq) {
      // Meta uses its own standard-event names for the common ones; fall
      // back to a custom event for anything else.
      const metaEventMap = {
        begin_checkout: 'InitiateCheckout',
        purchase: 'Purchase',
        add_to_cart: 'AddToCart',
        view_item: 'ViewContent',
        sign_up: 'CompleteRegistration',
      };
      const metaName = metaEventMap[eventName];
      const opts = eventId ? { eventID: String(eventId) } : undefined;
      if (metaName) window.fbq('track', metaName, params, opts);
      else window.fbq('trackCustom', eventName, params, opts);
    }
  };
})();
