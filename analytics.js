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

   CONSENT: neither GA nor the Meta Pixel loads until the visitor has
   actually granted that specific category via the cookie banner
   (consent.js). If they grant consent after this page already loaded,
   the relevant script loads right then, without needing a refresh.
*/

window.HIKAYA_ANALYTICS_CONFIG = {
  GA_MEASUREMENT_ID: 'G-5L1750Y0YL',   // GA4: Hikaya - maison-jaber.com
  CLARITY_PROJECT_ID: 'yu5qjkitji',    // Microsoft Clarity: Hikaya - maison-jaber.com
  META_PIXEL_ID: '000000000000000',    // <-- replace with your real Pixel ID
};

(function () {
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

  function loadGA() {
    if (gaLoaded || !gaConfigured || !hasConsent('analytics')) return;
    gaLoaded = true;
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${cfg.GA_MEASUREMENT_ID}`;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    // The landing page's own address, with its campaign tags (they are removed from the address bar).
    window.gtag('config', cfg.GA_MEASUREMENT_ID, { page_location: landingHref });
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

  /* Funnel steps, so GA4 can show where shoppers drop off:
     view_item (story page) -> personalize_step (story/details/photo/extra/review)
     -> add_to_cart -> view_cart -> begin_checkout -> purchase.
     add_to_cart and purchase are fired by personalize.html / checkout.html. */
  let pageEventsFired = false;
  function firePageEvents() {
    if (pageEventsFired) return;
    pageEventsFired = true;
    const q = new URLSearchParams(location.search);
    if (page === 'story.html') window.hikayaTrackEvent('view_item', { story: q.get('s') || '' });
    if (page === 'cart.html') window.hikayaTrackEvent('view_cart', {});
    if (page === 'checkout.html' && !q.get('ziina')) window.hikayaTrackEvent('begin_checkout', {});
    if (page === 'personalize.html') watchWizardSteps();
  }

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
    const external = refHost && !/(^|\.)maison-jaber\.com$|netlify\.app$/.test(refHost);
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
    loadPixel();
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
