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
  let pixelLoaded = false;
  let clarityLoaded = false;
  const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  // Internal / personal-document pages are never tracked.
  const untracked = /^(admin|invoice)\.html$/.test(page);

  /* Privacy: anything showing a child's photo or name, or an account's
     personal details, is hidden from Clarity recordings and heatmaps.
     (Clarity also masks every text input by default.) Elements rendered
     later from templates carry data-clarity-mask in the markup itself. */
  const MASK_SELECTORS = [
    '#photo-upload', '#photo-thumbs', '#extra-photo-upload', '#extra-photo-thumbs',
    '#child-name', '#item-meta', '#od-sub', '#od-number',
  ];
  const MASK_WHOLE_PAGE = /^(account|track-order|login)\.html$/.test(page);
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
    window.gtag('config', cfg.GA_MEASUREMENT_ID);
    firePageEvents();
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
    window.fbq('init', cfg.META_PIXEL_ID);
    window.fbq('track', 'PageView');
    /* eslint-enable */
  }

  function tryLoadAll() {
    if (untracked) return;
    loadClarity();
    loadGA();
    loadPixel();
  }

  document.addEventListener('DOMContentLoaded', tryLoadAll);
  // Consent granted later in the same visit (e.g. via the banner, or
  // reopening Cookie Settings) should start tracking immediately, not
  // require a page reload.
  document.addEventListener('hikaya:consentchange', tryLoadAll);

  // Single entry point the rest of the site calls -- fires to whichever
  // of GA / Pixel are actually configured AND consented to; silently
  // no-ops otherwise.
  // Usage: window.hikayaTrackEvent('begin_checkout', { value: 149, currency: 'AED' })
  window.hikayaTrackEvent = function (eventName, params) {
    params = params || {};
    if (gaLoaded && window.gtag) window.gtag('event', eventName, params);
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
      if (metaName) window.fbq('track', metaName, params);
      else window.fbq('trackCustom', eventName, params);
    }
  };
})();
