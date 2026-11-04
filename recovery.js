/* Hikaya by Maison Jaber — saved-order recovery + bundle measurement (Nov 2026).
   Include AFTER analytics.js and cart.js on personalize, cart and checkout:
     <script src="/recovery.js" defer></script>

   1. cart.html?resume=<token> (the private link in the one reminder email): asks the server for the
      saved cart and puts it back in this browser's cart, on any device. The token is kept for this
      tab only (sessionStorage) so the purchase can be counted as recovered; nothing personal is stored.
   2. Measurement (no names, emails or photos in any event):
        recovery_link_click, recovery_resumed, recovery_purchase
        bundle_cta_click (homepage section), bundle_add_book (2nd / 3rd book added), bundle_purchase */
(function () {
  var REC_KEY = 'hk_recovery_token', MSG_KEY = 'hk_recovery_msg', COUNT_KEY = 'hk_cart_n';
  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { return null; } }
  function track(name, params) { if (window.hikayaTrackEvent) window.hikayaTrackEvent(name, params || {}); }
  function t(k, f) { return (window.hikayaT && window.hikayaT(k)) || f; }
  var page = (location.pathname.split('/').pop() || '').toLowerCase();

  /* ---- Wrap the shared tracker once: purchase / add_to_cart also fire the recovery & bundle events ---- */
  function wrap() {
    var orig = window.hikayaTrackEvent;
    if (!orig || orig.__hkRec) return;
    var wrapped = function (name, params) {
      orig.apply(this, arguments);
      try {
        if (name === 'add_to_cart' && window.hikayaCart) {
          var n = window.hikayaCart.getCart().length;
          if (n >= 2) orig('bundle_add_book', { position: n, tier: n >= 3 ? '15' : '10' });
        }
        if (name === 'purchase') {
          var count = Number(ss(COUNT_KEY)) || (window.hikayaCart ? window.hikayaCart.getCart().length : 0);
          var p = params || {};
          if (count >= 2) orig('bundle_purchase', { items: count, value: p.value, currency: p.currency, transaction_id: p.transaction_id });
          var tok = ss(REC_KEY);
          if (tok) {
            orig('recovery_purchase', { value: p.value, currency: p.currency, transaction_id: p.transaction_id });
            fetch('/.netlify/functions/complete-cart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resumeToken: tok }), keepalive: true }).catch(function () {});
            ss(REC_KEY, null);
          }
        }
      } catch (e) { /* measurement must never break checkout */ }
    };
    wrapped.__hkRec = true;
    window.hikayaTrackEvent = wrapped;
  }
  wrap();

  // Checkout: remember how many books are being paid for, so the purchase can be counted as a
  // bundle after the payment page (Ziina / Tabby / Tamara) sends the shopper back.
  if (page === 'checkout.html' && window.hikayaCart) {
    var n = window.hikayaCart.getCart().length;
    if (n) ss(COUNT_KEY, String(n));
  }

  /* ---- Homepage / anywhere: sibling CTA clicks ---- */
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('[data-bundle-cta]');
    if (a) track('bundle_cta_click', { placement: a.getAttribute('data-bundle-cta') || 'home' });
  });

  /* ---- cart.html: restore a saved order from the reminder link ---- */
  function banner(msg, kind) {
    var main = document.querySelector('main') || document.body;
    var b = document.getElementById('hk-recovery-banner');
    if (!b) {
      b = document.createElement('div'); b.id = 'hk-recovery-banner'; b.setAttribute('role', 'status');
      b.style.cssText = 'max-width:760px;margin:16px auto 0;padding:12px 16px;border-radius:12px;font-size:14px;line-height:1.5;'
        + 'background:#F3EADF;border:1px solid #E3D3BF;color:#261C17;text-align:center;';
      main.insertBefore(b, main.firstChild);
    }
    if (kind === 'warn') { b.style.background = '#FBF3E8'; b.style.borderColor = '#E7C9A0'; }
    b.textContent = msg;
  }

  if (page === 'cart.html') {
    // analytics.js moves the token out of the address bar first (so no analytics tool ever sees it).
    var q; try { q = new URLSearchParams(location.search); } catch (e) { q = null; }
    var token = ss('hk_resume_pending') || (q && q.get('resume'));
    if (token) ss('hk_resume_pending', null);
    var shown = ss(MSG_KEY);
    if (shown) { ss(MSG_KEY, null); document.addEventListener('DOMContentLoaded', function () { banner(t('rec.restored', 'Welcome back! Your saved order is in your cart, ready to finish.')); }); }
    if (token && /^[A-Za-z0-9_-]{40,60}$/.test(token)) {
      track('recovery_link_click', {});
      document.addEventListener('DOMContentLoaded', function () { banner(t('rec.restoring', 'Bringing back your saved order…')); });
      fetch('/.netlify/functions/resume-cart?t=' + encodeURIComponent(token), { cache: 'no-store' })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (d.status !== 'ok' || !Array.isArray(d.items) || !window.hikayaCart) {
            var key = d.status === 'expired' ? 'rec.expired' : d.status === 'completed' ? 'rec.completed' : 'rec.not_found';
            var fb = { 'rec.expired': 'This link has expired, so the saved order is no longer available.', 'rec.completed': 'This order has already been placed.', 'rec.not_found': "We couldn't find that saved order." };
            var show = function () { banner(t(key, fb[key]), 'warn'); };
            if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show); else show();
            return;
          }
          var have = {};
          window.hikayaCart.getCart().forEach(function (i) { have[i.id] = 1; });
          d.items.forEach(function (i) { if (!i.id || !have[i.id]) window.hikayaCart.addToCart(i); });
          try { if (d.lang && localStorage.getItem('hikaya_lang') !== d.lang) localStorage.setItem('hikaya_lang', d.lang); } catch (e) {}
          try { if (d.country && window.HIKAYA_REGIONS && window.HIKAYA_REGIONS[d.country]) localStorage.setItem('hikaya_region', d.country); } catch (e) {}
          ss(REC_KEY, token);
          ss(MSG_KEY, '1');
          track('recovery_resumed', { items: d.items.length });
          // Reload without the token so the cart renders the restored books in the right language and currency.
          setTimeout(function () { location.replace(location.pathname); }, 150);
        })
        .catch(function () { banner(t('rec.not_found', "We couldn't find that saved order."), 'warn'); });
    }
  }
})();
