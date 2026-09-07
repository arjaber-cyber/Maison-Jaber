/* Hikaya by Maison Jaber — shared region & pricing system.
   Include with: <script src="/region.js" defer></script>
   Provides a "zone" pill (next to the language pill) letting visitors pick
   Europe / GCC / Syria, auto-detects via IP by default, and exposes helpers
   any page can use to show the right currency and price.

   Pricing is FIXED here (not a live FX feed) — update it every month or so
   as needed. This is the single source of truth; checkout.html and every
   other page should read prices from here rather than hardcoding their own.
*/

window.HIKAYA_REGIONS = {
  Germany:  { zone: 'EU',  countryCodes: ['DE','AT','FR','NL','BE','IT','ES','PT','PL','SE','DK','FI','IE','LU','CH'], currency: 'EUR', symbol: '€', bookWas: 44.90, bookNow: 34.90, deliveryFee: 4.90, methods: ['card'], label: 'Germany & Europe', shortLabel: 'Europe' },
  Syria:    { zone: 'SY',  countryCodes: ['SY'], currency: 'USD', symbol: '$', bookWas: 19.90, bookNow: 19.90, deliveryFee: 4, methods: ['card', 'shamcash', 'cod'], label: 'Syria', shortLabel: 'Syria' },
  UAE:      { zone: 'GCC', countryCodes: ['AE'], currency: 'AED', symbol: 'AED', bookWas: 199, bookNow: 149, deliveryFee: 25, methods: ['card'], label: 'United Arab Emirates', shortLabel: 'UAE' },
  Saudi:    { zone: 'GCC', countryCodes: ['SA'], currency: 'SAR', symbol: 'SAR', bookWas: 199, bookNow: 149, deliveryFee: 25, methods: ['card'], label: 'Saudi Arabia', shortLabel: 'KSA' },
  Qatar:    { zone: 'GCC', countryCodes: ['QA'], currency: 'QAR', symbol: 'QAR', bookWas: 199, bookNow: 149, deliveryFee: 25, methods: ['card'], label: 'Qatar', shortLabel: 'Qatar' },
  Kuwait:   { zone: 'GCC', countryCodes: ['KW'], currency: 'KWD', symbol: 'KWD', bookWas: 16.75, bookNow: 12.5, deliveryFee: 2.1, methods: ['card'], label: 'Kuwait', shortLabel: 'Kuwait' },
  Bahrain:  { zone: 'GCC', countryCodes: ['BH'], currency: 'BHD', symbol: 'BHD', bookWas: 20.5, bookNow: 15.25, deliveryFee: 2.6, methods: ['card'], label: 'Bahrain', shortLabel: 'Bahrain' },
  Oman:     { zone: 'GCC', countryCodes: ['OM'], currency: 'OMR', symbol: 'OMR', bookWas: 21, bookNow: 15.5, deliveryFee: 2.6, methods: ['card'], label: 'Oman', shortLabel: 'Oman' },
  Other:    { zone: 'OTHER', countryCodes: [], currency: 'USD', symbol: '$', bookWas: 44, bookNow: 34, deliveryFee: null, methods: ['contact'], label: 'Other', shortLabel: 'Other' }
};

// Default region shown for each zone when we haven't (or can't) resolve a
// specific country — e.g. visitor picks "GCC" manually with no IP match.

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
    return 'Other';
  }

  function currentRegionKey() {
    return getStoredRegionKey() || 'Germany';
  }
  function currentRegion() {
    return window.HIKAYA_REGIONS[currentRegionKey()];
  }
  function currentZone() {
    return currentRegion().zone;
  }

  function fmtPrice(amount, region) {
    region = region || currentRegion();
    return region.symbol.length > 1 ? `${amount.toFixed(2)} ${region.symbol}` : `${region.symbol}${amount.toFixed(2)}`;
  }

  // Returns an HTML snippet: struck-through "was" price + bold "now" price,
  // or just the price alone if there's no discount for this region.
  function priceHtml(region) {
    region = region || currentRegion();
    if (region.bookWas > region.bookNow) {
      return `<span style="text-decoration:line-through; opacity:0.55; margin-right:6px;">${fmtPrice(region.bookWas, region)}</span><strong>${fmtPrice(region.bookNow, region)}</strong>`;
    }
    return `<strong>${fmtPrice(region.bookNow, region)}</strong>`;
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
      // No network / blocked — default (Germany/EUR) stays in place.
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

  // Grouped so the list reads like "Europe: Germany" / "GCC: UAE, Saudi..."
  // rather than one flat alphabetical list.
  const ZONE_GROUPS = [
    { zone: 'EU', label: 'Europe', regions: ['Germany'] },
    { zone: 'GCC', label: 'GCC', regions: ['UAE', 'Saudi', 'Qatar', 'Kuwait', 'Bahrain', 'Oman'] },
    { zone: 'SY', label: 'Syria', regions: ['Syria'] },
    { zone: 'OTHER', label: 'Other', regions: ['Other'] },
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

  window.hikayaRegion = currentRegion;
  window.hikayaRegionKey = currentRegionKey;
  window.hikayaZone = currentZone;
  window.hikayaFormatPrice = fmtPrice;
  window.hikayaPriceHtml = priceHtml;
  window.hikayaApplyRegion = applyToPage;

  document.addEventListener('DOMContentLoaded', () => {
    buildSwitcher();
    detectAndApplyRegion();
    applyToPage();
  });
})();
