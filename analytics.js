/* Hikaya by Maison Jaber — shared analytics loader.
   Include with: <script src="/analytics.js" defer></script>

   SETUP (one-time):
     1. Create a GA4 property at analytics.google.com, get your Measurement
        ID (looks like "G-XXXXXXXXXX").
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
*/

window.HIKAYA_ANALYTICS_CONFIG = {
  GA_MEASUREMENT_ID: 'G-XXXXXXXXXX',   // <-- replace with your real GA4 ID
  META_PIXEL_ID: '000000000000000',    // <-- replace with your real Pixel ID
};

(function () {
  const cfg = window.HIKAYA_ANALYTICS_CONFIG;
  const gaReady = cfg.GA_MEASUREMENT_ID && cfg.GA_MEASUREMENT_ID !== 'G-XXXXXXXXXX';
  const pixelReady = cfg.META_PIXEL_ID && cfg.META_PIXEL_ID !== '000000000000000';

  if (gaReady) {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${cfg.GA_MEASUREMENT_ID}`;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', cfg.GA_MEASUREMENT_ID);
  }

  if (pixelReady) {
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

  // Single entry point the rest of the site calls -- fires to whichever
  // of GA / Pixel are actually configured, silently no-ops otherwise.
  // Usage: window.hikayaTrackEvent('begin_checkout', { value: 34.90, currency: 'EUR' })
  window.hikayaTrackEvent = function (eventName, params) {
    params = params || {};
    if (gaReady && window.gtag) window.gtag('event', eventName, params);
    if (pixelReady && window.fbq) {
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
