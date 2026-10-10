/* Hikaya by Maison Jaber — shared region & pricing system.
   Include with: <script src="/region.js" defer></script>
   Provides the GCC country picker (UAE, KSA, Qatar, Kuwait, Bahrain, Oman),
   auto-detects via IP by default, and exposes helpers
   any page can use to show the right currency and price.

   Pricing is FIXED here (not a live FX feed) — update it every month or so
   as needed. This is the single source of truth; checkout.html and every
   other page should read prices from here rather than hardcoding their own.
*/

/* DELIVERY (Oct 2026 launch): UAE free; every other GCC country pays the
   equivalent of AED 30, converted with the same ratio as book prices
   (AED 30 at the AED rates below; KSA/Qatar use the same number, 30). 2+ book bundles still ship free (cart.js). */
/* Ziina charges in AED: local price x rate (keep in sync with netlify/functions/_pricing.js). */
window.HIKAYA_AED_RATES = { AED: 1, SAR: 0.97933, QAR: 1.00893, BHD: 9.76729, OMR: 9.55137, KWD: 11.95 };
window.HIKAYA_REGIONS = {
  UAE:      { zone: 'GCC', countryCodes: ['AE'], currency: 'AED', symbol: 'AED', bookWas: 199, bookNow: 169, deliveryFee: 0, methods: ['ziina'], label: 'United Arab Emirates', shortLabel: 'UAE' },
  Saudi:    { zone: 'GCC', countryCodes: ['SA'], currency: 'SAR', symbol: 'SAR', bookWas: 199, bookNow: 169, deliveryFee: 30, methods: ['ziina'], label: 'Saudi Arabia', shortLabel: 'KSA' },
  Qatar:    { zone: 'GCC', countryCodes: ['QA'], currency: 'QAR', symbol: 'QAR', bookWas: 199, bookNow: 169, deliveryFee: 30, methods: ['ziina'], label: 'Qatar', shortLabel: 'Qatar' },
  Kuwait:   { zone: 'GCC', countryCodes: ['KW'], currency: 'KWD', symbol: 'KWD', bookWas: 16.75, bookNow: 14.25, deliveryFee: 2.52, methods: ['ziina'], label: 'Kuwait', shortLabel: 'Kuwait' },
  Bahrain:  { zone: 'GCC', countryCodes: ['BH'], currency: 'BHD', symbol: 'BHD', bookWas: 20.5, bookNow: 17.25, deliveryFee: 3.07, methods: ['ziina'], label: 'Bahrain', shortLabel: 'Bahrain' },
  Oman:     { zone: 'GCC', countryCodes: ['OM'], currency: 'OMR', symbol: 'OMR', bookWas: 21, bookNow: 17.75, deliveryFee: 3.12, methods: ['ziina'], label: 'Oman', shortLabel: 'Oman' }
};
// GCC-only launch: visitors outside the GCC default to UAE (AED) pricing.

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
