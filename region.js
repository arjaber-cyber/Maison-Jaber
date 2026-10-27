/* Hikaya by Maison Jaber — shared region & pricing system.
   Include with: <script src="/region.js" defer></script>
   Provides the GCC country picker (UAE, KSA, Qatar, Kuwait, Bahrain, Oman),
   auto-detects via IP by default, and exposes helpers
   any page can use to show the right currency and price.

   Pricing is FIXED here (not a live FX feed) — update it every month or so
   as needed. This is the single source of truth; checkout.html and every
   other page should read prices from here rather than hardcoding their own.
*/

/* DELIVERY (Oct 2026 launch): UAE free; every other GCC country pays roughly
   AED 30, rounded to a clean local amount (KWD 2.5, BHD 3, OMR 3)
   (AED 30 at the AED rates below; KSA/Qatar use the same number, 30). 2+ book bundles still ship free (cart.js). */
/* Ziina charges in AED: local price x rate (keep in sync with netlify/functions/_pricing.js). */
window.HIKAYA_AED_RATES = { AED: 1, SAR: 0.97933, QAR: 1.00893, BHD: 9.76729, OMR: 9.55137, KWD: 11.95 };
window.HIKAYA_REGIONS = {
  UAE:      { zone: 'GCC', countryCodes: ['AE'], currency: 'AED', symbol: 'AED', bookWas: 199, bookNow: 169, deliveryFee: 0, methods: ['ziina'], label: 'United Arab Emirates', shortLabel: 'UAE' },
  Saudi:    { zone: 'GCC', countryCodes: ['SA'], currency: 'SAR', symbol: 'SAR', bookWas: 199, bookNow: 169, deliveryFee: 30, methods: ['ziina'], label: 'Saudi Arabia', shortLabel: 'KSA' },
  Qatar:    { zone: 'GCC', countryCodes: ['QA'], currency: 'QAR', symbol: 'QAR', bookWas: 199, bookNow: 169, deliveryFee: 30, methods: ['ziina'], label: 'Qatar', shortLabel: 'Qatar' },
  Kuwait:   { zone: 'GCC', countryCodes: ['KW'], currency: 'KWD', symbol: 'KWD', bookWas: 16.75, bookNow: 14.25, deliveryFee: 2.5, methods: ['ziina'], label: 'Kuwait', shortLabel: 'Kuwait' },
  Bahrain:  { zone: 'GCC', countryCodes: ['BH'], currency: 'BHD', symbol: 'BHD', bookWas: 20.5, bookNow: 17.25, deliveryFee: 3, methods: ['ziina'], label: 'Bahrain', shortLabel: 'Bahrain' },
  Oman:     { zone: 'GCC', countryCodes: ['OM'], currency: 'OMR', symbol: 'OMR', bookWas: 21, bookNow: 17.75, deliveryFee: 3, methods: ['ziina'], label: 'Oman', shortLabel: 'Oman' }
};
/* ---------------- Tabby (Pay later, UAE / AED only) ----------------
   Public key + merchant code only (safe in the browser; the secret key lives in Netlify).
   Hidden from customers until go-live: open any page with ?tabbytest=1 to see it (remembered in that browser; ?tabbytest=0 turns it off).
   GO LIVE: put the live pk_ key below and set HIKAYA_TABBY_LIVE = true (and the live sk_ key in Netlify). */
window.HIKAYA_TABBY_LIVE = false;
window.HIKAYA_TABBY = { publicKey: 'pk_test_01a15f1b-953b-9caa-ed99-07a93db262d2', merchantCode: 'MJAE' };
/* ?tabbytest=1 switches test mode on for this browser (kept across tabs and sign-ins); ?tabbytest=0 switches it off. */
window.hikayaTabbyOn = function () {
  try {
    var q = new URLSearchParams(location.search).get('tabbytest');
    if (q === '1') localStorage.setItem('hk_tabby_test', '1');
    if (q === '0') localStorage.removeItem('hk_tabby_test');
    return window.HIKAYA_TABBY_LIVE === true || localStorage.getItem('hk_tabby_test') === '1' || sessionStorage.getItem('hk_tabby_test') === '1';
  } catch (e) { return window.HIKAYA_TABBY_LIVE === true; }
};
/* Mounts Tabby's own snippet: kind 'promo' (product / cart, source 'product'|'cart') or 'card' (checkout).
   Re-call with the new price whenever it changes (Tabby's documented way to update). Does nothing outside the UAE. */
(function () {
  var loading = {};
  function load(src) {
    if (!loading[src]) loading[src] = new Promise(function (ok, bad) {
      var s = document.createElement('script'); s.src = src; s.async = true; s.onload = ok; s.onerror = bad; document.head.appendChild(s);
    });
    return loading[src];
  }
  window.hikayaTabbyWidget = function (kind, selector, price, source) {
    var el = document.querySelector(selector);
    if (!el) return;
    var card = kind === 'card'; // checkout decides itself (it only offers Tabby for UAE delivery)
    var region = window.hikayaRegion ? window.hikayaRegion() : null;
    var aed = card || !region || region.currency === 'AED';
    if (!window.hikayaTabbyOn() || !aed || !(Number(price) > 0)) { el.hidden = true; el.innerHTML = ''; return; }
    el.hidden = false;
    var lang = (window.hikayaLang && window.hikayaLang() === 'ar') ? 'ar' : 'en';
    load(card ? 'https://checkout.tabby.ai/tabby-card.js' : 'https://checkout.tabby.ai/tabby-promo.js').then(function () {
      var opts = { selector: selector, currency: 'AED', price: Number(price).toFixed(2), lang: lang, shouldInheritBg: false,
        publicKey: window.HIKAYA_TABBY.publicKey, merchantCode: window.HIKAYA_TABBY.merchantCode };
      if (!card) opts.source = source === 'cart' ? 'cart' : 'product';
      // Swap in a fresh, empty box each time: Tabby's widget does not re-render into a box it has
      // already used (e.g. after switching EN <-> AR or a cart change it stayed blank).
      try {
        var cur = document.querySelector(selector);
        if (!cur) return;
        var fresh = cur.cloneNode(false);
        fresh.hidden = false;
        cur.parentNode.replaceChild(fresh, cur);
        card ? new window.TabbyCard(opts) : new window.TabbyPromo(opts);
      } catch (e) { var x = document.querySelector(selector); if (x) x.hidden = true; }
    }).catch(function () { el.hidden = true; });
  };
})();

/* ---------------- Tamara (Pay later, UAE / AED only) ----------------
   Public key only (safe in the browser; the API + notification tokens live in Netlify).
   Hidden from customers until go-live: open any page with ?tamaratest=1 to see it (remembered in that browser; ?tamaratest=0 turns it off).
   GO LIVE: put the production public key below, set HIKAYA_TAMARA_LIVE = true, and in Netlify set
   TAMARA_API_TOKEN + TAMARA_NOTIFICATION_TOKEN to the live values and TAMARA_API_URL = https://api.tamara.co
   (then run /tamara-setup.html once to register the live webhook). */
window.HIKAYA_TAMARA_LIVE = false;
window.HIKAYA_TAMARA = { publicKey: 'fada631c-d07f-453a-8616-94def2f6335b' }; // sandbox public key
window.hikayaTamaraOn = function () {
  try {
    var q = new URLSearchParams(location.search).get('tamaratest');
    if (q === '1') localStorage.setItem('hk_tamara_test', '1');
    if (q === '0') localStorage.removeItem('hk_tamara_test');
    return window.HIKAYA_TAMARA_LIVE === true || localStorage.getItem('hk_tamara_test') === '1';
  } catch (e) { return window.HIKAYA_TAMARA_LIVE === true; }
};
/* Mounts Tamara's own promo widget (official logo, "Pay AED x/mo or in 4 payments. No late fees. More options")
   under a price. Re-call with the new price whenever it changes. Does nothing outside the UAE. */
(function () {
  var loaded = null;
  function inject(src) {
    return new Promise(function (ok, bad) {
      var s = document.createElement('script'); s.async = true; s.onload = ok; s.onerror = bad; s.src = src;
      document.head.appendChild(s);
    });
  }
  function load() {
    // Sandbox script first while testing; if that address doesn't load, the main script (it reads the key's environment).
    if (!loaded) loaded = (window.HIKAYA_TAMARA_LIVE === true
      ? inject('https://cdn.tamara.co/widget-v2/tamara-widget.js')
      : inject('https://cdn-sandbox.tamara.co/widget-v2/tamara-widget.js').catch(function () { return inject('https://cdn.tamara.co/widget-v2/tamara-widget.js'); }));
    return loaded;
  }
  /* Tamara's official UAE wording, used only if their widget doesn't render (plan amount = price / 4, whole dirhams). */
  function fallback(el, price, lang) {
    var per = Math.round(Number(price) / 4);
    el.innerHTML = '<div class="tamara-fallback" style="display:flex;align-items:center;justify-content:space-between;gap:16px;border:1px solid #e5ddd0;border-radius:10px;padding:14px 16px;background:#fff;font-size:15px;line-height:1.45;color:#2E2018">'
      + '<span>' + (lang === 'ar'
        ? 'ادفع ' + per + ' درهم شهريًا أو على 4 دفعات، بدون رسوم تأخير'
        : 'Pay AED ' + per + '/mo or in 4 payments. No late fees.') + '</span>'
      + '<strong style="font-size:16px;white-space:nowrap">' + (lang === 'ar' ? 'تمارا' : 'Tamara') + '</strong></div>';
  }
  window.hikayaTamaraWidget = function (selector, price, opts) {
    var el = document.querySelector(selector);
    if (!el) return;
    var region = window.hikayaRegion ? window.hikayaRegion() : null;
    var aed = (opts && opts.checkout) || !region || region.currency === 'AED';
    if (!window.hikayaTamaraOn() || !aed || !(Number(price) > 0)) { el.hidden = true; el.innerHTML = ''; return; }
    var lang = (window.hikayaLang && window.hikayaLang() === 'ar') ? 'ar' : 'en';
    /* Config must exist before the script runs; refreshed on every call so EN <-> AR switches carry over. */
    window.tamaraWidgetConfig = { lang: lang, country: 'AE', currency: 'AED', publicKey: window.HIKAYA_TAMARA.publicKey,
      css: ':host{--font-primary:inherit !important;--font-secondary:inherit !important;}' };
    el.hidden = false;
    el.innerHTML = '';
    var w = document.createElement('tamara-widget');
    w.setAttribute('type', 'tamara-summary');
    w.setAttribute('amount', String(Math.round(Number(price) * 100) / 100));
    w.setAttribute('inline-type', '2');
    w.setAttribute('config', '{"badgePosition":"' + (lang === 'ar' ? 'left' : 'right') + '","showExtraContent":""}');
    el.appendChild(w);
    var rendered = function () {
      var x = el.querySelector('tamara-widget');
      return !!(x && ((x.shadowRoot && x.shadowRoot.childNodes.length) || x.children.length || x.offsetHeight > 8));
    };
    load().then(function () {
      try { if (window.TamaraWidgetV2 && window.TamaraWidgetV2.refresh) window.TamaraWidgetV2.refresh(); } catch (e) {}
    }).catch(function () {}).then(function () {
      setTimeout(function () { if (el.isConnected && !rendered()) fallback(el, price, lang); }, 4000);
    });
  };
})();

// GCC-only launch: visitors outside the GCC default to UAE (AED) pricing.
/* QA 19 Oct 2026 (currency): the payment gateway (Ziina) always charges in AED. For non-AED regions,
   every order summary shows the exact AED amount that will be charged, worked out with the same
   rates and rounding as the server (netlify/functions/_pricing.js: round2(total x rate)). */
window.hikayaChargedAed = function (total, region) {
  const rate = (window.HIKAYA_AED_RATES || {})[region && region.currency] || 1;
  const t2 = Math.round(Number(total) * 100) / 100; // the server rounds the local total first, then converts
  return Math.round(t2 * rate * 100) / 100;
};
window.hikayaAedHtml = function (total, region) {
  if (!region || region.currency === 'AED') return '';
  const tr = (k, f) => (window.hikayaT && window.hikayaT(k)) || f;
  const aed = window.hikayaChargedAed(total, region);
  const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  return '<div class="pay-aed"><span>' + esc(tr('lx.pay_aed', 'Charged in AED')) + '</span><span dir="ltr">AED ' + aed.toFixed(2) + '</span></div>'
    + '<p class="pay-aed-note">' + esc(tr('lx.pay_aed_note', 'Prices are shown in {cur}. Our payment partner charges the equivalent in UAE dirhams (AED); your bank may show a small conversion fee.').replace('{cur}', region.currency)) + '</p>';
};

(function () {
  const REGION_KEY = 'hikaya_region';
  function getStoredRegionKey() {
    return localStorage.getItem(REGION_KEY);
  }
  function setStoredRegionKey(key) {
    localStorage.setItem(REGION_KEY, key);
  }

  function regionKeyForCountryCode(code) {
    code = (code || '').toUpperCase();
    for (const key in window.HIKAYA_REGIONS) {
      if (window.HIKAYA_REGIONS[key].countryCodes.includes(code)) return key;
    }
    return 'UAE'; // GCC-only launch: non-GCC visitors default to UAE pricing
  }

  function currentRegionKey() {
    const k = getStoredRegionKey();
    // GCC-only launch: any stored pick that is not a GCC country falls back to the UAE.
    return (k && window.HIKAYA_REGIONS[k] && window.HIKAYA_REGIONS[k].zone === 'GCC') ? k : 'UAE';
  }
  function currentRegion() {
    return window.HIKAYA_REGIONS[currentRegionKey()];
  }
  function currentZone() {
    return currentRegion().zone;
  }

  /* One price format everywhere: currency code first, no decimals for whole amounts ("AED 169", "KWD 14.25"). */
  function fmtPrice(amount, region) {
    region = region || currentRegion();
    const n = Number(amount) || 0;
    const num = Math.abs(n - Math.round(n)) < 0.005 ? String(Math.round(n)) : n.toFixed(2);
    return `${region.symbol} ${num}`;
  }

  // Returns an HTML snippet: struck-through "was" price + bold "now" price,
  // or just the price alone if there's no discount for this region.
  function priceHtml(region) {
    region = region || currentRegion();
    if (region.bookWas > region.bookNow) {
      return `<bdi class="was-price" style="text-decoration:line-through; color:#6B5A4E; margin-inline-end:6px;">${fmtPrice(region.bookWas, region)}</bdi><strong><bdi>${fmtPrice(region.bookNow, region)}</bdi></strong>`;
    }
    return `<strong><bdi>${fmtPrice(region.bookNow, region)}</bdi></strong>`;
  }

  async function detectAndApplyRegion() {
    // Manual picks always win over IP detection.
    if (getStoredRegionKey()) { applyToPage(); return; }
    try {
      const res = await fetch('https://ipapi.co/json/');
      if (!res.ok) return;
      const data = await res.json();
      const key = regionKeyForCountryCode(data.country_code);
      setStoredRegionKey(key);
      applyToPage();
    } catch {
      // No network / blocked — the UAE (AED) default stays in place.
    }
  }

  function pickRegion(regionKey) {
    setStoredRegionKey(regionKey);
    applyToPage();
  }

  // Re-render anything on the page tagged for price/region display.
  function applyToPage() {
    const region = currentRegion();
    document.querySelectorAll('[data-hikaya-price]').forEach(el => {
      el.innerHTML = priceHtml(region);
    });
    document.querySelectorAll('.zone-pill-label').forEach(el => {
      el.textContent = region.shortLabel || region.label;
    });
    document.dispatchEvent(new CustomEvent('hikaya:regionchange', { detail: { regionKey: currentRegionKey(), region } }));
  }

  const ZONE_GROUPS = [
    { zone: 'GCC', label: 'GCC', regions: ['UAE', 'Saudi', 'Qatar', 'Kuwait', 'Bahrain', 'Oman'] },
  ];

  function buildSwitcher() {
    document.querySelectorAll('.zone-pill').forEach(pill => {
      if (pill.dataset.zoneSwitcherBound) return;
      pill.dataset.zoneSwitcherBound = '1';
      pill.style.position = 'relative';

      const label = document.createElement('span');
      label.className = 'zone-pill-label';
      label.textContent = currentRegion().shortLabel || currentRegion().label;
      pill.textContent = '';
      pill.appendChild(label);

      const menu = document.createElement('div');
      menu.className = 'zone-menu';
      menu.style.cssText = 'display:none; position:absolute; top:calc(100% + 8px); right:0; background:#fff; border:1px solid var(--line, #ddd); border-radius:12px; box-shadow:0 8px 24px rgba(0,0,0,0.12); overflow:hidden; z-index:100; min-width:200px; max-height:340px; overflow-y:auto;';

      ZONE_GROUPS.forEach(group => {
        const heading = document.createElement('div');
        heading.textContent = group.label;
        heading.style.cssText = 'padding:10px 16px 4px; font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:#999;';
        menu.appendChild(heading);

        group.regions.forEach(regionKey => {
          const region = window.HIKAYA_REGIONS[regionKey];
          const item = document.createElement('button');
          item.type = 'button';
          item.textContent = region.label;
          item.style.cssText = 'display:block; width:100%; text-align:left; padding:9px 16px; border:none; background:#fff; font-family:inherit; font-size:13px; font-weight:600; cursor:pointer; color:var(--ink,#222);';
          item.addEventListener('mouseenter', () => item.style.background = 'var(--bg-soft,#f7f7f7)');
          item.addEventListener('mouseleave', () => item.style.background = '#fff');
          item.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            pickRegion(regionKey);
            menu.style.display = 'none';
          });
          menu.appendChild(item);
        });
      });
      pill.appendChild(menu);

      pill.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        document.querySelectorAll('.zone-menu').forEach(m => { if (m !== menu) m.style.display = 'none'; });
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
      });
    });
    document.addEventListener('click', (e) => {
      if (e.target.closest && e.target.closest('.zone-pill')) return;
      document.querySelectorAll('.zone-menu').forEach(m => m.style.display = 'none');
    });
  }

  // Converts an AED-denominated fee (e.g. the extra-character upcharge an
  // admin sets on a story) into whichever region's currency is active,
  // using each region's book price as the conversion ratio -- consistent
  // with how all other pricing here is a fixed table, not a live FX feed.
  // Accepts either a region object directly (e.g. from computeCartPricing)
  // or a region key string; falls back to the currently active region.
  function convertFromAed(feeAed, regionOrKey) {
    const region = typeof regionOrKey === 'object' && regionOrKey
      ? regionOrKey
      : window.HIKAYA_REGIONS[regionOrKey || currentRegionKey()];
    const uae = window.HIKAYA_REGIONS.UAE;
    if (!region || !uae || !feeAed) return 0;
    const rate = region.bookNow / uae.bookNow;
    return Math.round(feeAed * rate * 100) / 100;
  }

  window.hikayaRegion = currentRegion;
  window.hikayaPickRegion = pickRegion;
  window.HIKAYA_ZONE_GROUPS = ZONE_GROUPS;
  window.hikayaRegionKey = currentRegionKey;
  window.hikayaZone = currentZone;
  window.hikayaFormatPrice = fmtPrice;
  window.hikayaPriceHtml = priceHtml;
  window.hikayaApplyRegion = applyToPage;
  window.hikayaConvertFromAed = convertFromAed;

  document.addEventListener('DOMContentLoaded', () => {
    buildSwitcher();
    detectAndApplyRegion();
    applyToPage();
  });
})();
